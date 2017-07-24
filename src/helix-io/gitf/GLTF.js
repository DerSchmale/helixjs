import * as HX from "helix";

/**
 * GLTFData contains all the info loaded
 * @constructor
 */
function GLTFData()
{
    this.defaultScene = new HX.Scene();

    // stored by name
    this.scenes = {};
    this.materials = {};
    this.models = {};
    this.modelInstances = {};
}

/**
 * GLTF is an importer for glTF files. When loading, GLTF will immediately return a GLTFAsset containing the default
 * scene (empty scene if not specified in the glTF file), and will populate this object as it's being loaded.
 *
 * @constructor
 *
 * @see {@link https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#introduction}
 */
function GLTF()
{
    // not sure if we're importing a scene?
    HX.Importer.call(this, GLTFData);

    this._numComponentLookUp = {
        SCALAR: 1,
        VEC2: 2,
        VEC3: 3,
        VEC4: 4
    };
}

GLTF.prototype = Object.create(HX.Importer.prototype);

GLTF.prototype.parse = function(file, target)
{
    var data = JSON.parse(file);
    var asset = data.asset;

    this._target = target;

    if (asset.hasOwnProperty("minVersion")){
        var minVersion = asset.minVersion.split(".");
        // TODO: check minVersion support
    }

    if (asset.hasOwnProperty("version")) {
        var version = asset.version.split(".");
        if (version[0] !== "2")
            throw new Error("Unsupported glTF version!");
    }

    // TODO: all loaded objects will need to be registered in the library

    this._assetLibrary = new HX.AssetLibrary();
    this._binFileCheck = {};

    // queue all assets for loading first

    if (data.hasOwnProperty("images"))
        this._parseImages(data.images);

    if (data.hasOwnProperty("buffers"))
        this._parseBuffers(data.buffers);

    this._assetLibrary.onComplete.bind(function() { this._continueParsing(data); }, this);
    this._assetLibrary.onProgress.bind(function(ratio) { this._notifyProgress(ratio); }, this);
    this._assetLibrary.load();
};

GLTF.prototype._continueParsing = function(data)
{
    if (data.hasOwnProperty("materials"))
        this._parseMaterials(data);

    if (data.hasOwnProperty("meshes"))
        this._parseMeshes(data);

    if (data.hasOwnProperty("nodes"))
        this._parseNodes(data);

    var defaultSceneIndex;
    if (data.hasOwnProperty("scene"))
        defaultSceneIndex = data.scene;

    if (data.hasOwnProperty("scenes"))
        this._parseScenes(data, defaultSceneIndex);

    this._notifyComplete();
};

GLTF.prototype._getAccessor = function(index, data)
{
    var accessorDef = data.accessors[index];

    var bufferView = this._getBufferView(data, accessorDef.bufferView);
    var dataStream = bufferView.data;
    var f = {
        dataType: accessorDef.componentType,
        numComponents: this._numComponentLookUp[accessorDef.type],
        data: null,
        min: accessorDef.min,
        max: accessorDef.max
    };

    dataStream.offset = bufferView.byteOffset + (accessorDef.byteOffset || 0);

    switch (accessorDef.componentType) {
        case HX.DataType.FLOAT:
            f.data = dataStream.getFloat32Array(accessorDef.count * f.numComponents);
            break;
        case HX.DataType.UNSIGNED_SHORT:
            f.data = dataStream.getUint16Array(accessorDef.count * f.numComponents);
            break;
        default:
            throw new Error("Unsupported data type!");
    }

    return f;
};

GLTF.prototype._getBufferView = function(data, index)
{
    var bufferView = data.bufferViews[index];
    var buffer = this._buffers[bufferView.buffer];
    var byteOffset = buffer.byteOffset + (bufferView.byteOffset || 0);

    // HX.Debug.assert(byteOffset + bufferView.byteLength < buffer.byteOffset + buffer.byteLength, "bufferView out of bounds of buffer!");

    return {
        data: new HX.DataStream(this._assetLibrary.get(buffer.assetID)),
        byteOffset: byteOffset,
        byteLength: bufferView.byteLength
    };
};

