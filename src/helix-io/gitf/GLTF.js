import * as HX from "helix";

// https://www.khronos.org/files/gltf20-reference-guide.pdf

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
    this._invertZ.fromScale(1, 1, -1);
}

GLTF.prototype = Object.create(HX.Importer.prototype);

GLTF.prototype.parse = function(file, target)
{
    this._defaultSceneIndex = undefined;
    this._gltf = JSON.parse(file);

    var asset = this._gltf.asset;

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

    this._queueImages();
    this._queueBuffers();

    // load dependencies first
    this._assetLibrary.onComplete.bind(function() { this._continueParsing(); }, this);
    this._assetLibrary.onProgress.bind(function(ratio) { this._notifyProgress(.8 * ratio); }, this);
    this._assetLibrary.load();
};

// todo: add some timeouts
GLTF.prototype._continueParsing = function()
{
    var gltf = this._gltf;

    if (gltf.hasOwnProperty("scene"))
        this._defaultSceneIndex = gltf.scene;

    var queue = new HX.AsyncTaskQueue();
    queue.queue(this._parseMaterials.bind(this));
    queue.queue(this._parseMeshes.bind(this));
    queue.queue(this._parseNodes.bind(this));
    queue.queue(this._parseScenes.bind(this));
    queue.queue(this._parseAnimations.bind(this));
    queue.queue(this._playAnimations.bind(this));
    queue.queue(this._notifyComplete.bind(this), this._target);

    queue.onProgress.bind((function(ratio) {
        this._notifyProgress(.8 + .2 * ratio);
    }).bind(this));

    queue.execute();
};

