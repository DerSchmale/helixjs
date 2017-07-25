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
        VEC4: 4,
        MAT4: 16
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



GLTF.prototype._addJoints = function(skeleton, node, parentIndex, matrices, nodeIndexToJointIndexMap)
{
    var joint = new HX.SkeletonJoint();
    var jointIndex = skeleton.numJoints;
    joint.parentIndex = parentIndex;
    matrices.push(node.worldMatrix);
    skeleton.addJoint(joint);

    nodeIndexToJointIndexMap[this._nodes.indexOf(node)] = jointIndex;

    for (var i = 0; i < node.numChildren; ++i)
        this._addJoints(skeleton, node.getChild(i), jointIndex, matrices, nodeIndexToJointIndexMap);
};

GLTF.prototype._parseSkeleton = function(index)
{
    var skeleton = new HX.Skeleton();
    var matrices = [];
    var indexMap = [];

    // passes in the default pose as well
    this._addJoints(skeleton, this._nodes[index], -1, matrices, indexMap);

    // TODO: loop through matrices and transform to local pose

    var skeletonPose = new HX.SkeletonPose();
    var mat = new HX.Matrix4x4();
    for (var i = 0; i < skeleton.numJoints; ++i) {
        var joint = skeleton.getJoint(i);
        var parentIndex = joint.parentIndex;

        if (parentIndex !== -1) {
            mat.inverseOf(matrices[parentIndex]);
            mat.prepend(matrices[i]);
            var jointPose = new HX.SkeletonJointPose();
            mat.decompose(jointPose);
            skeletonPose.push(jointPose);
        }
    }

    return { skeleton: skeleton, pose: skeletonPose, indexMap: indexMap };
};

GLTF.prototype._parseSkin = function(data, skinIndex, target)
{
    var skinDef = data.skins[skinIndex];

    var skinData = this._parseSkeleton(skinDef.skeleton);

    // indexMap contains [node index -> Helix joint index]
    var newIndexMap = [];

    var inv = this._getAccessor(skinDef.inverseBindMatrices, data).data;

    var m = 0;
    // convert to: [gltf joint index -> helix joint index]
    for (var i = 0; i < skinDef.joints.length; ++i) {
        var nodeIndex = skinDef.joints[i];
        var jointIndex = skinData.indexMap[nodeIndex];
        var joint = skinData.skeleton.getJoint(i);
        joint.inverseBindPose = new HX.Matrix4x4(
            inv[m], inv[m + 4], inv[m + 8], inv[m + 12],
            inv[m + 1], inv[m + 5], inv[m + 9], inv[m + 13],
            inv[m + 2], inv[m + 6], inv[m + 10], inv[m + 14],
            inv[m + 3], inv[m + 7], inv[m + 11], inv[m + 15]
        );
        newIndexMap[i] = jointIndex;
        m += 16;
    }

    skinData.indexMap = newIndexMap;

    target.model.skeleton = skeleton;
    target.skeletonPose = skinData.pose;

    this._addJointBindings(data, target, data.meshes[nodeDef.mesh], skinData);
};

GLTF.prototype._addJointBindings = function(data, modelInstance, meshDef, skinData)
{
    for (var i = 0; i < meshDef.primitives.length; ++i) {
        var primDef = meshDef.primitives[i];
        var attribs = primDef.attributes;
        var indexData = this._getAccessor(attribs.JOINTS_0, data);
        var weightsData = this._getAccessor(attribs.WEIGHTS_0, data);
        var meshInstance = modelInstance.getMeshInstance(i);
        var mesh = meshInstance.mesh;

        var weightStream = mesh.numStreams;
        data.addVertexAttribute("hx_jointWeights", 4, weightStream);
        data.setVertexData(weightsData.data, weightStream);

        var indexStream = mesh.numStreams;
        data.addVertexAttribute("hx_jointIndices", 4, indexStream);

        var newIndexData = new Float32Array();
        // map glTF joint array indices to the real skeleton indices
        var map = skinData.indexMap;
        for (var j = 0; j < indexData.length; ++j) {
            newIndexData[j] = map[indexData[j]];
        }

        data.setVertexData(weightsData.data, indexStream);

    }
};

GLTF.prototype._parseNodes = function(data)
{
    this._nodes = [];

    // these may also be skeleton joints, will be determined when parsing skeleton
    for (var i = 0; i < data.nodes.length; ++i) {
        var nodeDef = data.nodes[i];
        var node;
        if (nodeDef.hasOwnProperty("mesh")) {
            node = this._modelInstances[nodeDef.mesh];

            // disabled for now (untested)
            // if (nodeDef.hasOwnProperty("skin"))
            //     this._parseSkin(data, nodeDef.skin, node);

            this._target.modelInstances[nodeDef.name] = node;
        }
        else {
            node = new HX.SceneNode();
        }

        if (nodeDef.hasOwnProperty("rotation"))
            node.rotation.set(nodeDef.rotation[0], nodeDef.rotation[1], nodeDef.rotation[2], nodeDef.rotation[3]);

        if (nodeDef.hasOwnProperty("translation"))
            node.position.set(nodeDef.translation[0], nodeDef.translation[1], nodeDef.translation[2], 1.0);

        if (nodeDef.hasOwnProperty("scale"))
            node.scale.set(nodeDef.scale[0], nodeDef.scale[1], nodeDef.scale[2], 1.0);

        if (nodeDef.hasOwnProperty("matrix"))
            node.matrix.set(nodeDef.matrix);

        node.name = nodeDef.name;
        this._nodes[i] = node;
    }

    for (i = 0; i < data.nodes.length; ++i) {
        nodeDef = data.nodes[i];
        node = this._nodes[i];
        if (nodeDef.hasOwnProperty("children")) {
            for (var j = 0; j < data.nodes.length; ++j) {
                node.attach(nodeDef);
            }
        }
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