GLTF.prototype._parseImages = function(data)
{
    for (var i = 0; i < data.length; ++i) {
        var image = data[i];
        this._assetLibrary.queueAsset("hx_image_" + i, this._correctURL(image.uri), HX.AssetLibrary.Type.ASSET, HX.JPG);
    }
};

GLTF.prototype._parseBuffers = function(data)
{
    this._buffers = [];
    for (var i = 0; i < data.length; ++i) {
        var buffer = data[i];
        if (!this._binFileCheck[buffer.uri]) {
            var assetID = "hx_bin_" + i;
            this._assetLibrary.queueAsset(assetID, this._correctURL(buffer.uri), HX.AssetLibrary.Type.RAW_BINARY);
            this._binFileCheck[buffer.uri] = true;
            this._buffers[i] = {
                assetID: assetID,
                byteOffset: buffer.byteOffset || 0,
                byteLength: buffer.byteLength
            }
        }
    }
};

GLTF.prototype._parseMaterials = function(data)
{
    this._materials = [];
    for (var i = 0; i < data.materials.length; ++i) {
        var matDef = data.materials[i];
        var mat = new HX.BasicMaterial();
        mat.name = matDef.name;
        mat.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_METALLIC_ROUGHNESS;

        if (matDef.hasOwnProperty("pbrMetallicRoughness")) {
            var pbr = matDef.pbrMetallicRoughness;

            if (pbr.hasOwnProperty("baseColorTexture"))
                mat.colorMap = this._assetLibrary.get("hx_image_" + pbr.baseColorTexture.index);

            if (pbr.hasOwnProperty("metallicRoughnessTexture")) {
                mat.specularMap = this._assetLibrary.get("hx_image_" + pbr.metallicRoughnessTexture.index);
            }

            if (matDef.hasOwnProperty("normalTexture"))
                mat.normalMap = this._assetLibrary.get("hx_image_" + matDef.normalTexture.index);

            if (matDef.hasOwnProperty("emissiveTexture")) {
                mat.emissionMap = this._assetLibrary.get("hx_image_" + matDef.emissiveTexture.index);
                mat.emissiveColor = HX.Color.WHITE;
            }

            if (matDef.hasOwnProperty("occlusionTexture")) {
                // TODO: Implement occlusion map
                mat.occlusionMap = this._assetLibrary.get("hx_image_" + matDef.occlusionTexture.index);
            }

            if (pbr.hasOwnProperty("baseColorFactor")) {
                var color = new HX.Color(matDef.baseColorFactor[0], matDef.baseColorFactor[1], matDef.baseColorFactor[2], matDef.baseColorFactor[3]);
                // BasicMaterial expects gamma values
                mat.color = color.linearToGamma();
            }

            if (pbr.hasOwnProperty("metallicFactor")) {
                mat.metallicness = matDef.metallicFactor;
            }
            else
                mat.metallicness = 1.0;

            if (pbr.hasOwnProperty("roughnessFactor")) {
                mat.roughness = matDef.roughnessFactor;
            }

            if (matDef.hasOwnProperty("emissiveFactor")) {
                var emission = new HX.Color(matDef.emissiveFactor[0], matDef.emissiveFactor[1], matDef.emissiveFactor[2], 1.0);
                // BasicMaterial expects gamma values
                mat.emissiveColor = emission.linearToGamma();
            }

            // TODO: There can also be a texCoord property with the textures, are those texCoord indices?

            // this is too high physically, but determined by the glTF standard?
            // mat.normalSpecularReflectance = 0.04;
        }

        this._materials[i] = mat;
        this._target.materials[mat.name] = mat;
    }
};

GLTF.prototype._parseMeshes = function(data)
{
    // locally stored by index, using gltf nomenclature (actually contains model instances)
    this._modelInstances = [];
    for (var i = 0; i < data.meshes.length; ++i) {
        var meshDef = data.meshes[i];
        var model = new HX.Model();
        var materials = [];
        for (var j = 0; j < meshDef.primitives.length; ++j) {
            this._parsePrimitive(meshDef.primitives[j], data, model, materials);
        }
        model.name = meshDef.name;
        var modelInstance = new HX.ModelInstance(model, materials);
        modelInstance.name = model.name;
        this._modelInstances[i] = modelInstance;
        this._target.models[model.name] = model;
    }
};

