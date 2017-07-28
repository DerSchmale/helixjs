import * as HX from "helix";

/**
 * GLTFData contains all the info loaded
 * @constructor
 */
function GLTFData()
{
    /**
     * The default scene to show first, as defined by GLTF.
     */
    this.defaultScene = new HX.Scene();

    /**
     * The loaded scenes.
     */
    this.scenes = {};

    /**
     * The loaded materials.
     */
    this.materials = {};

    /**
     * The loaded models (these are "meshes" in GLTF).
     */
    this.models = {};

    /**
     * The loaded model instances (these are "nodes" containing a "mesh" in GLTF).
     */
    this.modelInstances = {};

    /**
     * The animations. Skinned animations cannot be parsed as SkeletonAnimation, since GLTF has no concept of animation
     * groups.
     */
    this.animations = {};
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

    this._invertZ = new HX.Matrix4x4();
    // this._invertZ.fromScale(1, 1, -1);
    // this._flipZ = -1;
    this._flipZ = 1;
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

    if (data.hasOwnProperty("animations"))
        this._parseAnimations(data);

    this._notifyComplete();
};

GLTF.prototype._getAccessor = function(index, data)
{
    var accessorDef = data.accessors[index];

    var bufferView = this._getBufferView(data, accessorDef.bufferView);
    var f = {
        dataType: accessorDef.componentType,
        numComponents: this._numComponentLookUp[accessorDef.type],
        type: accessorDef.type,
        data: bufferView.data,
        min: accessorDef.min,
        max: accessorDef.max,
        byteOffset: bufferView.byteOffset + (accessorDef.byteOffset || 0),
        dataType: accessorDef.componentType,
        count: accessorDef.count
    };

    return f;
};

GLTF.prototype._getBufferView = function(data, index)
{
    var bufferView = data.bufferViews[index];
    var buffer = this._buffers[bufferView.buffer];
    var byteOffset = buffer.byteOffset + (bufferView.byteOffset || 0);

    // HX.Debug.assert(byteOffset + bufferView.byteLength < buffer.byteOffset + buffer.byteLength, "bufferView out of bounds of buffer!");

    return {
        data: this._assetLibrary.get(buffer.assetID),
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
        mat.roughnessRange = -.5;

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
                mat.occlusionMap = this._assetLibrary.get("hx_image_" + matDef.occlusionTexture.index);
            }

            if (pbr.hasOwnProperty("baseColorFactor")) {
                var color = new HX.Color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2], pbr.baseColorFactor[3]);
                // BasicMaterial expects gamma values
                mat.color = color.linearToGamma();
            }

            if (pbr.hasOwnProperty("metallicFactor")) {
                mat.metallicness = pbr.metallicFactor;
            }
            else
                mat.metallicness = 1.0;

            if (pbr.hasOwnProperty("roughnessFactor")) {
                mat.roughnessRange = mat.roughness = pbr.roughnessFactor * .5;
            }
            else
                mat.roughness = .5;

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
        this._modelInstances[i] = modelInstance;
        this._target.models[model.name] = model;
    }
};


GLTF.prototype._readVertexDataVec4 = function(target, offset, accessor, stride, flipZ)
{
    var p = offset;
    var o = accessor.byteOffset;
    var len = accessor.count;
    var src = accessor.data;
    var readFnc;
    var elmSize;

    if (accessor.dataType === HX.DataType.FLOAT) {
        readFnc = src.getFloat32;
        elmSize = 4;
    }
    else if (accessor.dataType === HX.DataType.UNSIGNED_SHORT) {
        readFnc = src.getUint16;
        elmSize = 2;
    }
    else if (accessor.dataType === HX.DataType.UNSIGNED_INT) {
        readFnc = src.getUint32;
        elmSize = 4;
    }

    for (var i = 0; i < len; ++i) {
        target[p] = readFnc.call(src, o, true);
        target[p + 1] = readFnc.call(src, o + elmSize, true);
        target[p + 3] = flipZ * readFnc.call(src, o + elmSize * 2, true);
        target[p + 4] = readFnc.call(src, o + elmSize * 3, true);
        o += elmSize * 4;
        p += stride;
    }
};