GLTF.prototype._getAccessor = function(index)
{
    var accessorDef = this._gltf.accessors[index];

    var bufferView = this._getBufferView(accessorDef.bufferView);
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

GLTF.prototype._getBufferView = function(index)
{
    var bufferView = this._gltf.bufferViews[index];
    var buffer = this._buffers[bufferView.buffer];
    var byteOffset = buffer.byteOffset + (bufferView.byteOffset || 0);

    // HX.Debug.assert(byteOffset + bufferView.byteLength < buffer.byteOffset + buffer.byteLength, "bufferView out of bounds of buffer!");

    return {
        data: this._assetLibrary.get(buffer.assetID),
        byteOffset: byteOffset,
        byteLength: bufferView.byteLength
    };
};

GLTF.prototype._queueImages = function()
{
    var imageDefs = this._gltf.images;

    if (!imageDefs) return;

    for (var i = 0; i < imageDefs.length; ++i) {
        var image = imageDefs[i];
        this._assetLibrary.queueAsset("hx_image_" + i, this._correctURL(image.uri), HX.AssetLibrary.Type.ASSET, HX.JPG);
    }
};

GLTF.prototype._queueBuffers = function()
{
    var bufferDefs = this._gltf.buffers;

    if (!bufferDefs) return;

    this._buffers = [];
    for (var i = 0; i < bufferDefs.length; ++i) {
        var buffer = bufferDefs[i];
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

GLTF.prototype._parseMaterials = function()
{
    var materialDefs = this._gltf.materials;

    if (!materialDefs) return;

    this._materials = [];

    for (var i = 0; i < materialDefs.length; ++i) {
        var matDef = materialDefs[i];
        var mat = new HX.BasicMaterial();

        mat.name = matDef.name;
        mat.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_METALLIC_ROUGHNESS;
        mat.normalMap = this._getTexture(matDef.normalTexture);
        mat.occlusionMap = this._getTexture(matDef.occlusionTexture);
        mat.emissionMap = this._getTexture(matDef.emissiveTexture);

        if (matDef.emissiveFactor) {
            var emission = new HX.Color(matDef.emissiveFactor[0], matDef.emissiveFactor[1], matDef.emissiveFactor[2], 1.0);
            mat.emissiveColor = emission.linearToGamma();   // BasicMaterial expects gamma values
        }
        else if (mat.emissionMap)
            mat.emissiveColor = HX.Color.WHITE;

        var pbr = matDef.pbrMetallicRoughness;

        if (pbr) {
            mat.colorMap = this._getTexture(pbr.baseColorTexture);
            mat.specularMap = this._getTexture(pbr.metallicRoughnessTexture);

            if (pbr.baseColorFactor) {
                var color = new HX.Color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2], pbr.baseColorFactor[3]);
                mat.color = color.linearToGamma();  // BasicMaterial expects gamma values
            }

            mat.metallicness = pbr.metallicFactor === undefined ? 1.0 : pbr.metallicFactor;
            mat.roughness = pbr.roughnessFactor === undefined? 1.0 : pbr.roughnessFactor;

            if (mat.specularMap) {
                mat.roughness *= .5;
                mat.roughnessRange = -mat.roughness;
            }

            // TODO: There can also be a texCoord property with the textures, are those texCoord indices?
        }

        this._materials[i] = mat;
        this._target.materials[mat.name] = mat;
    }
};

GLTF.prototype._getTexture = function(textureDef)
{
    return textureDef? this._assetLibrary.get("hx_image_" + textureDef.index) : null;
};

GLTF.prototype._parseMeshes = function()
{
    var meshDefs = this._gltf.meshes;

    if (!meshDefs) return;

    // locally stored by index, using gltf nomenclature (actually contains model instances)
    this._modelInstances = [];
    for (var i = 0; i < meshDefs.length; ++i) {
        var meshDef = meshDefs[i];
        var model = new HX.Model();
        var materials = [];

        for (var j = 0; j < meshDef.primitives.length; ++j)
            this._parsePrimitive(meshDef.primitives[j], model, materials);

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

    var flipSign = flipZ? -1 : 1;

    for (var i = 0; i < len; ++i) {
        target[p] = readFnc.call(src, o, true);
        target[p + 1] = readFnc.call(src, o + elmSize, true);
        target[p + 2] = readFnc.call(src, o + elmSize * 2, true) * flipSign;
        target[p + 3] = readFnc.call(src, o + elmSize * 3, true);
        o += elmSize * 4;
        p += stride;
    }
};

GLTF.prototype._readVertexDataVec3 = function(target, offset, accessor, stride, flipZ)
{
    var p = offset;
    var o = accessor.byteOffset;
    var len = accessor.count;
    var src = accessor.data;

    var flipSign = flipZ? -1 : 1;

    for (var i = 0; i < len; ++i) {
        target[p] = src.getFloat32(o, true);
        target[p + 1] = src.getFloat32(o + 4, true);
        target[p + 2] = src.getFloat32(o + 8, true) * flipSign;
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


GLTF.prototype._parsePrimitive = function(primDef, model, materials)
{
    var mesh = HX.Mesh.createDefaultEmpty();
    var attribs = primDef.attributes;
    var positionAcc = this._getAccessor(attribs.POSITION);
    var normalAcc = attribs.NORMAL !== undefined? this._getAccessor(attribs.NORMAL) : null;
    var tangentAcc = attribs.TANGENT !== undefined? this._getAccessor(attribs.TANGENT) : null;
    var texCoordAcc = attribs.TEXCOORD_0 !== undefined? this._getAccessor(attribs.TEXCOORD_0) : null;
    var jointIndexAcc = attribs.JOINTS_0 !== undefined? this._getAccessor(attribs.JOINTS_0) : null;
    var jointWeightsAcc = attribs.WEIGHTS_0 !== undefined? this._getAccessor(attribs.WEIGHTS_0) : null

    var normalGenMode = 0;

    var stride = mesh.getVertexStride(0);
    var vertexData = new Float32Array(positionAcc.count * stride);

    this._readVertexDataVec3(vertexData, 0, positionAcc, stride, true);

    if (normalAcc)
        this._readVertexDataVec3(vertexData, 3, normalAcc, stride, true);
    else
        normalGenMode = HX.NormalTangentGenerator.MODE_NORMALS;

    if (tangentAcc)
        this._readVertexDataVec4(vertexData, 6, tangentAcc, stride, true);
    else if (texCoordAcc)
        normalGenMode = normalGenMode | HX.NormalTangentGenerator.MODE_TANGENTS;

    if (texCoordAcc)
        this._readUVData(vertexData, 10, texCoordAcc, stride);

    mesh.setVertexData(vertexData, 0);

    var indexAcc = this._getAccessor(primDef.indices);
    mesh.setIndexData(this._readIndices(indexAcc));

    if (normalGenMode) {
        var normalGen = new HX.NormalTangentGenerator();
        normalGen.generate(mesh);
    }

    if (jointIndexAcc) {
        mesh.addVertexAttribute("hx_jointIndices", 4, 1);
        mesh.addVertexAttribute("hx_jointWeights", 4, 1);
        stride = mesh.getVertexStride(1);

        var jointData = new Float32Array(jointIndexAcc.count * stride);
        this._readVertexDataVec4(jointData, 0, jointIndexAcc, stride);
        this._readVertexDataVec4(jointData, 4, jointWeightsAcc, stride);
        mesh.setVertexData(jointData, 1);
    }

    model.addMesh(mesh);
    materials.push(this._materials[primDef.material]);
};

GLTF.prototype._parseSkin = function(nodeDef, target)
{
    var skinIndex = nodeDef.skin;
    var skinDef = this._gltf.skins[skinIndex];

    var invBinAcc = this._getAccessor(skinDef.inverseBindMatrices);

    var src = invBinAcc.data;
    var o = invBinAcc.byteOffset;

    var skeleton = new HX.Skeleton();
    var pose = new HX.SkeletonPose();

    var skelNode = this._nodes[skinDef.skeleton];

    // no need for it to end up in the scene graph
    if (skelNode.parent) skelNode.parent.detach(skelNode);

    for (var i = 0; i < skinDef.joints.length; ++i) {
        var nodeIndex = skinDef.joints[i];
        var joint = new HX.SkeletonJoint();

        joint.inverseBindPose = this._readMatrix4x4(src, o);
        o += 64;

        joint.inverseBindPose.prepend(this._invertZ);
        joint.inverseBindPose.append(this._invertZ);

        skeleton.addJoint(joint);

        var node = this._nodes[nodeIndex];
        if (node._jointIndex !== undefined) {
            throw new Error("Adding one node to multiple skeletons!");
        }
        node._jointIndex = i;
        node._skeletonPose = pose;

        var jointPose = new HX.SkeletonJointPose();
        jointPose.position.copyFrom(node.position);
        jointPose.rotation.copyFrom(node.rotation);
        jointPose.scale.copyFrom(node.scale);
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

// TODO: The whole nodes 6 animation parsing thing is messy. Clean up
GLTF.prototype._parseNodes = function()
{
    var nodeDefs = this._gltf.nodes;

    if (!nodeDefs) return;

    var m = new HX.Matrix4x4();

    this._nodes = [];

    // these may also be skeleton joints, will be determined when parsing skeleton
    for (var i = 0; i < nodeDefs.length; ++i) {
        var nodeDef = nodeDefs[i];
        var node;

        if (nodeDef.hasOwnProperty("mesh")) {
            node = this._modelInstances[nodeDef.mesh];
            // if the node has a specific name, use that.
            // otherwise (for model instances possible), use the model name, or assign a unique one
            node.name = nodeDef.name || node.model.name || ("node_" + i);
            this._target.modelInstances[node.name] = node;
        }
        else
            node = new HX.SceneNode();

        if (nodeDef.rotation) {
            node.rotation.set(nodeDef.rotation[0], nodeDef.rotation[1], nodeDef.rotation[2], nodeDef.rotation[3]);
            m.fromQuaternion(node.rotation);
            m.prepend(this._invertZ);
            m.append(this._invertZ);
            node.rotation.fromMatrix(m);
        }

        if (nodeDef.translation)
            node.position.set(nodeDef.translation[0], nodeDef.translation[1], -nodeDef.translation[2], 1.0);

        if (nodeDef.scale)
            node.scale.set(nodeDef.scale[0], nodeDef.scale[1], nodeDef.scale[2], 1.0);

        if (nodeDef.matrix) {
            node.matrix = new HX.Matrix4x4(nodeDef.matrix);
            node.matrix.prepend(this._invertZ);
            node.matrix.append(this._invertZ);
        }

        this._nodes[i] = node;
    }

    // all parsed, now we can attach them together
    for (i = 0; i < nodeDefs.length; ++i) {
        nodeDef = nodeDefs[i];
        node = this._nodes[i];
        if (nodeDef.children) {
            for (var j = 0; j < nodeDef.children.length; ++j) {
                var childIndex = nodeDef.children[j];
                node.attach(this._nodes[childIndex]);
            }
        }
    }

    for (i = 0; i < nodeDefs.length; ++i) {
        nodeDef = nodeDefs[i];
        node = this._nodes[i];

        if (nodeDef.hasOwnProperty("skin"))
            this._parseSkin(nodeDef, node);
    }
};

GLTF.prototype._parseScenes = function()
{
    var sceneDefs = this._gltf.scenes;

    if (!sceneDefs) return;

    for (var i = 0; i < sceneDefs.length; ++i) {
        var sceneDef = sceneDefs[i];
        var scene;

        // this because a scene was already created for immediate access
        if (i === this._defaultSceneIndex)
            scene = this._target.defaultScene;
        else {
            scene = new HX.Scene();
            this._target.scenes.push(scene);
        }

        var childNodes = sceneDef.nodes;
        for (var j = 0; j < childNodes.length; ++j) {
            var nodeIndex = childNodes[j];
            scene.attach(this._nodes[nodeIndex]);
        }
    }
};

GLTF.prototype._parseAnimationSampler = function(samplerDef, flipZ)
{
    var timesAcc = this._getAccessor(samplerDef.input);
    var valuesAcc = this._getAccessor(samplerDef.output);
    var timeSrc = timesAcc.data;
    var valueSrc = valuesAcc.data;
    var t = timesAcc.byteOffset;
    var v = valuesAcc.byteOffset;
    var clip = new HX.AnimationClip();
    var m = new HX.Matrix4x4();

    for (var k = 0; k < timesAcc.count; ++k) {
        var value;

        switch(valuesAcc.numComponents) {
            // TODO: Might need a scalar for morph weights
            case 3:
                value = this._readFloat3(valueSrc, v);
                if (flipZ) value.z = -value.z;
                break;
            case 4:
                value = this._readQuat(valueSrc, v);
                if (flipZ) {
                    m.fromQuaternion(value);
                    m.prepend(this._invertZ);
                    m.append(this._invertZ);
                    value.fromMatrix(m);
                }
                break;
            default:
                throw new Error("Unsupported animation sampler type");
        }

        var time = this._readFloat(timeSrc, t) * 1000.0;
        var keyFrame = new HX.KeyFrame(time, value);
        clip.addKeyFrame(keyFrame);

        v += valuesAcc.numComponents * 4;
        t += 4;
    }

    return clip;
};


GLTF.prototype._parseAnimations = function()
{
    var animDefs = this._gltf.animations;

    if (!animDefs) return;

    for (var i = 0; i < animDefs.length; ++i) {
        var animDef = animDefs[i];
        var animation = new HX.LayeredAnimation();

        for (var j = 0; j < animDef.channels.length; ++j) {
            var layer = this._parseAnimationChannel(animDef.channels[j], animDef.samplers);
            animation.addLayer(layer);
        }

        animation.name = animDef.name || "animation_" + i;
        this._target.animations[animation.name] = animation;
    }
};

GLTF.prototype._parseAnimationChannel = function(channelDef, samplers)
{
    var target = this._nodes[channelDef.target.node];
    var layer;

    if (target._jointIndex !== undefined)
        target = target._skeletonPose._jointPoses[target._jointIndex];

    switch (channelDef.target.path) {
        case "translation":
            var clip = this._parseAnimationSampler(samplers[channelDef.sampler], true);
            layer = new HX.AnimationLayerFloat4(target, "position", clip);
            break;
        case "rotation":
            var clip = this._parseAnimationSampler(samplers[channelDef.sampler], true);
            layer = new HX.AnimationLayerQuat(target, "rotation", clip);
            break;
        case "scale":
            var clip = this._parseAnimationSampler(samplers[channelDef.sampler], false);
            layer = new HX.AnimationLayerFloat4(target, "scale", clip);
            break;
        default:
            throw new Error("Unknown channel path!");
    }
    return layer;
};

GLTF.prototype._playAnimations = function()
{
    var anims = this._target.animations;
    HX.ArrayUtils.forEach(anims, function(anim) {
        anim.play();
    });
};

GLTF.prototype._readFloat3 = function(dataView, offset)
{
    var f = new HX.Float4();
    f.x = dataView.getFloat32(offset, true);
    f.y = dataView.getFloat32(offset + 4, true);
    f.z = dataView.getFloat32(offset + 8, true);
    return f;
};

GLTF.prototype._readQuat = function(dataView, offset)
{
    var q = new HX.Quaternion();
    q.x = dataView.getFloat32(offset, true);
    q.y = dataView.getFloat32(offset + 4, true);
    q.z = dataView.getFloat32(offset + 8, true);
    q.w = dataView.getFloat32(offset + 12, true);
    return q;
};

GLTF.prototype._readFloat = function(dataView, offset)
{
    return dataView.getFloat32(offset, true);
};

GLTF.prototype._readMatrix4x4 = function(dataView, offset)
{
    var m = [];
    for (var j = 0; j < 16; ++j) {
        m[j] = dataView.getFloat32(offset, true);
        offset += 4;
    }
    return new HX.Matrix4x4(m);
};

export {GLTF, GLTFData};