GLTF.prototype._parsePrimitive = function(primDef, data, model, materials)
{
    var mesh = new HX.Mesh();
    var attribs = primDef.attributes;
    var positionAcc = this._getAccessor(attribs.POSITION, data);
    var normalAcc = attribs.NORMAL !== undefined? this._getAccessor(attribs.NORMAL, data) : null;
    var tangentAcc = attribs.TANGENT !== undefined? this._getAccessor(attribs.TANGENT, data) : null;
    var texCoordAcc = attribs.TEXCOORD_0 !== undefined? this._getAccessor(attribs.TEXCOORD_0, data) : null;
    var i;
    var normalGenMode = 0;

    // TODO: Could interlace the data instead
    // Could remove getAccessor function and replace it with populateData(targetFloat32Array, data.accessors[i])

    mesh.addVertexAttribute("hx_position", 3, 0);

    if (!positionAcc.flipped) {
        var posData = positionAcc.data;
        for (i = 2; i < posData.length; i += 3) {
            posData[i] *= -1;
        }
        positionAcc.flipped = true;
    }

    mesh.setVertexData(positionAcc.data, 0);



    mesh.addVertexAttribute("hx_normal", 3, 1);
    if (normalAcc) {
        if (!normalAcc.flipped) {
            var normData = normalAcc.data;
            for (i = 2; i < normData.length; i += 3) {
                normData[i] *= -1;
            }
            normalAcc.flipped = true;
        }

        mesh.setVertexData(normalAcc.data, 1);
    }
    else
        normalGenMode = HX.NormalTangentGenerator.MODE_NORMALS;

    if (texCoordAcc) {
        // cannot generate tangents without tex coords
        mesh.addVertexAttribute("hx_tangent", 4, 2);
        mesh.addVertexAttribute("hx_texCoord", 2, 3);

        if (!texCoordAcc.flipped) {
            var texData = texCoordAcc.data;
            for (i = 1; i < texData.length; i += 2) {
                texData[i] *= -1.0;
            }
            texCoordAcc.flipped = true;
        }

        mesh.setVertexData(texCoordAcc.data, 3);
    }

    if (tangentAcc) {
        // counter right-handedness
        if (!tangentAcc.flipped) {
            var tanData = tangentAcc.data;
            for (i = 0; i < tanData.length; i += 4) {
                tanData[i] *= 1;
                tanData[i + 1] *= 1;
                tanData[i + 2] *= -1;
                tanData[i + 3] *= 1;
            }

            tangentAcc.flipped = true;
        }

        mesh.setVertexData(tangentAcc.data, 2);
    }
    else if (texCoordAcc)
        normalGenMode = HX.NormalTangentGenerator.MODE_TANGENTS;

    var indexAcc = this._getAccessor(primDef.indices, data);
    mesh.setIndexData(indexAcc.data);

    if (normalGenMode) {
        var normalGen = new HX.NormalTangentGenerator();
        normalGen.generate(mesh, normalGenMode);
    }

    model.addMesh(mesh);
    materials.push(this._materials[primDef.material]);
};

GLTF.prototype._parseNodes = function(data)
{
    this._nodes = [];

    for (var i = 0; i < data.nodes.length; ++i) {
        var nodeDef = data.nodes[i];
        var node;
        if (nodeDef.hasOwnProperty("mesh")) {
            node = this._modelInstances[nodeDef.mesh];
            this._target.modelInstances[nodeDef.name] = node;
        }
        else {
            node = new HX.SceneNode();
            // TODO: parse these
        }
        node.name = nodeDef.name;
        this._nodes[i] = node;
    }
};

GLTF.prototype._parseScenes = function(data, defaultIndex)
{
    for (var i = 0; i < data.scenes.length; ++i) {
        var scene;
        if (i === defaultIndex)
            scene = this._target.defaultScene;
        else {
            scene = new HX.Scene();
            this._target.scenes.push(scene);
        }

        var sceneDef = data.scenes[i];
        for (var j = 0; j < sceneDef.nodes.length; ++j) {
            var nodeIndex = sceneDef.nodes[j];
            scene.attach(this._nodes[nodeIndex]);
        }
    }
};

export {GLTF, GLTFData};