GLTF.prototype._readVertexDataVec3 = function(target, offset, accessor, stride)
{
    var p = offset;
    var o = accessor.byteOffset;
    var len = accessor.count;
    var src = accessor.data;

    for (var i = 0; i < len; ++i) {
        target[p] = src.getFloat32(o, true);
        target[p + 1] = src.getFloat32(o + 4, true);
        target[p + 2] = -src.getFloat32(o + 8, true);
        o += 12;

        p += stride;
    }
};

GLTF.prototype._readUVData = function(target, offset, accessor, stride)
{
    var p = offset;
    var o = accessor.byteOffset;
    var len = accessor.count;
    var src = accessor.data;

    for (var i = 0; i < len; ++i) {
        target[p] = src.getFloat32(o, true);
        target[p + 1] = 1.0 - src.getFloat32(o + 4, true);

        o += 8;
        p += stride;
    }
};

GLTF.prototype._readIndices = function(accessor)
{
    var o = accessor.byteOffset;
    var src = accessor.data;
    var len = accessor.count;
    var readFnc;
    var collType;
    var elmSize;

    if (accessor.dataType === HX.DataType.UNSIGNED_SHORT) {
        collType = Uint16Array;
        readFnc = src.getUint16;
        elmSize = 2;
    }
    else if (accessor.dataType === HX.DataType.UNSIGNED_INT) {
        collType = Uint32Array;
        readFnc = src.getUint32;
        elmSize = 4;
    }

    var indexData = new collType(len);
    for (var i = 0; i < len; ++i) {
        indexData[i] = readFnc.call(src, o, true);
        o += elmSize;
    }
    return indexData;
};


GLTF.prototype._parsePrimitive = function(primDef, data, model, materials)
{
    var mesh = HX.Mesh.createDefaultEmpty();
    var attribs = primDef.attributes;
    var positionAcc = this._getAccessor(attribs.POSITION, data);
    var normalAcc = attribs.NORMAL !== undefined? this._getAccessor(attribs.NORMAL, data) : null;
    var tangentAcc = attribs.TANGENT !== undefined? this._getAccessor(attribs.TANGENT, data) : null;
    var texCoordAcc = attribs.TEXCOORD_0 !== undefined? this._getAccessor(attribs.TEXCOORD_0, data) : null;
    var jointIndexAcc = attribs.JOINTS_0 !== undefined? this._getAccessor(attribs.JOINTS_0, data) : null;
    var jointWeightsAcc = attribs.WEIGHTS_0 !== undefined? this._getAccessor(attribs.WEIGHTS_0, data) : null

    var normalGenMode = 0;

    var stride = mesh.getVertexStride(0);
    var vertexData = new Float32Array(positionAcc.count * stride);

    this._readVertexDataVec3(vertexData, 0, positionAcc, stride);

    if (normalAcc)
        this._readVertexDataVec3(vertexData, 3, normalAcc, stride);
    else
        normalGenMode = HX.NormalTangentGenerator.MODE_NORMALS;

    if (tangentAcc)
        this._readVertexDataVec4(vertexData, 6, tangentAcc, stride, this._flipZ);
    else if (texCoordAcc)
        normalGenMode = normalGenMode | HX.NormalTangentGenerator.MODE_TANGENTS;

    if (texCoordAcc)
        this._readUVData(vertexData, 10, texCoordAcc, stride);

    mesh.setVertexData(vertexData, 0);

    var indexAcc = this._getAccessor(primDef.indices, data);
    mesh.setIndexData(this._readIndices(indexAcc));

    if (normalGenMode) {
        var normalGen = new HX.NormalTangentGenerator();
        normalGen.generate(mesh, normalGenMode);
    }

    if (jointIndexAcc) {
        mesh.addVertexAttribute("hx_jointIndices", 4, 1);
        mesh.addVertexAttribute("hx_jointWeights", 4, 1);
        stride = mesh.getVertexStride(1);

        var jointData = new Float32Array(jointIndexAcc.count * stride);
        this._readVertexDataVec4(jointData, 0, jointIndexAcc, stride, 1);
        this._readVertexDataVec4(jointData, 4, jointWeightsAcc, stride, 1);
        mesh.setVertexData(jointData, 1);
    }

    model.addMesh(mesh);
    materials.push(this._materials[primDef.material]);
};

GLTF.prototype._parseSkin = function(data, nodeDef, target)
{
    var skinIndex = nodeDef.skin;
    var skinDef = data.skins[skinIndex];

    var invBinAcc = this._getAccessor(skinDef.inverseBindMatrices, data);

    var src = invBinAcc.data;
    var o = invBinAcc.byteOffset;

    var skeleton = new HX.Skeleton();
    var pose = new HX.SkeletonPose();
    var matrix = new HX.Matrix4x4();

    var skelNode = this._nodes[skinDef.skeleton];
    var worldMatrix = new HX.Matrix4x4();
    if (skelNode.parent)
        worldMatrix.copyFrom(skelNode.parent.worldMatrix);

    for (var i = 0; i < skinDef.joints.length; ++i) {
        var nodeIndex = skinDef.joints[i];
        var joint = new HX.SkeletonJoint();

        joint.inverseBindPose = new HX.Matrix4x4();

        for (var j = 0; j < 16; ++j) {
            joint.inverseBindPose._m[j] = src.getFloat32(o, true);
            o += 4;
        }

        joint.inverseBindPose.prepend(this._invertZ);
        joint.inverseBindPose.append(this._invertZ);


        // https://www.khronos.org/files/gltf20-reference-guide.pdf

        // god knows what space the inverse bind pose is expressed in...
        // global?
        // The reference tells to undo the transforms of the parent *mesh/skin owner*, that is a different node than
        // the skeleton node. So which defines global?

        // in the test file, both skeleton node and model node are owned by the same parent, without a transform on the
        // model node, so it would remain the same

        // the ref says:
        // inverse(globalTransform) * globalJointTransform[j] * inverseBindMatrix[j];
        // (inverse(globalTransform) * globalJointTransform[j]) is equivalent to our own "global" joint pose, so we'd
        // expect inverseBindMatrix to be correct as is?

        // if inverseBindPose is global:
        // inverseBindPose = localToJointSpace * worldToLocal
        // we just want: localToJointSpace = localToJointSpace * (worldToLocal * localToWorld) = inverseBindPose * localToWorld
        // but it's incorrect -_-

        // joint.inverseBindPose.prepend(skelNode.parent.worldMatrix);

        skeleton.addJoint(joint);

        var node = this._nodes[nodeIndex];
        node._jointIndex = i;
        node._skeletonPose = pose;

        matrix.copyFrom(node.matrix);

        var jointPose = new HX.SkeletonJointPose();
        matrix.decompose(jointPose);

        pose.setJointPose(i, jointPose);
    }

    for (i = 0; i < skinDef.joints.length; ++i) {
        var nodeIndex = skinDef.joints[i];
        var node = this._nodes[nodeIndex];
        var joint = skeleton.getJoint(i);
        joint.parentIndex = node !== skelNode && node.parent? node.parent._jointIndex : -1;
    }

    target.model.skeleton = skeleton;
    target.skeletonPose = pose;
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
            // if the node has a specific name, use that.
            // otherwise (for model instances possible), use the model name, or assign a unique one
            node.name = nodeDef.name || node.model.name || ("node_" + i);
            this._target.modelInstances[node.name] = node;
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

        if (nodeDef.hasOwnProperty("matrix")) {
            node.matrix = new HX.Matrix4x4(nodeDef.matrix);
        }

        var matrix = node.matrix;
        node.matrix.prepend(this._invertZ);
        node.matrix.append(this._invertZ);
        node.matrix = matrix;

        this._nodes[i] = node;
    }

    for (i = 0; i < data.nodes.length; ++i) {
        nodeDef = data.nodes[i];
        node = this._nodes[i];
        if (nodeDef.hasOwnProperty("children")) {
            for (var j = 0; j < nodeDef.children.length; ++j) {
                var childIndex = nodeDef.children[j];
                node.attach(this._nodes[childIndex], data.meshes[nodeDef.mesh]);
            }
        }
    }

    for (i = 0; i < data.nodes.length; ++i) {
        nodeDef = data.nodes[i];
        node = this._nodes[i];
        if (nodeDef.hasOwnProperty("skin"))
            this._parseSkin(data, nodeDef, node);
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

GLTF.prototype._parseSampler = function(data, samplerDef, flipZ)
{
    var timesAcc = this._getAccessor(samplerDef.input, data);
    var valuesAcc = this._getAccessor(samplerDef.output, data);
    var timeSrc = timesAcc.data;
    var valueSrc = valuesAcc.data;
    var t = timesAcc.byteOffset;
    var v = valuesAcc.byteOffset;
    var matrix = new HX.Matrix4x4();
    var clip = new HX.AnimationClip();

    for (var k = 0; k < timesAcc.count; ++k) {
        var value;

        switch(valuesAcc.numComponents) {
            // TODO: Might become a scalar for morph weights
            case 3:
                value = new HX.Float4();
                value.x = valueSrc.getFloat32(v, true);
                value.y = valueSrc.getFloat32(v + 4, true);
                value.z = valueSrc.getFloat32(v + 8, true) * (flipZ? this._flipZ : 1);
                break;
            case 4:
                value = new HX.Quaternion();
                value.x = valueSrc.getFloat32(v, true);
                value.y = valueSrc.getFloat32(v + 4, true);
                value.z = valueSrc.getFloat32(v + 8, true);
                value.w = valueSrc.getFloat32(v + 12, true);
                // I wonder if there's an easier way:
                matrix.fromQuaternion(value);
                matrix.prepend(this._invertZ);
                matrix.append(this._invertZ);
                value.fromMatrix(matrix);
                break;
        }

        var keyFrame = new HX.KeyFrame(timeSrc.getFloat32(t, true) * 1000.0, value);
        clip.addKeyFrame(keyFrame);

        v += valuesAcc.numComponents * 4;
        t += 4;
    }

    return clip;
};

GLTF.prototype._parseAnimations = function(data)
{
    for (var i = 0; i < data.animations.length; ++i) {
        var animDef = data.animations[i];
        var animation = new HX.LayeredAnimation();

        animation.name = animDef.name || "animation_" + i;
        this._target.animations[animation.name] = animation;

        for (var j = 0; j < animDef.channels.length; ++j) {
            var channelDef = animDef.channels[j];
            var target = this._nodes[channelDef.target.node];
            var layer;

            if (target._jointIndex !== undefined)
                target = target._skeletonPose._jointPoses[target._jointIndex];

            switch (channelDef.target.path) {
                case "translation":
                    var clip = this._parseSampler(data, animDef.samplers[channelDef.sampler], true);
                    layer = new HX.AnimationLayerFloat4(target, "position", clip);
                    break;
                case "rotation":
                    var clip = this._parseSampler(data, animDef.samplers[channelDef.sampler]);
                    layer = new HX.AnimationLayerQuat(target, "rotation", clip);
                    break;
                case "scale":
                    var clip = this._parseSampler(data, animDef.samplers[channelDef.sampler], false);
                    layer = new HX.AnimationLayerFloat4(target, "scale", clip);
                    break;
                default:
                    throw new Error("Unknown channel path!");
            }

            animation.addLayer(layer);
        }

        animation.play();
    }
};

export {GLTF, GLTFData};