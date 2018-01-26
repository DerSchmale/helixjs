(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('helix'), require('pako')) :
	typeof define === 'function' && define.amd ? define('HX', ['exports', 'helix', 'pako'], factory) :
	(factory((global.HX = global.HX || {}),global.HX,global.pako));
}(this, (function (exports,HX$1,pako) { 'use strict';

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
    this.defaultScene = new HX$1.Scene();

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
    HX$1.Importer.call(this, GLTFData);

    this._numComponentLookUp = {
        SCALAR: 1,
        VEC2: 2,
        VEC3: 3,
        VEC4: 4,
        MAT4: 16
    };

    this._flipCoord = new HX$1.Matrix4x4();
    this._flipCoord.setColumn(0, new HX$1.Float4(-1, 0, 0, 0));
    this._flipCoord.setColumn(1, new HX$1.Float4(0, 0, 1, 0));
    this._flipCoord.setColumn(2, new HX$1.Float4(0, 1, 0, 0));
}

GLTF.prototype = Object.create(HX$1.Importer.prototype);

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

    this._assetLibrary = new HX$1.AssetLibrary();
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

    var queue = new HX$1.AsyncTaskQueue();
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

    var bufferView;
    if (accessorDef.bufferView !== undefined)
         bufferView = this._getBufferView(accessorDef.bufferView);
    var f = {
        dataType: accessorDef.componentType,
        numComponents: this._numComponentLookUp[accessorDef.type],
        type: accessorDef.type,
        data: bufferView? bufferView.data : null,
        min: accessorDef.min,
        max: accessorDef.max,
        byteOffset: bufferView.byteOffset + (accessorDef.byteOffset || 0),
        dataType: accessorDef.componentType,
        count: accessorDef.count,
        isSparse: false
    };

    if (accessorDef.sparse) {
        f.isSparse = true;
        f.sparseCount = accessorDef.sparse.count;
        f.sparseOffsets = [];

        var indexBufferView = this._getBufferView(accessorDef.sparse.indices.bufferView);
        var valuesBufferView = this._getBufferView(accessorDef.sparse.values.bufferView);

        f.sparseIndices = {
            data: indexBufferView.data,
            byteOffset: accessorDef.sparse.indices.byteOffset,
            dataType: accessorDef.componentType
        };

        f.sparseValues = {
            data: valuesBufferView.data,
            byteOffset: accessorDef.values.indices.byteOffset
        };
    }

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
        this._assetLibrary.queueAsset("hx_image_" + i, this._correctURL(image.uri), HX$1.AssetLibrary.Type.ASSET, HX$1.JPG);
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
            this._assetLibrary.queueAsset(assetID, this._correctURL(buffer.uri), HX$1.AssetLibrary.Type.RAW_BINARY);
            this._binFileCheck[buffer.uri] = true;
            this._buffers[i] = {
                assetID: assetID,
                byteOffset: buffer.byteOffset || 0,
                byteLength: buffer.byteLength
            };
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
        var mat = new HX$1.BasicMaterial();

        mat.name = matDef.name;
        mat.specularMapMode = HX$1.BasicMaterial.SPECULAR_MAP_METALLIC_ROUGHNESS;
        mat.normalMap = this._getTexture(matDef.normalTexture);
        mat.occlusionMap = this._getTexture(matDef.occlusionTexture);
        mat.emissionMap = this._getTexture(matDef.emissiveTexture);

        if (matDef.emissiveFactor) {
            var emission = new HX$1.Color(matDef.emissiveFactor[0], matDef.emissiveFactor[1], matDef.emissiveFactor[2], 1.0);
            mat.emissiveColor = emission.linearToGamma();   // BasicMaterial expects gamma values
        }
        else if (mat.emissionMap)
            mat.emissiveColor = HX$1.Color.WHITE;

        var pbr = matDef.pbrMetallicRoughness;

        if (pbr) {
            mat.colorMap = this._getTexture(pbr.baseColorTexture);
            mat.specularMap = this._getTexture(pbr.metallicRoughnessTexture);

            if (pbr.baseColorFactor) {
                var color = new HX$1.Color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2], pbr.baseColorFactor[3]);
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
        var model = new HX$1.Model();
        var materials = [];
        var targets = null;
        var numTargets = 0;
        var hasMorphNormals = false;

        for (var j = 0; j < meshDef.primitives.length; ++j) {
            var primDef = meshDef.primitives[j];

            // a bit messy, eh?
            if (primDef.targets) {
                numTargets = primDef.targets.length;
                targets = [];
                for (var k = 0; k < numTargets; ++k) {
                    targets[k] = new HX$1.MorphTarget();
                    targets[k].name = "morphTarget_" + k;
                }

                if (primDef.targets[0].NORMAL) {
                    hasMorphNormals = true;
                }
                break;
            }
        }

        for (j = 0; j < meshDef.primitives.length; ++j) {
            primDef = meshDef.primitives[j];
            this._parsePrimitive(primDef, model, materials, numTargets > 0, hasMorphNormals);

            if (primDef.targets)
                this._parseMorphTargets(primDef.targets, j, targets);
        }

        model.name = meshDef.name;

        var modelInstance = new HX$1.ModelInstance(model, materials);

        if (numTargets > 0) {
            var morphComponent = new HX$1.MorphAnimation(targets);

            if (meshDef.weights) {
                for (j = 0; j < numTargets; ++j) {
                    morphComponent.setWeight("morphTarget_" + j, meshDef.weights[j]);
                }
            }

            modelInstance.addComponent(morphComponent);
        }

        this._modelInstances[i] = modelInstance;
        this._target.models[model.name] = model;
    }
};

GLTF.prototype._parseMorphTargets = function(targetDefs, meshIndex, targets)
{
    for (var i = 0; i < targetDefs.length; ++i) {
        var attribs = targetDefs[i];
        var morphTarget = targets[i];
        var positionAcc = this._getAccessor(attribs.POSITION);
        var normalAcc = attribs.NORMAL !== undefined? this._getAccessor(attribs.NORMAL) : null;

        // tangent morphing not supported in Helix!
        // var tangentAcc = attribs.TANGENT !== undefined? this._getAccessor(attribs.TANGENT) : null;

        var positionData = new Float32Array(positionAcc.count * 3);
        this._readVertexData(positionData, 0, positionAcc, 3, 3, true);

        if (normalAcc) {
            var normalData = new Float32Array(normalAcc.count * 3);
            this._readVertexData(normalData, 0, normalAcc, 3, 3, true);
        }

        morphTarget.init(meshIndex, positionData, normalData);
    }
};


GLTF.prototype._parsePrimitive = function(primDef, model, materials, morphs, morphNormals)
{
    var mesh = HX$1.Mesh.createDefaultEmpty();
    var attribs = primDef.attributes;
    var positionAcc = this._getAccessor(attribs.POSITION);
    var normalAcc = attribs.NORMAL !== undefined? this._getAccessor(attribs.NORMAL) : null;
    var tangentAcc = attribs.TANGENT !== undefined? this._getAccessor(attribs.TANGENT) : null;
    var texCoordAcc = attribs.TEXCOORD_0 !== undefined? this._getAccessor(attribs.TEXCOORD_0) : null;
    var jointIndexAcc = attribs.JOINTS_0 !== undefined? this._getAccessor(attribs.JOINTS_0) : null;
    var jointWeightsAcc = attribs.WEIGHTS_0 !== undefined? this._getAccessor(attribs.WEIGHTS_0) : null;

    var normalGenMode = 0;

    var stride = mesh.getVertexStride(0);
    var vertexData = new Float32Array(positionAcc.count * stride);

    this._readVertexData(vertexData, 0, positionAcc, 3, stride, true);

    if (normalAcc)
        this._readVertexData(vertexData, 3, normalAcc, 3, stride, true);
    else
        normalGenMode = HX$1.NormalTangentGenerator.MODE_NORMALS;

    if (tangentAcc)
        this._readVertexData(vertexData, 6, tangentAcc, 4, stride, true);
    else if (texCoordAcc)
        normalGenMode = normalGenMode | HX$1.NormalTangentGenerator.MODE_TANGENTS;

    if (texCoordAcc)
        this._readUVData(vertexData, 10, texCoordAcc, stride);

    mesh.setVertexData(vertexData, 0);

    var indexAcc = this._getAccessor(primDef.indices);
    mesh.setIndexData(this._readIndices(indexAcc));

    if (normalGenMode) {
        var normalGen = new HX$1.NormalTangentGenerator();
        normalGen.generate(mesh);
    }

    if (jointIndexAcc) {
        mesh.addVertexAttribute("hx_jointIndices", 4, 1);
        mesh.addVertexAttribute("hx_jointWeights", 4, 1);
        stride = mesh.getVertexStride(1);

        var jointData = new Float32Array(jointIndexAcc.count * stride);
        this._readVertexData(jointData, 0, jointIndexAcc, 4, stride);
        this._readVertexData(jointData, 4, jointWeightsAcc, 4, stride);
        mesh.setVertexData(jointData, 1);
    }

    if (morphs)
        mesh.generateMorphData(morphNormals);

    model.addMesh(mesh);
    materials.push(this._materials[primDef.material]);
};

GLTF.prototype._readVertexData = function(target, offset, accessor, numComponents, stride, flipCoords)
{
    var p = offset;
    var o = accessor.byteOffset;
    var i;
    var len = accessor.count;
    var src = accessor.data;
    var readFnc;
    var elmSize;

    if (src) {
        if (accessor.dataType === HX$1.DataType.FLOAT) {
            readFnc = src.getFloat32;
            elmSize = 4;
        }
        else if (accessor.dataType === HX$1.DataType.UNSIGNED_SHORT) {
            readFnc = src.getUint16;
            elmSize = 2;
        }
        else if (accessor.dataType === HX$1.DataType.UNSIGNED_INT) {
            readFnc = src.getUint32;
            elmSize = 4;
        }

        for (i = 0; i < len; ++i) {
            for (var j = 0; j < numComponents; ++j) {
                target[p + j] = readFnc.call(src, o, true);
                o += elmSize;
            }

            p += stride;
        }
    }
    else {
        for (i = 0; i < len; ++i) {
            for (var j = 0; j < numComponents; ++j) {
                target[p + j] = 0.0;
            }
        }
        p += stride;
    }

    if (accessor.isSparse)
        this._applySparseAccessor(target, accessor, numComponents, stride, readFnc, elmSize);

    if (flipCoords) {
        p = offset;
        for (i = 0; i < len; ++i) {
            var tmp = target[p + 1];
            target[p] = -target[p];
            target[p + 1] = target[p + 2];
            target[p + 2] = tmp;
            p += stride;
        }
    }
};

GLTF.prototype._applySparseAccessor = function(target, accessor, numComponents, stride, valueReadFunc, valueElmSize)
{
    var len = accessor.sparseCount;
    var indexData = accessor.sparseIndices.data;
    var valueData = accessor.sparseValues.data;
    var id = accessor.sparseIndices.byteOffset;
    var o = accessor.sparseValues.byteOffset;
    var readIndexFnc, idSize;

    if (accessor.dataType === HX$1.DataType.UNSIGNED_SHORT) {
        readIndexFnc = indexData.getUint16;
        idSize = 2;
    }
    else if (accessor.dataType === HX$1.DataType.UNSIGNED_INT) {
        readIndexFnc = indexData.getUint32;
        idSize = 4;
    }

    for (var i = 0; i < len; ++i) {
        var index = readIndexFnc.call(indexData, id) * stride;

        for (var j = 0; j < numComponents; ++j) {
            var value = valueReadFunc.call(valueData, o, true);
            o += valueElmSize;
            target[index + j] = value;
        }
        id += idSize;
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

    if (accessor.dataType === HX$1.DataType.UNSIGNED_SHORT) {
        collType = Uint16Array;
        readFnc = src.getUint16;
        elmSize = 2;
    }
    else if (accessor.dataType === HX$1.DataType.UNSIGNED_INT) {
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

GLTF.prototype._parseSkin = function(nodeDef, target)
{
    var skinIndex = nodeDef.skin;
    var skinDef = this._gltf.skins[skinIndex];

    var invBinAcc = this._getAccessor(skinDef.inverseBindMatrices);

    var src = invBinAcc.data;
    var o = invBinAcc.byteOffset;

    var skeleton = new HX$1.Skeleton();
    var pose = new HX$1.SkeletonPose();

    var skelNode = this._nodes[skinDef.skeleton];

    // no need for it to end up in the scene graph
    if (skelNode.parent) skelNode.parent.detach(skelNode);

    for (var i = 0; i < skinDef.joints.length; ++i) {
        var nodeIndex = skinDef.joints[i];
        var joint = new HX$1.SkeletonJoint();

        joint.inverseBindPose = this._readMatrix4x4(src, o);
        o += 64;

        joint.inverseBindPose.prepend(this._flipCoord);
        joint.inverseBindPose.append(this._flipCoord);

        skeleton.addJoint(joint);

        var node = this._nodes[nodeIndex];
        if (node._jointIndex !== undefined) {
            throw new Error("Adding one node to multiple skeletons!");
        }
        node._jointIndex = i;
        node._skeletonPose = pose;

        var jointPose = new HX$1.SkeletonJointPose();
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

    var m = new HX$1.Matrix4x4();

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
            node = new HX$1.SceneNode();

        if (nodeDef.rotation) {
            node.rotation.set(nodeDef.rotation[0], nodeDef.rotation[1], nodeDef.rotation[2], nodeDef.rotation[3]);
            m.fromQuaternion(node.rotation);
            m.prepend(this._flipCoord);
            m.append(this._flipCoord);
            node.rotation.fromMatrix(m);
        }

        if (nodeDef.translation)
            node.position.set(nodeDef.translation[0], nodeDef.translation[1], -nodeDef.translation[2], 1.0);

        if (nodeDef.scale)
            node.scale.set(nodeDef.scale[0], nodeDef.scale[1], nodeDef.scale[2], 1.0);

        if (nodeDef.matrix) {
            node.matrix = new HX$1.Matrix4x4(nodeDef.matrix);
            node.matrix.prepend(this._flipCoord);
            node.matrix.append(this._flipCoord);
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
            scene = new HX$1.Scene();
            this._target.scenes.push(scene);
        }

        var childNodes = sceneDef.nodes;
        for (var j = 0; j < childNodes.length; ++j) {
            var nodeIndex = childNodes[j];
            scene.attach(this._nodes[nodeIndex]);
        }
    }
};

GLTF.prototype._parseAnimationSampler = function(samplerDef, flipCoords)
{
    var timesAcc = this._getAccessor(samplerDef.input);
    var valuesAcc = this._getAccessor(samplerDef.output);
    var timeSrc = timesAcc.data;
    var valueSrc = valuesAcc.data;
    var t = timesAcc.byteOffset;
    var v = valuesAcc.byteOffset;
    var m = new HX$1.Matrix4x4();

    // in the case of weights
    var elmCount = valuesAcc.count / timesAcc.count;

    var clips = [];

    if (elmCount === 1)
        var clip = clips[0] = new HX$1.AnimationClip();
    else {
        for (var i = 0; i < elmCount; ++i) {
            clips[i] = new HX$1.AnimationClip();
        }
    }

    // valuesAcc can be a multiple of timesAcc, if it contains more weights

    for (var k = 0; k < timesAcc.count; ++k) {
        var value;

        switch(valuesAcc.numComponents) {
            case 1:
                value = [];
                for (i = 0; i < elmCount; ++i)
                    value[i] = this._readFloat(valueSrc, v + i * 4);
                break;
            case 3:
                value = this._readFloat3(valueSrc, v);
                if (flipCoords) {
                    value.x = -value.x;
                    var tmp = value.y;
                    value.y = value.z;
                    value.z = tmp;
                }
                break;
            case 4:
                value = this._readQuat(valueSrc, v);
                if (flipCoords) {
                    m.fromQuaternion(value);
                    m.prepend(this._flipCoord);
                    m.append(this._flipCoord);
                    value.fromMatrix(m);
                }
                break;
            default:
                throw new Error("Unsupported animation sampler type");
        }

        var time = this._readFloat(timeSrc, t) * 1000.0;
        var keyFrame;

        if (elmCount === 1) {
            keyFrame = new HX$1.KeyFrame(time, value);
            clip.addKeyFrame(keyFrame);
        }
        else {
            for (var i = 0; i < elmCount; ++i) {
                keyFrame = new HX$1.KeyFrame(time, value[i]);
                clips[i].addKeyFrame(keyFrame);
            }
        }

        v += valuesAcc.numComponents * elmCount * 4;
        t += 4;
    }

    return clips;
};


GLTF.prototype._parseAnimations = function()
{
    var animDefs = this._gltf.animations;

    if (!animDefs) return;

    for (var i = 0; i < animDefs.length; ++i) {
        var animDef = animDefs[i];
        var animation = new HX$1.LayeredAnimation();

        for (var j = 0; j < animDef.channels.length; ++j) {
            var layers = this._parseAnimationChannel(animDef.channels[j], animDef.samplers);
            for (var k = 0; k < layers.length; ++k)
                animation.addLayer(layers[k]);
        }

        animation.name = animDef.name || "animation_" + i;
        this._target.animations[animation.name] = animation;
    }
};

GLTF.prototype._parseAnimationChannel = function(channelDef, samplers)
{
    var target = this._nodes[channelDef.target.node];
    var layers = [];

    if (target._jointIndex !== undefined)
        target = target._skeletonPose._jointPoses[target._jointIndex];

    switch (channelDef.target.path) {
        case "translation":
            var clips = this._parseAnimationSampler(samplers[channelDef.sampler], true);
            layers = [ new HX$1.AnimationLayerFloat4(target, "position", clips[0]) ];
            break;
        case "rotation":
            var clips = this._parseAnimationSampler(samplers[channelDef.sampler], true);
            layers = [ new HX$1.AnimationLayerQuat(target, "rotation", clips[0]) ] ;
            break;
        case "scale":
            var clips = this._parseAnimationSampler(samplers[channelDef.sampler], false);
            layers = [ new HX$1.AnimationLayerFloat4(target, "scale", clips[0]) ];
            break;
        case "weights":
            var clips = this._parseAnimationSampler(samplers[channelDef.sampler], false);

            layers = [];

            for (var i = 0; i < clips.length; ++i)
                layers.push(new HX$1.AnimationLayerMorphTarget(target.getFirstComponentByType(HX$1.MorphAnimation), "morphTarget_" + i, clips[i]));

            break;
        default:
            throw new Error("Unknown channel path!");
    }
    return layers;
};

GLTF.prototype._playAnimations = function()
{
    var anims = this._target.animations;
    HX$1.ArrayUtils.forEach(anims, function(anim) {
        anim.play();
    });
};

GLTF.prototype._readFloat3 = function(dataView, offset)
{
    var f = new HX$1.Float4();
    f.x = dataView.getFloat32(offset, true);
    f.y = dataView.getFloat32(offset + 4, true);
    f.z = dataView.getFloat32(offset + 8, true);
    return f;
};

GLTF.prototype._readQuat = function(dataView, offset)
{
    var q = new HX$1.Quaternion();
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
    return new HX$1.Matrix4x4(m);
};

/**
 * Warning, MD5 as supported by Helix does not contain any materials nor scene graph information, so it only loads Models, not instances!
 * @constructor
 */
function MD5Mesh()
{
    HX$1.Importer.call(this, HX$1.Model);
    this._target = null;
    this._meshData = null;
    this._jointData = null;
    this._skeleton = null;
}

MD5Mesh.prototype = Object.create(HX$1.Importer.prototype);

MD5Mesh.prototype.parse = function(data, target)
{
    this._skeleton = new HX$1.Skeleton();
    this._model = target;
    this._jointData = [];

    // assuming a valid file, validation isn't our job
    var lines = data.split("\n");
    var len = lines.length;
    var lineFunction = null;

    for (var i = 0; i < len; ++i) {
        // remove leading & trailing whitespace
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        var tokens = line.split(/\s+/);

        if (tokens[0] === "//" || tokens[0] === "")
            continue;

        if (lineFunction) {
            lineFunction.call(this, tokens);
            if (tokens[0] === "}") lineFunction = null;
        }
        else switch (tokens[0]) {
            case "commandline":
            case "numMeshes":
            case "numJoints":
            case "MD5Version":
                break;
            case "joints":
                lineFunction = this._parseJoint;
                break;
            case "mesh":
                this._meshData = new MD5Mesh._MeshData();
                lineFunction = this._parseMesh;
                break;
        }
    }

    target.skeleton = this._skeleton;
    this._notifyComplete(target);
};

MD5Mesh.prototype._parseJoint = function(tokens)
{
    if (tokens[0] === "}") return;

    var jointData = new MD5Mesh._Joint();
    var pos = jointData.pos;
    var quat = jointData.quat;
    jointData.name = tokens[0].substring(1, tokens[0].length - 1);

    jointData.parentIndex = parseInt(tokens[1]);

    pos.x = parseFloat(tokens[3]);
    pos.y = parseFloat(tokens[4]);
    pos.z = parseFloat(tokens[5]);
    quat.x = parseFloat(tokens[8]);
    quat.y = parseFloat(tokens[9]);
    quat.z = parseFloat(tokens[10]);
    quat.w = 1.0 - quat.x*quat.x - quat.y*quat.y - quat.z*quat.z;
    if (quat.w < 0.0) quat.w = 0.0;
    else quat.w = -Math.sqrt(quat.w);

    this._jointData.push(jointData);

    var joint = new HX$1.SkeletonJoint();
    joint.inverseBindPose.fromQuaternion(quat);
    var pos = jointData.pos;
    joint.inverseBindPose.appendTranslation(pos);
    joint.inverseBindPose.invertAffine();
    joint.parentIndex = jointData.parentIndex;
    this._skeleton.addJoint(joint);
};

MD5Mesh.prototype._parseMesh = function(tokens)
{
    switch (tokens[0]) {
        case "shader":
        case "numVerts":
        case "numWeights":
            break;
        case "tri":
            this._meshData.indices.push(parseInt(tokens[2]), parseInt(tokens[4]), parseInt(tokens[3]));
            break;
        case "vert":
            this._parseVert(tokens);
            break;
        case "weight":
            this._parseWeight(tokens);
            break;
        case "}":
            this._translateMesh();
            break;
    }
};

MD5Mesh.prototype._parseVert = function(tokens)
{
    var vert = new MD5Mesh._VertexData();
    vert.u = parseFloat(tokens[3]);
    vert.v = parseFloat(tokens[4]);
    vert.startWeight = parseInt(tokens[6]);
    vert.countWeight = parseInt(tokens[7]);
    this._meshData.vertexData.push(vert);
};

MD5Mesh.prototype._parseWeight = function(tokens)
{
    var weight = new MD5Mesh._WeightData();
    weight.joint = parseInt(tokens[2]);
    weight.bias = parseFloat(tokens[3]);
    weight.pos.x = parseFloat(tokens[5]);
    weight.pos.y = parseFloat(tokens[6]);
    weight.pos.z = parseFloat(tokens[7]);
    this._meshData.weightData.push(weight);
};

MD5Mesh.prototype._translateMesh = function()
{
    var mesh = new HX$1.Mesh.createDefaultEmpty();
    mesh.addVertexAttribute("hx_jointIndices", 4, 1);
    mesh.addVertexAttribute("hx_jointWeights", 4, 1);
    var vertices = [];
    var anims = [];

    var vertexData = this._meshData.vertexData;
    var len = vertexData.length;
    var v = 0, a = 0;
    var x, y, z;

    for (var i = 0; i < len; ++i) {
        var vertData = vertexData[i];
        x = y = z = 0;

        if (vertData.countWeight > 4)
            console.warn("Warning: more than 4 weights assigned. Mesh will not animate correctly");

        for (var w = 0; w < vertData.countWeight; ++w) {
            var weightData = this._meshData.weightData[vertData.startWeight + w];
            var joint = this._jointData[weightData.joint];
            var vec = joint.quat.rotate(weightData.pos);
            var pos = joint.pos;
            var bias = weightData.bias;
            x += (vec.x + pos.x) * bias;
            y += (vec.y + pos.y) * bias;
            z += (vec.z + pos.z) * bias;
            // cap at 4 and hope nothing blows up
            if (w < 4) {
                anims[a + w] = weightData.joint;
                anims[a + 4 + w] = weightData.bias;
            }
        }

        vertices[v] = x;
        vertices[v + 1] = y;
        vertices[v + 2] = z;
        vertices[v + 3] = 0;
        vertices[v + 4] = 0;
        vertices[v + 5] = 1;
        vertices[v + 6] = 1;
        vertices[v + 7] = 0;
        vertices[v + 8] = 0;
        vertices[v + 9] = 1;
        vertices[v + 10] = vertData.u;
        vertices[v + 11] = 1.0 - vertData.v;

        for (var w = vertData.countWeight; w < 4; ++w) {
            anims[a + w] = 0;
            anims[a + 4 + w] = 0;
        }

        a += 8;
        v += 12;
    }

    mesh.setVertexData(vertices, 0);
    mesh.setVertexData(anims, 1);
    mesh.setIndexData(this._meshData.indices);

    var generator = new HX$1.NormalTangentGenerator();
    generator.generate(mesh, HX$1.NormalTangentGenerator.MODE_NORMALS | HX$1.NormalTangentGenerator.MODE_TANGENTS);
    this._model.addMesh(mesh);
};

MD5Mesh._Joint = function()
{
    this.name = null;
    this.parentIndex = -1;
    this.quat = new HX$1.Quaternion();
    this.pos = new HX$1.Float4();
};

MD5Mesh._MeshData = function()
{
    this.vertexData = [];
    this.weightData = [];
    this.indices = [];
};

MD5Mesh._VertexData = function()
{
    this.u = 0;
    this.v = 0;
    this.startWeight = 0;
    this.countWeight = 0;
};

MD5Mesh._WeightData = function()
{
    this.joint = 0;
    this.bias = 0;
    this.pos = new HX$1.Float4();
};

function MD5Anim()
{
    HX$1.Importer.call(this, HX$1.AnimationClip);
    this._hierarchy = null;
    this._baseFrame = null;
    this._activeFrame = null;
    this._numJoints = 0;
    this._frameRate = 0;
}

MD5Anim.prototype = Object.create(HX$1.Importer.prototype);

MD5Anim.prototype.parse = function(data, target)
{
    this._hierarchy = [];
    this._baseFrame = [];
    this._target = target;

    // assuming a valid file, validation isn't our job
    var lines = data.split("\n");
    var len = lines.length;
    var lineFunction = null;

    for (var i = 0; i < len; ++i) {
        // remove leading & trailing whitespace
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        var tokens = line.split(/\s+/);

        if (tokens[0] === "//" || tokens[0] === "")
            continue;

        if (lineFunction) {
            lineFunction.call(this, tokens);
            if (tokens[0] === "}") lineFunction = null;
        }
        else switch (tokens[0]) {
            case "commandline":
            case "numFrames":
            case "MD5Version":
            case "numAnimatedComponents":
                break;
            case "numJoints":
                this._numJoints = parseInt(tokens[1]);
                break;
            case "frameRate":
                this._frameRate = parseInt(tokens[1]);
                break;
            case "hierarchy":
                lineFunction = this._parseHierarchy;
                break;
            case "bounds":
                lineFunction = this._parseBounds;
                break;
            case "baseframe":
                lineFunction = this._parseBaseFrame;
                break;
            case "frame":
                this._activeFrame = new MD5Anim._FrameData();
                lineFunction = this._parseFrame;
                break;

        }
    }

    this._notifyComplete(target);
};

MD5Anim.prototype._parseHierarchy = function(tokens)
{
    if (tokens[0] === "}") return;
    var data = new MD5Anim._HierachyData();
    data.name = tokens[0].substring(1, tokens[0].length - 1);
    data.parent = parseInt(tokens[1]);
    data.flags = parseInt(tokens[2]);
    data.startIndex = parseInt(tokens[3]);
    this._hierarchy.push(data);
};

MD5Anim.prototype._parseBounds = function(tokens)
{
    // don't do anything with bounds for now
};

MD5Anim.prototype._parseBaseFrame = function(tokens)
{
    if (tokens[0] === "}") return;
    var baseFrame = new MD5Anim._BaseFrameData();
    var pos = baseFrame.pos;
    pos.x = parseFloat(tokens[1]);
    pos.y = parseFloat(tokens[2]);
    pos.z = parseFloat(tokens[3]);
    var quat = baseFrame.quat;
    quat.x = parseFloat(tokens[6]);
    quat.y = parseFloat(tokens[7]);
    quat.z = parseFloat(tokens[8]);
    quat.w = 1.0 - quat.x*quat.x - quat.y*quat.y - quat.z*quat.z;
    if (quat.w < 0.0) quat.w = 0.0;
    else quat.w = -Math.sqrt(quat.w);
    this._baseFrame.push(baseFrame);
};

MD5Anim.prototype._parseFrame = function(tokens)
{
    if (tokens[0] === "}") {
        this._translateFrame();
        return;
    }

    var len = tokens.length;
    for (var i = 0; i < len; ++i) {
        this._activeFrame.components.push(parseFloat(tokens[i]));
    }
};

MD5Anim.prototype._translateFrame = function()
{
    var skeletonPose = new HX$1.SkeletonPose();

    for (var i = 0; i < this._numJoints; ++i) {
        var pose = new HX$1.SkeletonJointPose();
        var hierarchy = this._hierarchy[i];
        var base = this._baseFrame[i];
        var flags = hierarchy.flags;
        var pos = base.pos;
        var quat = base.quat;
        var comps = this._activeFrame.components;

        var j = hierarchy.startIndex;

        if (flags & 1) pos.x = comps[j];
        if (flags & 2) pos.y = comps[j+1];
        if (flags & 4) pos.z = comps[j+2];
        if (flags & 8) quat.x = comps[j+3];
        if (flags & 16) quat.y = comps[j+4];
        if (flags & 32) quat.z = comps[j+5];

        var w = 1.0 - quat.x * quat.x - quat.y * quat.y - quat.z * quat.z;
        quat.w = w < 0.0 ? 0.0 : -Math.sqrt(w);

        // transform root joints only
        pose.rotation.copyFrom(quat);
        pose.position.copyFrom(pos);

        skeletonPose.setJointPose(i, pose);
    }

    var time = this._target.numKeyFrames / this._frameRate * 1000.0;
    this._target.addKeyFrame(new HX$1.KeyFrame(time, skeletonPose));
};

MD5Anim._HierachyData = function()
{
    this.name = null;
    this.parent = -1;
    this.flags = 0;
    this.startIndex = 0;
};

MD5Anim._BaseFrameData = function()
{
    this.pos = new HX$1.Float4();
    this.quat = new HX$1.Quaternion();
};

MD5Anim._FrameData = function()
{
    this.components = [];
};

/**
 * @classdesc
 * <p>Signal provides an implementation of the Observer pattern. Functions can be bound to the Signal, and they will be
 * called when the Signal is dispatched. This implementation allows for keeping scope.</p>
 * <p>When dispatch has an object passed to it, this is called the "payload" and will be passed as a parameter to the
 * listener functions</p>
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Signal()
{
    this._listeners = [];
    this._lookUp = {};
}

/**
 * Signals keep "this" of the caller, because having this refer to the signal itself would be silly
 */
Signal.prototype =
{
    /**
     * Binds a function as a listener to the Signal
     * @param {function(*):void} listener A function to be called when the function is dispatched.
     * @param {Object} [thisRef] If provided, the object that will become "this" in the function. Used in a class as such:
     *
     * @example
     * signal.bind(this.methodFunction, this);
     */
    bind: function(listener, thisRef)
    {
        this._lookUp[listener] = this._listeners.length;
        var callback = thisRef? listener.bind(thisRef) : listener;
        this._listeners.push(callback);
    },

    /**
     * Removes a function as a listener.
     */
    unbind: function(listener)
    {
        var index = this._lookUp[listener];
        if (index !== undefined) {
			this._listeners.splice(index, 1);
			delete this._lookUp[listener];
		}
    },

    /**
     * Unbinds all bound functions.
     */
    unbindAll: function()
    {
        this._listeners = [];
        this._lookUp = {};
    },

    /**
     * Dispatches the signal, causing all the listening functions to be called.
     * @param [payload] An optional object to be passed in as a parameter to the listening functions. Can be used to provide data.
     */
    dispatch: function(payload)
    {
        var len = this._listeners.length;
        for (var i = 0; i < len; ++i)
            this._listeners[i].apply(null, arguments);
    },

    /**
     * Returns whether there are any functions bound to the Signal or not.
     */
    get hasListeners()
    {
        return this._listeners.length > 0;
    }
};

/**
 * AsyncTaskQueue allows queueing a bunch of functions which are executed "whenever", in order.
 *
 * TODO: Allow dynamically adding tasks while running
 *  -> should we have a AsyncTaskQueue.runChildQueue() which pushed that into a this._childQueues array.
 *  _executeImpl would then first process these.
 *  The queue itself can just be passed along the regular queued function parameters if the child methods need access to
 *  add child queues hierarchically.
 *
 * @classdesc
 *
 * @ignore
 *
 * @constructor
 */
function AsyncTaskQueue$1()
{
    this.onComplete = new Signal();
    this.onProgress = new Signal();
    this._queue = [];
    this._childQueues = [];
    this._currentIndex = 0;
    this._isRunning = false;
}

AsyncTaskQueue$1.prototype = {
    queue: function(func, rest)
    {
        // V8 engine doesn't perform well if not copying the array first before slicing
        var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));

        this._queue.push({
            func: func,
            args: args.slice(1)
        });
    },

    // this allows adding more subtasks to tasks while running
    // No need to call "execute" on child queues
    addChildQueue: function(queue)
    {
        this._childQueues.push(queue);
    },

    execute: function()
    {
        if (this._isRunning)
            throw new Error("Already running!");

        this._isRunning = true;
        this._currentIndex = 0;

        this._executeTask();
    },

    _executeTask: function()
    {
        setTimeout(this._executeImpl.bind(this));
    },

    _executeImpl: function()
    {
        this.onProgress.dispatch(this._currentIndex / this._queue.length);

        if (this._childQueues.length > 0) {
            var queue = this._childQueues.shift();
            queue.onComplete.bind(this._executeImpl, this);
            queue.execute();
        }
        else if (this._queue.length === this._currentIndex) {
            this.onComplete.dispatch();
        }
        else {
            var elm = this._queue[this._currentIndex];
            elm.func.apply(this, elm.args);
            ++this._currentIndex;
            this._executeTask();
        }
    }
};

/**
 * MTL is an importer for .mtl files accompanying .obj files. Rarely needed by itself.
 * @constructor
 */
function MTL()
{
    HX$1.Importer.call(this, Object, HX$1.URLLoader.DATA_TEXT);
    this._textures = [];
    this._texturesToLoad = [];
    this._activeMaterial = null;
}

MTL.prototype = Object.create(HX$1.Importer.prototype);

MTL.prototype.parse = function(data, target)
{
    var lines = data.split("\n");
    var numLines = lines.length;

    for (var i = 0; i < numLines; ++i) {
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        this._parseLine(line, target);
    }

    this._loadTextures(target);
};

MTL.prototype._parseLine = function(line, target)
{
    // skip line
    if (line.length === 0 || line.charAt(0) === "#") return;
    var tokens = line.split(/\s+/);

    switch (tokens[0].toLowerCase()) {
        case "newmtl":
            this._activeMaterial = new HX$1.BasicMaterial();
            this._activeMaterial.name = tokens[1];
            target[tokens[1]] = this._activeMaterial;
            break;
        case "ns":
            var specularPower = parseFloat(tokens[1]);
            this._activeMaterial.roughness = HX$1.BasicMaterial.roughnessFromShininess(specularPower);
            this._activeMaterial.roughnessRange = this._activeMaterial.roughness;
            break;
        case "kd":
            this._activeMaterial.color = new HX$1.Color(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
            break;
        case "map_kd":
            this._activeMaterial.colorMap = this._getTexture(tokens[1]);
            break;
        case "map_d":
            this._activeMaterial.maskMap = this._getTexture(tokens[1]);
            this._activeMaterial.alphaThreshold = .5;
            break;
        case "map_ns":
            this._activeMaterial.specularMap = this._getTexture(tokens[1]);
            break;
        case "map_bump":
        case "bump":
            this._activeMaterial.normalMap = this._getTexture(tokens[1]);
            break;
        default:
        //console.log("MTL tag ignored or unsupported: " + tokens[0]);
    }
};

MTL.prototype._getTexture = function(url)
{
    if (!this._textures[url]) {
        var tex = new HX$1.Texture2D();
        this._textures[url] = tex;

        this._texturesToLoad.push({
            file: this._correctURL(url),
            importer: HX$1.JPG,
            target: tex
        });
    }
    return this._textures[url];
};

MTL.prototype._loadTextures = function(lib)
{
    var library = new HX$1.AssetLibrary(null, this.options.crossOrigin);
    library.fileMap = this.fileMap;
    var files = this._texturesToLoad;
    var len = files.length;
    if (len === 0) {
        this._notifyComplete(lib);
        return;
    }

    for (var i = 0; i < files.length; ++i) {
        library.queueAsset(files[i].file, files[i].file, HX$1.AssetLibrary.Type.ASSET, files[i].importer, this.options, files[i].target);
    }


    library.onComplete.bind(function() {
        this._notifyComplete(lib);
    }, this);

    library.onProgress.bind(function(ratio) {
        this._notifyProgress(ratio);
    }, this);

    library.load(files);
};

function OBJ()

/**
 * @classdesc
 * OBJ is an importer for the Wavefront OBJ format.
 * The options property supports the following settings:
 * <ul>
 * <li>groupsAsObjects: Specifies whether group tags should be treated as separate scene graph objects (true) or as separate Mesh objects (false). Defaults to true.</li>
 * </ul>
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
{
    HX$1.Importer.call(this, HX$1.SceneNode);
    this._objects = [];
    this._vertices = [];
    this._normals = [];
    this._uvs = [];
    this._hasNormals = false;
    this._defaultMaterial = new HX$1.BasicMaterial();
    this._target = null;
    this._mtlLibFile = null;
}

OBJ.prototype = Object.create(HX$1.Importer.prototype);

OBJ.prototype.parse = function(data, target)
{
    this._groupsAsObjects = this.options.groupsAsObjects === undefined? true : this._groupsAsObjects;
    this._target = target;

    var lines = data.split("\n");
    var numLines = lines.length;

    this._pushNewObject("hx_default");

    for (var i = 0; i < numLines; ++i) {
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        this._parseLine(line);
    }

    if (this._mtlLibFile)
        this._loadMTLLib(this._mtlLibFile);
    else
        this._finish(null);
};

OBJ.prototype._finish = function(mtlLib)
{
    var queue = new AsyncTaskQueue$1();
    var numObjects = this._objects.length;

    for (var i = 0; i < numObjects; ++i) {
        queue.queue(this._translateObject.bind(this), i, mtlLib);
    }

    // actually, we don't need to bind to the queue's onComplete signal, can just add the notification last
    queue.queue(this._notifyComplete.bind(this), this._target);
    queue.execute();
};

OBJ.prototype._loadMTLLib = function(filename)
{
    var loader = new HX$1.AssetLoader(MTL);
    var self = this;

    loader.onComplete = function (asset)
    {
        self._finish(asset);
    };

    loader.onProgress = function(ratio)
    {
        self._notifyProgress(ratio * .8);
    };

    loader.onFail = function (message)
    {
        self._notifyFailure(message);
    };

    loader.load(filename);
};

OBJ.prototype._parseLine = function(line)
{
    // skip line
    if (line.length === 0 || line.charAt(0) === "#") return;
    var tokens = line.split(/\s+/);

    switch (tokens[0].toLowerCase()) {
        case "mtllib":
            this._mtlLibFile = this._correctURL(tokens[1]);
            break;
        case "usemtl":
            this._setActiveSubGroup(tokens[1]);
            break;
        case "v":
            this._vertices.push(parseFloat(tokens[1]), parseFloat(tokens[3]), parseFloat(tokens[2]));
            break;
        case "vt":
            this._uvs.push(parseFloat(tokens[1]), parseFloat(tokens[2]));
            break;
        case "vn":
            this._normals.push(parseFloat(tokens[1]), parseFloat(tokens[3]), parseFloat(tokens[2]));
            break;
        case "o":
            this._pushNewObject(tokens[1]);
            break;
        case "g":
            if (this._groupsAsObjects)
                this._pushNewObject(tokens[1]);
            else
                this._pushNewGroup(tokens[1]);

            break;
        case "f":
            this._parseFaceData(tokens);
            break;
        default:
            // ignore following tags:
            // s
            //console.log("OBJ tag ignored or unsupported: " + tokens[0]);
    }
};

OBJ.prototype._pushNewObject = function(name)
{
    this._activeObject = new OBJ._ObjectData();
    this._activeObject.name = name;
    this._objects.push(this._activeObject);
    this._pushNewGroup("hx_default");
};

OBJ.prototype._pushNewGroup = function(name)
{
    this._activeGroup = new OBJ._GroupData();
    this._activeGroup.name = name || "Group" + this._activeGroup.length;

    this._activeObject.groups.push(this._activeGroup);
    this._setActiveSubGroup("hx_default");
};

OBJ.prototype._setActiveSubGroup = function(name)
{
    this._activeGroup.subgroups[name] = this._activeGroup.subgroups[name] || new OBJ._SubGroupData();
    this._activeSubGroup = this._activeGroup.subgroups[name];
};

OBJ.prototype._parseFaceData = function(tokens)
{
    var face = new OBJ._FaceData();
    var numTokens = tokens.length;

    for (var i = 1; i < numTokens; ++i) {
        var faceVertexData = new OBJ._FaceVertexData();
        face.vertices.push(faceVertexData);

        var indices = tokens[i].split("/");
        var index = (indices[0] - 1) * 3;

        faceVertexData.posX = this._vertices[index];
        faceVertexData.posY = this._vertices[index + 1];
        faceVertexData.posZ = this._vertices[index + 2];

        if(indices.length > 1) {
            index = (indices[1] - 1) * 2;

            faceVertexData.uvU = this._uvs[index];
            faceVertexData.uvV = this._uvs[index + 1];

            if (indices.length > 2) {
                index = (indices[2] - 1) * 3;
                this._hasNormals = true;
                faceVertexData.normalX = this._normals[index];
                faceVertexData.normalY = this._normals[index + 1];
                faceVertexData.normalZ = this._normals[index + 2];
            }
        }
    }

    this._activeSubGroup.faces.push(face);
    this._activeSubGroup.numIndices += tokens.length === 4 ? 3 : 6;
};

OBJ.prototype._translateObject = function(objectIndex, mtlLib)
{
    var object = this._objects[objectIndex];
    var numGroups = object.groups.length;
    if (numGroups === 0) return;
    var materials = [];
    var model = new HX$1.Model();

    for (var i = 0; i < numGroups; ++i) {
        var group = object.groups[i];

        for (var key in group.subgroups)
        {
            if (group.subgroups.hasOwnProperty(key)) {
                var subgroup = group.subgroups[key];
                if (subgroup.numIndices === 0) continue;
                model.addMesh(this._translateMesh(subgroup));

                var material = mtlLib? mtlLib[key] : null;
                material = material || this._defaultMaterial;
                materials.push(material);
            }
        }
    }

    var modelInstance = new HX$1.ModelInstance(model, materials);
    modelInstance.name = object.name;
    this._target.attach(modelInstance);

    this._notifyProgress(.8 + (objectIndex + 1) / this._objects.length * .2);
};

OBJ.prototype._translateMesh = function(group)
{
    var mesh = HX$1.Mesh.createDefaultEmpty();
    var realIndices = [];
    var indices = new Array(group.numIndices);
    var numVertices = 0;
    var currentIndex = 0;

    var faces = group.faces;
    var numFaces = faces.length;
    for (var i = 0; i < numFaces; ++i) {
        var face = faces[i];

        var faceVerts = face.vertices;
        var numVerts = faceVerts.length;

        for (var j = 0; j < numVerts; ++j) {
            var vert = faceVerts[j];
            var hash = vert.getHash();
            if (!realIndices.hasOwnProperty(hash))
                realIndices[hash] = {index: numVertices++, vertex: vert};
        }

        indices[currentIndex] = realIndices[faceVerts[0].getHash()].index;
        indices[currentIndex+1] = realIndices[faceVerts[2].getHash()].index;
        indices[currentIndex+2] = realIndices[faceVerts[1].getHash()].index;
        currentIndex += 3;

        if (numVerts === 4) {
            indices[currentIndex] = realIndices[faceVerts[0].getHash()].index;
            indices[currentIndex+1] = realIndices[faceVerts[3].getHash()].index;
            indices[currentIndex+2] = realIndices[faceVerts[2].getHash()].index;
            currentIndex += 3;
        }
    }

    var vertices = new Array(numVertices * HX$1.Mesh.DEFAULT_VERTEX_SIZE);

    for (var hash in realIndices) {
        if (!realIndices.hasOwnProperty(hash)) continue;
        var data = realIndices[hash];
        var vertex = data.vertex;
        var index = data.index * HX$1.Mesh.DEFAULT_VERTEX_SIZE;

        vertices[index] = vertex.posX;
        vertices[index+1] = vertex.posY;
        vertices[index+2] = vertex.posZ;
        vertices[index+3] = vertex.normalX;
        vertices[index+4] = vertex.normalY;
        vertices[index+5] = vertex.normalZ;
        vertices[index+6] = 0;
        vertices[index+7] = 0;
        vertices[index+8] = 0;
        vertices[index+9] = 1;
        vertices[index+10] = vertex.uvU;
        vertices[index+11] = vertex.uvV;
    }

    mesh.setVertexData(vertices, 0);
    mesh.setIndexData(indices);

    var mode = HX$1.NormalTangentGenerator.MODE_TANGENTS;
    if (!this._hasNormals) mode = mode | HX$1.NormalTangentGenerator.MODE_NORMALS;
    var generator = new HX$1.NormalTangentGenerator();
    generator.generate(mesh, mode, true);
    return mesh;
};

OBJ._FaceVertexData = function()
{
    this.posX = 0;
    this.posY = 0;
    this.posZ = 0;
    this.uvU = 0;
    this.uvV = 0;
    this.normalX = 0;
    this.normalY = 0;
    this.normalZ = 0;
    this._hash = "";
};

OBJ._FaceVertexData.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash)
            this._hash = this.posX + "/" + this.posY + "/" + this.posZ + "/" + this.uvU + "/" + this.uvV + "/" + this.normalX + "/" + this.normalY + "/" + this.normalZ + "/";

        return this._hash;
    }
};

OBJ._FaceData = function()
{
    this.vertices = []; // <FaceVertexData>
};

OBJ._SubGroupData = function()
{
    this.numIndices = 0;
    this.faces = [];    // <FaceData>
};

OBJ._GroupData = function()
{
    this.subgroups = [];
    this.name = "";    // <FaceData>
    this._activeMaterial = null;
};

OBJ._ObjectData = function()
{
    this.name = "";
    this.groups = [];
    this._activeGroup = null;
};

// this is used to represent the file contents itself, not translated to connected nodes yet
function FBXRecord()
{
    this.name = "";
    this.data = [];
    this.children = [];
}

FBXRecord.prototype =
{
    getChildByName: function(name)
    {
        var len = this.children.length;
        for (var i = 0; i < len; ++i) {
            var child = this.children[i];
            if (child.name === name) return child;
        }
    },

    printDebug: function (printData, lvl)
    {
        if (printData === undefined) printData = true;
        if (lvl === undefined) lvl = 0;

        var padding = "";
        for (var i = 0; i < lvl; ++i)
            padding += "\t";

        console.log(padding + this.name);

        if (printData && this.data.length > 0) {
            console.log(padding + "\t[data] {");
            for (var i = 0; i < this.data.length; ++i) {
                console.log(padding + "\t\t[" + i + "] : " + this.data[i]);
            }
            console.log(padding + "}");
        }

        for (var i = 0; i < this.children.length; ++i)
            this.children[i].printDebug(printData, lvl + 1);
    }
};

// Could also create an ASCII deserializer
function FBXBinaryDeserializer()
{
    this._version = 0;
}

FBXBinaryDeserializer.prototype =
{
    get version() { return this._version },

    deserialize: function(dataStream)
    {
        this._data = dataStream;
        this._verifyHeader();

        if (this._data.getUint16() !== 0x001a)
            console.log("Suspected oddity with FBX file");

        this._version = this._data.getUint32();

        var root = new FBXRecord();
        root.name = "[root]";

        this._deserializeNode(root);
        return root;
    },

    _verifyHeader: function()
    {
        if (this._data.getString(21) !== "Kaydara FBX Binary  \0")
            throw new Error("Incorrect FBX file header!");
    },

    _deserializeNode: function(parent)
    {
        var node;
        do {
            node = this._importNode();
            if (node) parent.children.push(node);
        } while (node);
    },

    _importNode: function()
    {
        var data = this._data;
        var endOffset = data.getUint32();
        var numProperties = data.getUint32();
        var propertyListLen = data.getUint32();
        var nameLen = data.getUint8();

        if (endOffset === 0) {
            if (numProperties !== 0 || propertyListLen !== 0 || nameLen !== 0)
                throw new Error("Invalid null node!");
            return null;
        }

        var record = new FBXRecord();
        record.name = data.getString(nameLen);

        for (var i = 0; i < numProperties; ++i) {
            var dataElm = this._parseDataElement();
            record.data.push(dataElm);
        }

        // there's more data, must contain child nodes (terminated by null node)
        if (data.offset !== endOffset) {
            this._deserializeNode(record);
        }

        return record;
    },

    _parseDataElement: function()
    {
        var typeCode = this._data.getChar();

        switch (typeCode) {
            case FBXBinaryDeserializer.BOOLEAN:
                return this._data.getUint8();
                break;
            case FBXBinaryDeserializer.INT16:
                return this._data.getInt16();
                break;
            case FBXBinaryDeserializer.INT32:
                return this._data.getInt32();
                break;
            case FBXBinaryDeserializer.INT64:
                // just concatenating strings, since they're only used for ids
                return this._data.getInt64AsFloat64();
                break;
            case FBXBinaryDeserializer.FLOAT:
                return this._data.getFloat32();
                break;
            case FBXBinaryDeserializer.DOUBLE:
                return this._data.getFloat64();
                break;
            case FBXBinaryDeserializer.STRING:
                var len = this._data.getUint32();
                if (len === 0) return "";
                return this._data.getString(len);
                break;
            case FBXBinaryDeserializer.RAW:
                var len = this._data.getUint32();
                return this._data.getUint8Array(len);
                break;
            default:
                return this._parseArray(typeCode);
        }
    },

    _parseArray: function(type)
    {
        var len = this._data.getUint32();
        var encoding = this._data.getUint32();
        var compressedLength = this._data.getUint32();

        if (encoding === 0) {
            switch (type) {
                case FBXBinaryDeserializer.BOOLEAN_ARRAY:
                    return this._data.getUint8Array(len);
                case FBXBinaryDeserializer.INT32_ARRAY:
                    return this._data.getInt32Array(len);
                case FBXBinaryDeserializer.INT64_ARRAY:
                    return this._data.getInt64AsFloat64Array(len);
                    break;
                case FBXBinaryDeserializer.FLOAT_ARRAY:
                    return this._data.getFloat32Array(len);
                    break;
                case FBXBinaryDeserializer.DOUBLE_ARRAY:
                    return this._data.getFloat64Array(len);
                    break;
                default:
                    throw new Error("Unknown data type code " + type);
            }
        }
        else if (encoding === 1) {
            var data = this._data.getUint8Array(compressedLength);
            data = pako.inflate(data).buffer;

            switch (type) {
                case FBXBinaryDeserializer.BOOLEAN_ARRAY:
                    return new Uint8Array(data);
                case FBXBinaryDeserializer.INT32_ARRAY:
                    return new Int32Array(data);
                case FBXBinaryDeserializer.INT64_ARRAY:
                    data = new HX.DataStream(new DataView(data));
                    return data.getInt64AsFloat64Array(data.byteLength / 8);
                case FBXBinaryDeserializer.FLOAT_ARRAY:
                    return new Float32Array(data);
                case FBXBinaryDeserializer.DOUBLE_ARRAY:
                    return new Float64Array(data);
                default:
                    throw new Error("Unknown data type code " + type);
            }
        }
        else
            throw new Error("Invalid encoding value " + encoding);
    }
};

FBXBinaryDeserializer.INT16 = "Y";
FBXBinaryDeserializer.BOOLEAN = "C";
FBXBinaryDeserializer.INT32 = "I";
FBXBinaryDeserializer.FLOAT = "F";
FBXBinaryDeserializer.DOUBLE = "D";
FBXBinaryDeserializer.INT64 = "L";

FBXBinaryDeserializer.BOOLEAN_ARRAY = "b";
FBXBinaryDeserializer.INT32_ARRAY = "i";
FBXBinaryDeserializer.FLOAT_ARRAY = "f";
FBXBinaryDeserializer.DOUBLE_ARRAY = "d";
FBXBinaryDeserializer.INT64_ARRAY = "l";

FBXBinaryDeserializer.STRING = "S";
FBXBinaryDeserializer.RAW = "R";

function FbxObject()
{
    this.name = null;
    this.UID = null;
    this.parent = null; // only used if parent is FbxNode

    // can be use for marking during parsing
    this.data = null;
}

FbxObject.prototype =
{
    connectObject: function(obj)
    {
        throw new Error("Unhandled object connection " + obj.toString() + " -> " + this.toString());
    },

    connectProperty: function(obj, propertyName)
    {

    },

    copyProperties: function(template)
    {
        for (var key in template) {
            // do not copy anything that's not defined
            if (this.hasOwnProperty(key) && template[key] !== undefined && template[key] !== null) {
                // very dirty, but saves so much space
                // FBX native properties are uppercase, ours aren't. There you have it.
                var char = key.charAt(0);
                if (char.toUpperCase() === char)
                    this[key] = template[key];
            }
        }
    }
};

FbxObject.prototype.toString = function() { return "[FbxObject(name="+this.name+")]"; };

// probably needs to be subclasses for Light, Camera, etc
function FbxNodeAttribute()
{
    FbxObject.call(this);
    // actual video not supported
    this.type = null;
}

FbxNodeAttribute.prototype = Object.create(FbxObject.prototype);

FbxNodeAttribute.prototype.toString = function() { return "[FbxNodeAttribute(name="+this.name+", type="+this.type+")]"; };

function FbxCluster()
{
    FbxObject.call(this);
    this.limbNode = null;
    this.transform = null;
    this.transformLink = null;
    this.indices = null;
    this.weights = null;
}

FbxCluster.prototype = Object.create(FbxObject.prototype);

FbxCluster.prototype.toString = function() { return "[FbxCluster(name="+this.name+")]"; };

FbxCluster.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxNode) {
        this.limbNode = obj;
    }
    else
        throw new Error("Unhandled object connection " + obj.toString());
};

function FbxSkin()
{
    FbxObject.call(this);
    this.clusters = null;

    // data will contain the converter
}

FbxSkin.prototype = Object.create(FbxObject.prototype);

FbxSkin.prototype.toString = function() { return "[FbxSkin(name="+this.name+")]"; };

FbxSkin.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxCluster) {
        this.clusters = this.clusters || [];
        this.clusters.push(obj);
    }
    else
        throw new Error("Unhandled object connection " + obj.toString());
};

/**
 *
 * @constructor
 */
function FbxMesh()
{
    FbxObject.call(this);
    this.Color = null;
    this["Casts Shadows"] = true;

    this.vertices = null;
    this.layerElements = null;
    this.deformers = null;
}

FbxMesh.prototype = Object.create(FbxObject.prototype);

FbxMesh.prototype.toString = function() { return "[FbxMesh(name="+this.name+")]"; };

FbxMesh.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxSkin) {
        this.deformers = this.deformers || [];
        this.deformers.push(obj);
    }
    else {
        throw new Error("Unhandled object connection " + obj.toString());
    }
};

function FbxVideo()
{
    FbxObject.call(this);
    // actual video not supported
    this.relativeFilename = null;
}

FbxVideo.prototype = Object.create(FbxObject.prototype);
FbxVideo.prototype.toString = function() { return "[FbxVideo(name="+this.name+")]"; };

function FbxFileTexture()
{
    FbxObject.call(this);
    this.WrapModeU = 0;
    this.WrapModeV = 0;
    //this.UVSet = null;    // we only support a single uv set

    this.relativeFilename = null;
    this.video = null;
}

FbxFileTexture.prototype = Object.create(FbxObject.prototype);

FbxFileTexture.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxVideo)
        this.video = obj;
    else
        throw new Error("Incompatible child object!");
};

FbxFileTexture.prototype.toString = function() { return "[FbxFileTexture(name="+this.name+")]"; };

function FbxMaterial()
{
    FbxObject.call(this);
    // actual video not supported
    this.EmissiveColor = null;
    this.EmissiveFactor = 1;
    this.DiffuseColor = null;
    this.DiffuseFactor = 1;
    //this.NormalMap = null;
    this.ShininessExponent = undefined;
    this.Shininess = undefined;

    this.textures = null;
}

FbxMaterial.prototype = Object.create(FbxObject.prototype);

FbxMaterial.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof FbxFileTexture) {
        this.textures = this.textures || {};
        this.textures[propertyName] = obj;
    }
    else
        throw new Error("Unknown object property!");
};

FbxMaterial.prototype.toString = function() { return "[FbxMaterial(name="+this.name+")]"; };

function FbxTrashNode()
{
    FbxObject.call(this);
}

FbxTrashNode.prototype = Object.create(FbxObject.prototype);

FbxTrashNode.prototype.toString = function() { return "[FbxTrashNode(name="+this.name+")]"; };

// ignore
FbxTrashNode.prototype.connectObject = function(obj) {};

function FbxAnimationCurve()
{
    FbxObject.call(this);
    this.Default = undefined;
    this.KeyVer = 0.0;
    this.KeyTime = 0.0;
    this.KeyValueFloat = null;
    this.KeyAttrFlags = 0.0;
    this.KeyAttrDataFloat = null;
    this.KeyAttrRefCount = 0.0;
}

FbxAnimationCurve.prototype = Object.create(FbxObject.prototype);
FbxAnimationCurve.prototype.toString = function() { return "[FbxAnimationCurve(name="+this.name+")]"; };

function FbxAnimationCurveNode()
{
    FbxObject.call(this);
    this.curves = null;
    // are these weights?
    this["d|X"] = 0.0;
    this["d|Y"] = 0.0;
    this["d|Z"] = 0.0;
    this.propertyName = null;
}

FbxAnimationCurveNode.prototype = Object.create(FbxObject.prototype);
FbxAnimationCurveNode.prototype.toString = function() { return "[FbxAnimationCurveNode(name="+this.name+")]"; };

FbxAnimationCurveNode.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof FbxAnimationCurve) {
        this.curves = this.curves || {};
        this.curves[propertyName] = obj;
    }
};

function FbxNode()
{
    FbxObject.call(this);
    this.RotationOffset = null;
    this.RotationPivot = null;
    this.ScalingOffset = null;
    this.ScalingPivot = null;
    this.RotationOrder = 0;
    this.PreRotation = null;
    this.PostRotation = null;
    this.InheritType = 0;
    this.GeometricTranslation = null;
    this.GeometricRotation = null;
    this.GeometricScaling = null;
    this["Lcl Translation"] = null;
    this["Lcl Rotation"] = null;
    this["Lcl Scaling"] = null;
    this.Visibility = true;

    this.type = null;
    this.children = null;
    this.skeleton = null;
    this.defaultAttribute = null;
    this.attributes = null;
    this.mesh = null;
    this.materials = null;
    this.animationCurveNodes = null;

    this._geometricMatrix = null;
    this._matrix = null;
}

FbxNode.prototype = Object.create(FbxObject.prototype,
    {
        numChildren:
        {
            get: function ()
            {
                return this.children? this.children.length : 0;
            }
        },

        geometryTransform:
        {
            get: function()
            {
                if (!this._geometricMatrix) {
                    this._geometricMatrix = new HX.Matrix4x4();
                    if (this.GeometricRotation || this.GeometricScaling || this.GeometricTranslation) {
                        var transform = new HX.Transform();
                        // for now there will be problems with this if several geometric transformations are used on the same geometry
                        if (this.GeometricRotation) {
                            var quat = new HX.Quaternion();
                            quat.fromEuler(this.GeometricRotation.x * HX.MathX.DEG_TO_RAD, this.GeometricRotation.y * HX.MathX.DEG_TO_RAD, this.GeometricRotation.z * HX.MathX.DEG_TO_RAD);
                            transform.rotation = quat;
                        }
                        if (this.GeometricScaling) transform.scale = this.GeometricScaling;
                        if (this.GeometricTranslation) transform.position = this.GeometricTranslation;
                        this._geometricMatrix.copyFrom(transform.matrix);
                    }
                }

                return this._geometricMatrix;
            }
        },

        matrix:
        {
            get: function()
            {
                if (!this._matrix) {
                    this._matrix = new HX.Matrix4x4();
                    var matrix = this._matrix;
                    var p = new HX.Float4();
                    if (this.ScalingPivot) {
                        p.negativeOf(this.ScalingPivot);
                        matrix.appendTranslation(p);
                    }
                    var scale = this["Lcl Scaling"];
                    if (scale) matrix.appendScale(scale.x, scale.y, scale.z);
                    if (this.ScalingPivot) matrix.appendTranslation(this.ScalingPivot);
                    if (this.ScalingOffset) matrix.appendTranslation(this.ScalingOffset);

                    if (this.RotationPivot) {
                        p.negativeOf(this.RotationPivot);
                        matrix.appendTranslation(p);
                    }
                    if (this.PreRotation) matrix.appendQuaternion(this._convertRotation(this.PreRotation));
                    if (this["Lcl Rotation"]) matrix.appendQuaternion(this._convertRotation(this["Lcl Rotation"]));
                    if (this.PostRotation) matrix.appendQuaternion(this._convertRotation(this.PostRotation));
                    if (this.RotationPivot) matrix.appendTranslation(this.RotationPivot);
                    if (this.RotationOffset) matrix.appendTranslation(this.RotationOffset);

                    if (this["Lcl Translation"]) matrix.appendTranslation(this["Lcl Translation"]);
                }

                return this._matrix;
            }
        }
    }
);

FbxNode.prototype.getChild = function(i)
{
    return this.children[i];
};

FbxNode.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxNode) {
        //if (obj.type === "Null") return;

        if (obj.type === "Root") {
            this.skeleton = obj;
        }
        else {
            this.children = this.children || [];
            this.children.push(obj);
            obj.parent = this;
        }
    }
    else if (obj instanceof FbxNodeAttribute) {
        this.defaultAttribute = this.defaultAttribute || obj;
        this.attributes = this.attributes || [];
        this.attributes.push(obj);
    }
    else if (obj instanceof FbxMesh) {
        this.mesh = obj;
        this.mesh.parent = this;
    }
    else if (obj instanceof FbxMaterial) {
        this.materials = this.materials || [];
        this.materials.push(obj);
    }
    else if (obj instanceof FbxTrashNode) {
        // silently ignore it
    }
    else {
        throw new Error("Incompatible child object " + obj.toString() + " for " + this.type);
    }
};

FbxNode.prototype._convertRotation = function(v)
{
    var quat = new HX.Quaternion();
    quat.fromEuler(v.x * HX.MathX.DEG_TO_RAD, v.y * HX.MathX.DEG_TO_RAD, v.z * HX.MathX.DEG_TO_RAD);
    return quat;
};

FbxNode.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof FbxAnimationCurveNode) {
        this.animationCurveNodes = this.animationCurveNodes || {};
        this.animationCurveNodes[propertyName] = obj;
        obj.propertyName = propertyName;
    }
};

FbxNode.prototype.toString = function() { return "[FbxNode(name="+this.name+", type="+this.type+")]"; };

function FbxAnimLayer()
{
    FbxObject.call(this);
    this.curveNodes = null;
}

FbxAnimLayer.prototype = Object.create(FbxObject.prototype);
FbxAnimLayer.prototype.toString = function() { return "[FbxAnimLayer(name="+this.name+")]"; };

FbxAnimLayer.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxAnimationCurveNode) {
        this.curveNodes = this.curveNodes || [];
        this.curveNodes.push(obj);
    }
    else
        throw new Error("Incompatible child object " + obj.toString());
};

function FbxTime(value)
{
    this._value = value;
}

FbxTime.getSpan = function(start, stop)
{
    return new FbxTime(stop._value - start._value);
};

FbxTime.TC_MILLISECOND = 46186158;

FbxTime.prototype =
{
    get milliseconds()
    {
        return this._value / FbxTime.TC_MILLISECOND;
    },

    set milliseconds(value)
    {
        this._value = value * FbxTime.TC_MILLISECOND;
    },

    getFrameCount: function(frameRate)
    {
        return Math.floor(this.milliseconds / 1000.0 * frameRate);
    },

    toString: function()
    {
        return "[FbxTime(name="+this._value+")]";
    }
};

function FbxAnimStack()
{
    FbxObject.call(this);

    this.LocalStart = new FbxTime();
    this.LocalStop = new FbxTime();
    this.ReferenceStart = new FbxTime();
    this.ReferenceStop = new FbxTime();

    this.layers = null;
}

FbxAnimStack.prototype = Object.create(FbxObject.prototype);

FbxAnimStack.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxAnimLayer) {
        this.layers = this.layers || [];
        this.layers.push(obj);
    }
    else
        throw new Error("Incompatible child object " + obj.toString());
};

FbxAnimStack.prototype.toString = function() { return "[FbxAnimStack(name="+this.name+")]"; };

function FbxPose()
{
    FbxObject.call(this);
    this.type = null;
    this.poseNodes = [];
}

FbxPose.prototype = Object.create(FbxObject.prototype);

FbxPose.prototype.toString = function() { return "[FbxPose(name="+this.name+")]"; };

function FbxPoseNode()
{
    this.targetUID = null;
    this.matrix = null;
}

function FbxLayerElement()
{
    FbxObject.call(this);
    this.directData = null;
    this.indexData = null;
    this.type = null;   // can be normal, uv, etc ...
    this.mappingInformationType = 0;
    this.referenceInformationType = 0;
}

FbxLayerElement.prototype = Object.create(FbxObject.prototype);

FbxLayerElement.MAPPING_TYPE = {
    NONE: 0,
    BY_POLYGON_VERTEX: 1,
    BY_CONTROL_POINT: 2,
    BY_POLYGON: 3,
    ALL_SAME: 4
};

FbxLayerElement.REFERENCE_TYPE = {
    DIRECT: 1,
    INDEX_TO_DIRECT: 2
};

FbxLayerElement.prototype.toString = function() { return "[FbxLayerElement(name="+this.name+")]"; };

// Could also create an ASCII deserializer
/**
 *
 * @constructor
 */
function FBXGraphBuilder()
{
    this._settings = null;
    this._templates = null;
    this._objects = null;
    this._rootNode = null;
    this._animationStack = null;
    this._bindPoses = null;
}

FBXGraphBuilder.prototype =
{
    get bindPoses() { return this._bindPoses; },
    get sceneRoot() { return this._rootNode; },
    get animationStack() { return this._animationStack; },

    build: function(rootRecord, settings)
    {
        this._settings = settings;
        this._templates = {};
        this._objects = {};
        this._bindPoses = null;

        // fbx scene node
        this._rootNode = new FbxNode();
        this._rootNode.name = "hx_rootNode";

        // animations, we'll turn them into a SkeletonBlendTree eventually
        this._animationStack = null;

        // handle templates
        this._processTemplates(rootRecord.getChildByName("Definitions"));
        this._processObjects(rootRecord.getChildByName("Objects"));
        this._processConnections(rootRecord.getChildByName("Connections"));
    },

    _processTemplates: function(definitions)
    {
        var len = definitions.children.length;
        for (var i = 0; i < len; ++i) {
            var child = definitions.children[i];
            if (child.name === "ObjectType") {
                var template = child.getChildByName("PropertyTemplate");
                if (!template) continue;
                var subclass = template.data[0];
                var type = child.data[0];
                var node = this._createNode(type, subclass, template);

                if (node)
                    this._assignProperties(node, template.getChildByName("Properties70"));

                this._templates[type] = node;
            }
        }
    },

    _processObjects: function(definitions)
    {
        var len = definitions.children.length;
        for (var i = 0; i < len; ++i) {
            var obj = null;
            var node = definitions.children[i];
            switch (node.name) {
                case "Geometry":
                    obj = this._processGeometry(node);
                    break;
                case "NodeAttribute":
                    // at this point, we're only supporting meshes
                    // TODO: FbxNodeAttribute will be cast to FbxCamera etc
                    obj = new FbxNodeAttribute();
                    obj.type = node.data[2];
                    break;
                case "Model":
                    obj = new FbxNode();
                    obj.type = node.data[2];
                    // not sure if this is correct
                    break;
                case "Material":
                    obj = new FbxMaterial();
                    break;
                case "Video":
                    obj = new FbxVideo();
                    var rel = node.getChildByName("RelativeFilename");
                    obj.relativeFilename = rel? rel.data[0] : null;
                    break;
                case "Texture":
                    obj = new FbxFileTexture();
                    var rel = node.getChildByName("RelativeFilename");
                    obj.relativeFilename = rel? rel.data[0] : null;
                    break;
                case "Pose":
                    obj = this._processPose(node);
                    this._bindPoses = this._bindPoses || [];
                    this._bindPoses.push(obj);
                    break;
                case "Deformer":
                    if (node.data[2] === "Skin")
                        obj = new FbxSkin();
                    else
                        obj = this._processCluster(node);
                    break;
                case "AnimationStack":
                    obj = new FbxAnimStack();
                    this._animationStack = obj;
                    break;
                case "AnimationLayer":
                    obj = new FbxAnimLayer();
                    break;
                case "AnimationCurve":
                    obj = new FbxAnimationCurve();
                    this._assignFlatData(obj, node);
                    var arr = [];
                    for (var j = 0; j < obj.KeyTime.length; ++j)
                        arr[j] = new FbxTime(obj.KeyTime[j]);
                    obj.KeyTime = arr;
                    break;
                case "AnimationCurveNode":
                    obj = new FbxAnimationCurveNode();
                    break;
                default:
                    // deal with some irrelevant nodes
                    obj = new FbxTrashNode();
            }

            if (obj) {
                var uid = node.data[0];
                obj.name = this._getObjectDefName(node);
                obj.UID = uid;

                if (this._templates[node.name])
                    obj.copyProperties(this._templates[node.name]);

                this._assignProperties(obj, node.getChildByName("Properties70"));

                this._objects[uid] = obj;
            }
        }
    },

    _processPose: function(objDef)
    {
        var pose = new FbxPose();
        pose.type = objDef.data[2];
        for (var i = 0; i < objDef.children.length; ++i) {
            var node = objDef.children[i];
            if (node.name === "PoseNode") {
                var poseNode = new FbxPoseNode();
                poseNode.targetUID = node.getChildByName("Node").data[0];
                poseNode.matrix = new HX.Matrix4x4(node.getChildByName("Matrix").data[0]);
                pose.poseNodes.push(poseNode);
            }
        }
        return pose;
    },

    _processConnections: function(definitions)
    {
        var len = definitions.children.length;
        for (var i = 0; i < len; ++i) {
            var node = definitions.children[i];
            var mode = node.data[0];
            var child = this._objects[node.data[1]];
            var parent = this._objects[node.data[2]] || this._rootNode;

            //console.log(child.toString(), node.data[1], " -> ", parent.toString(), node.data[2], node.data[3]);

            if (mode === "OO")
                parent.connectObject(child);
            else if (mode === "OP")
                parent.connectProperty(child, node.data[3]);
        }
    },

    _createNode: function(name, subclass)
    {
        if (name === "Material")
            return new FbxMaterial();

        if (HX[subclass]) return new HX[subclass];
    },

    _assignFlatData: function(target, node)
    {
        var len = node.children.length;
        for (var i = 0; i < len; ++i) {
            var prop = node.children[i];
            if (target.hasOwnProperty(prop.name)) {
                target[prop.name] = prop.data[0];
            }
        }
    },

    _assignProperties: function(target, properties)
    {
        if (!properties) return;

        var len = properties.children.length;
        for (var i = 0; i < len; ++i) {
            var prop = properties.children[i];
            if (target.hasOwnProperty(prop.data[0])) {
                target[prop.data[0]] = this._getPropertyValue(prop);
            }
        }
    },

    _getPropertyValue: function(prop)
    {
        var data = prop.data;
        switch (data[1]) {
            case "Vector3D":
            case "Lcl Translation":
            case "Lcl Scaling":
            case "Lcl Rotatfion":
                return new HX.Float4(data[4], data[5], data[6]);
            case "bool":
            case "Visibility":
            case "Visibility Inheritance":
                return data[4] !== 0;
            case "ColorRGB":
            case "Color":
                return new HX.Color(data[4], data[5], data[6]);
            case "enum":
            case "double":
            case "float":
            case "int":
            case "KString":
                return data[4];
            case "KTime":
                return new FbxTime(data[4]);
            case "object":
                return null;    // TODO: this will be connected using OP?
        }
    },

    _processGeometry: function(objDef)
    {
        var geometry = new FbxMesh();
        var len = objDef.children.length;
        var layerMap = {};

        for (var i = 0; i < len; ++i) {
            var child = objDef.children[i];
            switch (child.name) {
                case "Vertices":
                    geometry.vertices = child.data[0];
                    break;
                case "PolygonVertexIndex":
                    geometry.indices = child.data[0];
                    break;
                case "Layer":
                    geometry.layerElements = geometry.layerElements || {};
                    this._processLayer(child, layerMap, geometry.layerElements);
                    break;
                default:
                    if (!layerMap[child.name])
                        layerMap[child.name] = child;
                    break;
            }
        }
        return geometry;
    },

    _processLayer: function(objDef, layerMap, elements)
    {
        var len = objDef.children.length;
        for (var i = 0; i < len; ++i) {
            var layerElement = objDef.children[i];
            if (layerElement.name !== "LayerElement") continue;
            var name = layerElement.getChildByName("Type").data[0];
            // do not allow multiple sets
            if (!elements[layerElement.type]) {
                var layerElement = this._processLayerElement(layerMap[name]);
                elements[layerElement.type] = layerElement;
            }
        }
    },

    _processLayerElement: function(objDef)
    {
        var layerElement = new FbxLayerElement();
        var len = objDef.children.length;

        for (var i = 0; i < len; ++i) {
            var node = objDef.children[i];
            switch(node.name) {
                case "MappingInformationType":
                    var mapMode = node.data[0];
                    layerElement.mappingInformationType =   mapMode === "ByPolygonVertex"?  FbxLayerElement.MAPPING_TYPE.BY_POLYGON_VERTEX :
                                                            mapMode === "ByPolygon"?        FbxLayerElement.MAPPING_TYPE.BY_POLYGON :
                                                            mapMode === "AllSame"?          FbxLayerElement.MAPPING_TYPE.ALL_SAME :
                                                                                            FbxLayerElement.MAPPING_TYPE.BY_CONTROL_POINT;
                    break;
                case "ReferenceInformationType":
                    layerElement.referenceInformationType = node.data[0] === "Direct"? FbxLayerElement.REFERENCE_TYPE.DIRECT : FbxLayerElement.REFERENCE_TYPE.INDEX_TO_DIRECT;
                    break;
                case "Normals":
                case "Colors":
                case "UV":
                case "Smoothing":
                    layerElement.type = node.name;
                    layerElement.directData = node.data[0];
                    break;
                case "NormalsIndex":
                case "ColorIndex":
                case "UVIndex":
                case "SmoothingIndex":
                    layerElement.indexData = node.data[0];
                    break;
                case "Materials":
                    layerElement.type = node.name;
                    layerElement.indexData = node.data[0];
                    break;
            }
        }

        return layerElement;
    },

    _getObjectDefName: function(objDef)
    {
        return objDef.data[1].split(FBXGraphBuilder._STRING_DEMARCATION)[0];
    },

    _processCluster: function(objDef)
    {
        var cluster = new FbxCluster();
        var len = objDef.children.length;

        for (var i = 0; i < len; ++i) {
            var node = objDef.children[i];
            switch(node.name) {
                case "Transform":
                    cluster.transform = new HX.Matrix4x4(node.data[0]);
                    break;
                case "TransformLink":
                    cluster.transformLink = new HX.Matrix4x4(node.data[0]);
                    break;
                case "Indexes":
                    cluster.indices = node.data[0];
                    break;
                case "Weights":
                    cluster.weights = node.data[0];
                    break;
            }
        }

        return cluster;
    }
};

FBXGraphBuilder._STRING_DEMARCATION = String.fromCharCode(0, 1);

// Could also create an ASCII deserializer
function FBXAnimationConverter()
{
    this._skinningData = null;
    this._jointUIDLookUp = null;
    this._skeleton = null;
    this._fakeJointIndex = -1;
    this._animationClips = null;
    this._frameRate = 24;
}

FBXAnimationConverter.prototype =
{
    get skeleton()
    {
        return this._skeleton;
    },

    get animationClips()
    {
        return this._animationClips;
    },

    get fakeJointIndex()
    {
        return this._fakeJointIndex;
    },

    getJointBinding: function(ctrlPointIndex)
    {
        return this._skinningData[ctrlPointIndex];
    },

    convertSkin: function (fbxSkin, geometryMatrix)
    {
        this._skeleton = new HX.Skeleton();
        // skinning data contains a list of bindings per control point
        this._skinningData = [];
        this._jointUIDLookUp = {};

        var len = fbxSkin.clusters.length;

        for (var i = 0; i < len; ++i) {
            var cluster = fbxSkin.clusters[i];
            // a bit annoying, but this way, if there's multiple roots (by whatever chance), we cover them all
            this._addJointsToSkeleton(this._getRootNodeForCluster(cluster));
            var jointData = this._jointUIDLookUp[cluster.limbNode.UID];
            this._assignInverseBindPose(cluster, geometryMatrix, jointData.joint);
            this._assignJointBinding(cluster, jointData.index);
        }

        // var fakeJoint = new HX.SkeletonJoint();
        // this._fakeJointIndex = this._skeleton.numJoints;
        // this._skeleton.addJoint(fakeJoint);

        // are joint poses local perhaps?
        /*for (var i = this._skeleton.numJoints - 1; i >= 0; --i) {
            var joint = this._skeleton.getJoint(i);

            if (joint.parentIndex >= 0) {
                var parent = this._skeleton.getJoint(joint.parentIndex);
                joint.inverseBindPose.prepend(parent.inverseBindPose);
            }
        }*/

        for (var key in this._jointUIDLookUp) {
            this._jointUIDLookUp[key].fbxNode.data = null;
        }
    },

    convertClips: function(fbxAnimationStack, fbxMesh, geometryMatrix, settings)
    {
        this._frameRate = settings.frameRate;

        this._animationClips = [];

        // TODO: If multiple takes are supported, these would need to be separate clips as well
        for (var i = 0; i < fbxAnimationStack.layers.length; ++i) {
            var layers = fbxAnimationStack.layers;
            for (var j = 0; j < layers.length; ++j) {
                var clip = this._convertLayer(layers[j]);
                this._animationClips.push(clip);
            }
        }
    },

    _addJointsToSkeleton: function(rootNode)
    {
        // already added to the skeleton
        if (rootNode.data === true) return;
        rootNode.data = true;
        this._convertSkeletonNode(rootNode, -1);
    },

    _convertSkeletonNode: function(fbxNode, parentIndex)
    {
        var joint = new HX.SkeletonJoint();
        joint.parentIndex = parentIndex;

        var index = this._skeleton.numJoints;
        this._skeleton.addJoint(joint);

        this._jointUIDLookUp[fbxNode.UID] = { joint: joint, index: index, fbxNode: fbxNode };

        if (fbxNode.animationCurveNodes) {
            for (var key in fbxNode.animationCurveNodes) {
                if (fbxNode.animationCurveNodes.hasOwnProperty(key)) {
                    var node = fbxNode.animationCurveNodes[key];
                    // store the joint index as curve node data
                    node.data = index;
                }
            }
        }

        for (var i = 0; i < fbxNode.numChildren; ++i) {
            this._convertSkeletonNode(fbxNode.getChild(i), index);
        }
    },

    _assignJointBinding: function(cluster, jointIndex)
    {
        if (!cluster.indices) return;
        var len = cluster.indices.length;

        for (var i = 0; i < len; ++i) {
            if (cluster.weights[i] > 0) {
                var ctrlPointIndex = cluster.indices[i];
                var skinningData = this._skinningData[ctrlPointIndex] = this._skinningData[ctrlPointIndex] || [];
                var binding = new FBXModelInstanceConverter._JointBinding();
                binding.jointIndex = jointIndex;
                binding.jointWeight = cluster.weights[i];
                skinningData.push(binding);
            }
        }
    },

    _assignInverseBindPose: function (cluster, geometryMatrix, joint)
    {
        // looks like Unreal uses this, along with cluster's limbnode transform to deform vertices?
        // in that case, should be able to apply this to bind pose instead, since it boils down to the same thing?
        joint.inverseBindPose.copyFrom(cluster.transformLink);
        joint.inverseBindPose.invertAffine();
        joint.inverseBindPose.prependAffine(cluster.transform);
        joint.inverseBindPose.prependAffine(geometryMatrix);
        //joint.inverseBindPose.append(this._settings.orientationMatrix);
    },

    _getLimbGlobalMatrix: function(node)
    {
        if (!node._globalMatrix) {
            node._globalMatrix = new HX.Matrix4x4();
            if (node.parent && node.parent.type === "LimbNode") {
                var parentMatrix = this._getLimbGlobalMatrix(node.parent);
                node._globalMatrix.multiply(parentMatrix, node.matrix);
            }
            else {
                node._globalMatrix.copyFrom(node.matrix);
            }
        }
        return node._globalMatrix;
    },

    // this uses the logic that one of the clusters is bound to have the root node assigned to them
    // not sure if this is always the case, however
    _getRootNodeForCluster: function(cluster)
    {
        var limbNode = cluster.limbNode;
        while (limbNode) {
            if (limbNode.type !== "LimbNode")
                return limbNode;
            limbNode = limbNode.parent;
        }
        throw new Error("No Root node found!");
    },

    _convertLayer: function (layer)
    {
        var keyFrames = this._convertToFrames(layer);
        // this._completeKeyFrames(keyFrames);
        return this._convertToClip(keyFrames);
    },

    _convertToFrames: function(layer)
    {
        var curves = [];
        var numCurveNodes = layer.curveNodes.length;

        for (var i = 0; i < numCurveNodes; ++i) {
            var node = layer.curveNodes[i];
            for (var key in node.curves) {
                if (!node.curves.hasOwnProperty(key)) continue;
                var curve = node.curves[key];
                curves.push({frames: this._addCurveToKeyFrame(curve), node: node});
            }
        }

        return curves;
    },

    _addCurveToKeyFrame: function(curve)
    {
        // ms per frame
        var numKeyFrames = curve.KeyTime.length;
        var keyFrames = [];

        for (var i = 0; i < numKeyFrames; ++i) {
            var time = curve.KeyTime[i].milliseconds;
            var value = curve.KeyValueFloat[i];
            var keyFrame = new HX.KeyFrame(time, value);
            keyFrames.push(keyFrame);
        }

        return keyFrames;
    },

    _completeKeyFrames: function(curves) {
        var indices = [];

        var numCurves = curves.length;
        for (var i = 0; i < numCurves; ++i) {
            indices[i] = 0;
        }

        var finished = false;
        while (!finished) {
            var time = Number.POSITIVE_INFINITY;

            var activeCurve = i;
            for (i = 0; i < numCurves; ++i) {
                var frames = curves[i].frames;
                if (frames[indices[i]].time < time) {
                    time = frames[indices[i]].time;
                    activeCurve = i;
                }
            }

            // Interpolate given the current time
            for (i = 0; i < numCurves; ++i) {
                frames = curves[i].frames;
                // already have the data for this frame
                var index2 = indices[i];
                if (frames[index2].time === time) continue;
                var index1 = Math.max(indices[i] - 1, 0);
                var ratio = HX.MathX.linearStep(frames[index1].time, frames[index2].time, time);
                var value = HX.MathX.lerp(frames[index1].value, frames[index2].value, ratio);
                var frame = new HX.KeyFrame(time, value);
                // insert new frame
                frames.splice(index2, 0, frame);
            }

            // move each playhead to the next
            finished = true;
            for (i = 0; i < numCurves; ++i) {
                frames = curves[i].frames;
                if (frames[indices[i]].time <= time)
                    ++indices[i];

                // still some frames left
                if (indices[i] < frames.length)
                    finished = false;
            }
        }
    },

    _createTempJointPoses: function() {
        var tempJointPoses = [];
        var numJoints = this._skeleton.numJoints;

        // use local bind pose as default
        for (var i = 0; i < numJoints; ++i) {
            var joint = this._skeleton.getJoint(i);
            var localBind = joint.inverseBindPose.clone();
            localBind.invertAffine();

            // by default, use bind pose
            if (joint.parentIndex !== -1) {
                var parentInverse = this._skeleton.getJoint(joint.parentIndex).inverseBindPose;
                localBind.appendAffine(parentInverse);
            }

            var pose = new FBXAnimationConverter._JointPose();
            var transform = new HX.Transform();

            localBind.decompose(transform);

            pose["Lcl Translation"].copyFrom(transform.position);
            transform.rotation.toEuler(pose["Lcl Rotation"]);

            pose["Lcl Rotation"].x *= HX.MathX.RAD_TO_DEG;
            pose["Lcl Rotation"].y *= HX.MathX.RAD_TO_DEG;
            pose["Lcl Rotation"].z *= HX.MathX.RAD_TO_DEG;
            pose["Lcl Scaling"].copyFrom(transform.scale);

            tempJointPoses[i] = pose;
        }

        return tempJointPoses;
    },

    _applyCurvesForFrame: function(tempJointPoses, curves, frameIndex)
    {
        var numCurveNodes = curves.length;
        for (var i = 0; i < numCurveNodes; ++i) {
            var curve = curves[i];
            var frames = curve.frames;
            var node = curve.node;
            var jointIndex = node.data;

            // not a skeleton target?
            if (jointIndex === null) continue;

            var target = tempJointPoses[jointIndex][node.propertyName];

            for (var key in node.curves) {
                if (!node.curves.hasOwnProperty(key)) continue;
                var value = frames[frameIndex].value;

                switch (key) {
                    case "d|X":
                        target.x = value;
                        break;
                    case "d|Y":
                        target.y = value;
                        break;
                    case "d|Z":
                        target.z = value;
                        break;
                    default:
                        throw new Error("Unknown target " + key);
                }
            }
        }
    },

    _convertSkeletonPose: function(tempJointPoses)
    {
        var skeletonPose = new HX.SkeletonPose();
        var numJoints = this._skeleton.numJoints;
        for (var i = 0; i < numJoints; ++i) {
            var jointPose = new HX.SkeletonJointPose();

            var tempJointPose = tempJointPoses[i];
            jointPose.position.copyFrom(tempJointPose["Lcl Translation"]);
            // not supporting non-uniform scaling at this point
            jointPose.scale.copyFrom(tempJointPose["Lcl Scaling"]);
            var rot = tempJointPose["Lcl Rotation"];
            jointPose.rotation.fromEuler(rot.x * HX.MathX.DEG_TO_RAD, rot.y * HX.MathX.DEG_TO_RAD, rot.z * HX.MathX.DEG_TO_RAD);

            skeletonPose.setJointPose(i, jointPose);
        }
        return skeletonPose;
    },

    _convertToClip: function(curves) {
        var clip = new HX.AnimationClip();
        var numFrames = curves[0].frames.length;

        for (var f = 0; f < numFrames; ++f) {
            var time = curves[0].frames[f].time;

            var tempJointPoses = this._createTempJointPoses();
            this._applyCurvesForFrame(tempJointPoses, curves, f);

            var skeletonPose = this._convertSkeletonPose(tempJointPoses);

            skeletonPose.setJointPose(this._fakeJointIndex, new HX.SkeletonJointPose());

            clip.addKeyFrame(new HX.KeyFrame(time, skeletonPose));
        }

        return clip;
    }
};

FBXAnimationConverter._JointPose = function()
{
    this["Lcl Translation"] = new HX.Float4(0.0, 0.0, 0.0);
    this["Lcl Rotation"] = new HX.Float4(0.0, 0.0, 0.0);
    this["Lcl Scaling"] = new HX.Float4(1.0, 1.0, 1.0);
};

/**
 *
 * @constructor
 */
function FBXModelInstanceConverter()
{
    this._perMaterialData = null;
    this._expandedMesh = null;
    this._vertexStride = 0;
    this._ctrlPointLookUp = null;
    this._model = null;
    this._animationConverter = null;
    this._fakeJointIndex = -1;
    this._useSkinning = false;
}

FBXModelInstanceConverter.prototype =
{
    // to be called after convertToModel
    createModelInstance: function(materials)
    {
        var expandedMaterials = [];

        var len = this._modelMaterialIDs.length;
        for (var i = 0; i < len; ++i) {
            expandedMaterials[i] = materials[this._modelMaterialIDs[i]];
        }

        var modelInstance = new HX.ModelInstance(this._model, expandedMaterials);
        var clips = this._animationConverter.animationClips;
        if (clips) {
            var blendNode = new HX.SkeletonXFadeNode();
            for (i = 0; i < clips.length; ++i)
                blendNode.addClip(clips[i]);

            modelInstance.addComponent(new HX.SkeletonAnimation(blendNode));
            blendNode.fadeTo(clips[0], 0, false);
        }

        return modelInstance;
    },

    convertToModel: function(fbxMesh, fbxAnimationStack, geometryMatrix, settings)
    {
        this._perMaterialData = [];
        this._ctrlPointLookUp = [];
        this._modelMaterialIDs = [];
        this._useSkinning = false;

        this._model = new HX.Model();
        this._animationConverter = new FBXAnimationConverter();

        if (fbxMesh.deformers)
            this._generateSkinningData(fbxMesh, geometryMatrix);
        this._generateExpandedMeshData(fbxMesh, geometryMatrix);

        this._vertexStride = HX.Mesh.DEFAULT_VERTEX_SIZE;
        if (this._expandedMesh.hasColor)
            this._vertexStride += 3;

        this._splitPerMaterial();
        this._generateModel();
        if (fbxMesh.deformers)
            this._animationConverter.convertClips(fbxAnimationStack, fbxMesh, geometryMatrix, settings);
        this._model.name = fbxMesh.name;
    },

    _generateExpandedMeshData: function(fbxMesh, matrix)
    {
        this._expandedMesh = new FBXModelInstanceConverter._ExpandedMesh();
        var indexData = fbxMesh.indices;
        var vertexData = fbxMesh.vertices;
        var normalData, colorData, uvData, materialData;
        var layerElements = fbxMesh.layerElements;
        if (layerElements) {
            normalData = layerElements["Normals"];
            colorData = layerElements["Colors"];
            uvData = layerElements["UV"];
            materialData = layerElements["Materials"];
        }

        var vertices = [];
        var polyIndex = 0;
        var maxMaterialIndex = 0;

        if (normalData) this._expandedMesh.hasNormals = true;
        if (colorData) this._expandedMesh.hasColor = true;
        if (uvData) this._expandedMesh.hasUVs = true;

        var len = indexData.length;

        for (var i = 0; i < len; ++i) {
            var ctrlPointIndex = indexData[i];
            var v = new FBXModelInstanceConverter._Vertex();

            if (ctrlPointIndex < 0) {
                ctrlPointIndex = -ctrlPointIndex - 1;
                v.lastVertex = true;
            }

            v.pos.x = vertexData[ctrlPointIndex * 3];
            v.pos.y = vertexData[ctrlPointIndex * 3 + 1];
            v.pos.z = vertexData[ctrlPointIndex * 3 + 2];

            if (matrix)
                matrix.transformPoint(v.pos, v.pos);

            if (this._model.skeleton)
                v.jointBindings = this._animationConverter.getJointBinding(ctrlPointIndex);

            v.ctrlPointIndex = ctrlPointIndex;   // if these indices are different, they are probably triggered differerently in animations

            if (normalData) {
                v.normal = this._extractLayerData(normalData, ctrlPointIndex, i, 3);
                if (matrix)
                    matrix.transformVector(v.normal, v.normal);
            }
            if (colorData) v.color = this._extractLayerData(colorData, ctrlPointIndex, i, 3);
            if (uvData) v.uv = this._extractLayerData(uvData, ctrlPointIndex, i, 2);

            if (materialData && materialData.mappingInformationType !== FbxLayerElement.MAPPING_TYPE.ALL_SAME) {
                var matIndex = materialData.indexData[polyIndex];
                v.materialIndex = matIndex;
                if (matIndex > maxMaterialIndex)
                    maxMaterialIndex = matIndex;
            }

            if (v.lastVertex)
                ++polyIndex;

            vertices[i] = v;
        }

        this._expandedMesh.vertices = vertices;
        this._expandedMesh.numMaterials = maxMaterialIndex + 1;
    },

    _extractLayerData: function (layer, index, i, numComponents)
    {
        var target = numComponents > 2? new HX.Float4() : new HX.Float2();
        // direct
        if (layer.referenceInformationType === FbxLayerElement.REFERENCE_TYPE.DIRECT) {
            var directIndex = layer.mappingInformationType === FbxLayerElement.MAPPING_TYPE.BY_CONTROL_POINT? index : i;
            target.x = layer.directData[directIndex * numComponents];
            target.y = layer.directData[directIndex * numComponents + 1];
            if (numComponents > 2)
                target.z = layer.directData[directIndex * numComponents + 2];
        }
        // index to direct
        else {
            var directIndex = layer.mappingInformationType === FbxLayerElement.MAPPING_TYPE.BY_CONTROL_POINT? layer.indexData[index] : layer.indexData[i];
            target.x = layer.directData[directIndex * numComponents];
            target.y = layer.directData[directIndex * numComponents + 1];
            if (numComponents > 2)
                target.z = layer.directData[directIndex * numComponents + 2];
        }
        return target;
    },

    _splitPerMaterial: function()
    {
        for (var i = 0; i < this._expandedMesh.numMaterials; ++i)
            this._perMaterialData[i] = new FBXModelInstanceConverter._PerMaterialData();

        // todo: change this expansion
        var i = 0, j = 0;
        var vertexData = this._expandedMesh.vertices;
        var len = vertexData.length;
        var realIndex0, realIndex1, realIndex2;
        var startNewBatch = true;

        // triangulate
        while (i < len) {
            var data = this._perMaterialData[vertexData[i].materialIndex];
            if (!data.vertices) startNewBatch = true;
            // start as startNewBatch, so we push the current list on the stack
            if (startNewBatch) {
                startNewBatch = false;
                data.indexCounter = 0;
                data.indices = [];
                data.vertices = [];
                data.ctrlPointIndices = [];
                data.indexLookUp = {};
                data.indexStack.push(data.indices);
                data.vertexStack.push(data.vertices);
                data.ctrlPointStack.push(data.ctrlPointIndices);

                if (this._useSkinning) {
                    data.skinning = [];
                    data.skinningStack.push(data.skinning);
                }
            }

            // for everything: i = control point index

            realIndex0 = this._getOrAddIndex(vertexData[i]);
            if (realIndex0 < 0) {
                startNewBatch = true;
                continue;
            }
            realIndex1 = this._getOrAddIndex(vertexData[i + 1]);
            if (realIndex1 < 0) {
                startNewBatch = true;
                continue;
            }

            i += 2;

            var v2;

            do {
                v2 = vertexData[i];
                realIndex2 = this._getOrAddIndex(v2);

                if (realIndex2 < 0) {
                    startNewBatch = true;
                }
                else {
                    ++i;

                    var indices = this._perMaterialData[v2.materialIndex].indices;
                    indices[j] = realIndex0;
                    indices[j + 1] = realIndex1;
                    indices[j + 2] = realIndex2;

                    j += 3;
                    realIndex1 = realIndex2;
                }
            } while (!v2.lastVertex && !startNewBatch);
        }
    },

    // returns negative if overflow is detected
    _getOrAddIndex: function(v)
    {
        var hash = v.getHash();
        var data = this._perMaterialData[v.materialIndex];
        var indexLookUp = data.indexLookUp;

        if (indexLookUp.hasOwnProperty(hash))
            return indexLookUp[hash];

        if (data.indexCounter > 65535) return -1;

        var skinning = data.skinning;
        var vertices = data.vertices;
        var realIndex = data.indexCounter++;
        // new unique vertex!
        var k = realIndex * this._vertexStride;
        var s = realIndex * 8;

        data.ctrlPointIndices[v.ctrlPointIndex] = realIndex;

        indexLookUp[hash] = realIndex;

        // position
        vertices[k] = v.pos.x;
        vertices[k + 1] = v.pos.y;
        vertices[k + 2] = v.pos.z;

        if (skinning) {
            var binding = v.jointBindings;
            var numJoints = binding? binding.length : 0;
            if (numJoints > 4) {
                numJoints = 4;
                console.warn("Warning: more than 4 joints not supported. Model will not animate correctly");

                // make sure we discard the least important ones
                binding.sort(function(a, b) { return b.jointWeight - a.jointWeight; });
            }

            var w = 0.0;
            for (var i = 0; i < numJoints; ++i) {
                var weight = binding[i].jointWeight;
                skinning[s + i] = binding[i].jointIndex;
                skinning[s + i + 4] = weight;
                w += weight;
            }

            // need to fill up with ever-static joint
            w = w >= 1.0? 0.0 : 1.0 - w;

            for (var i = numJoints; i < 4; ++i) {
                skinning[s + i] = this._fakeJointIndex;
                skinning[s + i + 4] = i === numJoints? w : 0.0;
            }
        }

        // normal
        if (this._expandedMesh.hasNormals) {
            vertices[k + 3] = v.normal.x;
            vertices[k + 4] = v.normal.y;
            vertices[k + 5] = v.normal.z;
        }
        else
            vertices[k + 3] = vertices[k + 4] = vertices[k + 5] = 0;

        // tangent & flipsign
        vertices[k + 6] = vertices[k + 7] = vertices[k + 8] = vertices[k + 9] = 0;

        if (this._expandedMesh.hasUVs) {
            vertices[k + 10] = v.uv.x;
            vertices[k + 11] = v.uv.y;
        }
        else
            vertices[k + 10] = vertices[k + 11] = 0;

        if (this._expandedMesh.hasColor) {
            vertices[k + 12] = v.color.x;
            vertices[k + 13] = v.color.y;
            vertices[k + 14] = v.color.z;
        }

        return realIndex;
    },

    _generateModel: function()
    {
        var meshIndex = 0;

        var numMaterials = this._expandedMesh.numMaterials;

        for (var i = 0; i < numMaterials; ++i) {
            var data = this._perMaterialData[i];

            var stackSize = data.indexStack.length;
            for (var j = 0; j < stackSize; ++j) {
                var mesh = HX.Mesh.createDefaultEmpty();
                if (this._expandedMesh.hasColor) mesh.addVertexAttribute("hx_vertexColor", 3);

                mesh.setVertexData(data.vertexStack[j], 0);
                mesh.setIndexData(data.indexStack[j]);

                if (this._useSkinning) {
                    mesh.addVertexAttribute("hx_jointIndices", 4, 1);
                    mesh.addVertexAttribute("hx_jointWeights", 4, 1);
                    mesh.setVertexData(data.skinningStack[j], 1);
                }

                var ctrlPoints = data.ctrlPointStack[j];
                var numCtrlPoints = ctrlPoints.length;

                for (var k = 0; k < numCtrlPoints; ++k)
                    this._ctrlPointLookUp[ctrlPoints[k]] = {index: k, meshIndex: meshIndex};

                ++meshIndex;

                this._modelMaterialIDs.push(i);

                var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
                if (!this._expandedMesh.hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
                var generator = new HX.NormalTangentGenerator();
                generator.generate(mesh, mode);
                this._model.addMesh(mesh);
            }
        }
    },

    _generateSkinningData: function(fbxMesh, geometryMatrix)
    {
        var len = fbxMesh.deformers.length;
        if (len === 0) return;
        if (len > 1) throw new Error("Multiple skins not supported");

        this._animationConverter.convertSkin(fbxMesh.deformers[0], geometryMatrix);
        this._model.skeleton = this._animationConverter.skeleton;
        this._useSkinning = true;
    }
};

FBXModelInstanceConverter._ExpandedMesh = function()
{
    this.vertices = null;
    this.hasColor = false;
    this.hasUVs = false;
    this.hasNormals = false;
    this.numMaterials = 0;
};

FBXModelInstanceConverter._JointBinding = function()
{
    this.jointIndex = 0;
    this.jointWeight = 0;
};

FBXModelInstanceConverter._Vertex = function()
{
    this.pos = new HX.Float4();
    this.uv = null;
    this.normal = null;
    this.color = null;
    this.materialIndex = 0;
    this.ctrlPointIndex = -1;
    this.jointBindings = null;   // array of JointBindings
    this._hash = null;
    this.lastVertex = false;
};

FBXModelInstanceConverter._Vertex.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash) {
            var str = this.ctrlPointIndex + "/" + this.materialIndex + "/" + this.pos.x + "/" + this.pos.y + "/" + this.pos.z;

            if (this.normal)
                str += "/" + this.normal.x + "/" + this.normal.y + "/" + this.normal.z;

            if (this.uv)
                str += "/" + this.uv.x + "/" + this.uv.y;

            if (this.color)
                str += "/" + this.color.x + "/" + this.color.y + "/" + this.color.z;

            this._hash = str;
        }

        return this._hash;
    }
};

FBXModelInstanceConverter._PerMaterialData = function()
{
    this.indexCounter = 0;
    this.vertexStack = [];
    this.skinningStack = [];
    this.indexStack = [];
    this.ctrlPointStack = [];
    this.vertices = null;
    this.indices = null;
    this.skinning = null;
    this.ctrlPointIndices = null;
    this.indexLookUp = {};
};

// Could also create an ASCII deserializer
function FBXConverter()
{
    this._settings = null;
    this._objects = null;
    this._textureTokens = null;
    this._textureMaterialMap = null;
    this._rootNode = null;
}

FBXConverter.prototype =
{
    get textureTokens() { return this._textureTokens; },
    get textureMaterialMap() { return this._textureMaterialMap; },

    convert: function(rootNode, animationStack, target, settings)
    {
        this._settings = settings;
        this._objects = [];
        this._textureTokens = [];
        this._textureMaterialMap = [];
        this._rootNode = rootNode;
        this._animationStack = animationStack;
        this._convertSceneNode(rootNode, target);
    },

    // handles object of type FbxNode
    _convertNode: function(fbxNode)
    {
        var hxNode;

        if (fbxNode.mesh)
            hxNode = this._convertModelMesh(fbxNode);
        else if (fbxNode.children && fbxNode.children.length > 1) {
            hxNode = new HX.SceneNode();
            this._convertSceneNode(fbxNode, hxNode);
        }
        else return null;

        hxNode.name = fbxNode.name;

        this._convertSceneGraphObject(fbxNode, hxNode);

        // TODO: handle lights, cameras, etc
        return hxNode;
    },

    _convertSceneNode: function(fbxNode, hxNode)
    {
        var len = fbxNode.children.length;
        for (var i = 0; i < len; ++i) {
            var childNode = this._convertNode(fbxNode.children[i]);
            if (childNode)
                hxNode.attach(childNode);
        }
    },

    _convertModelMesh: function(fbxNode)
    {
        var modelConverter = this._convertGeometry(fbxNode.mesh, fbxNode.geometryTransform);

        var materials = [];

        if (fbxNode.materials) {
            var numMaterials = fbxNode.materials.length;
            for (var i = 0; i < numMaterials; ++i) {
                materials[i] = this._convertMaterial(fbxNode.materials[i]);
            }
        }
        else {
            materials.push(new HX.BasicMaterial());
        }

        return modelConverter.createModelInstance(materials);
    },

    _convertSceneGraphObject: function(fbxNode, hxNode)
    {
        hxNode.matrix = fbxNode.matrix;
    },

    _convertGeometry: function(node, geometryMatrix)
    {
        if (this._objects[node.UID]) return this._objects[node.UID];

        var converter = new FBXModelInstanceConverter();
        converter.convertToModel(node, this._animationStack, geometryMatrix, this._settings);

        this._objects[node.UID] = converter;
        return converter;
    },

    _convertMaterial: function(fbxMaterial)
    {
        if (this._objects[fbxMaterial.UID]) return this._objects[fbxMaterial.UID];

        var hxMaterial = new HX.BasicMaterial();
        hxMaterial.name = fbxMaterial.name;
        if (fbxMaterial.DiffuseColor) hxMaterial.color = fbxMaterial.DiffuseColor;
        if (fbxMaterial.Shininess) fbxMaterial.ShininessExponent = fbxMaterial.Shininess;
        if (fbxMaterial.ShininessExponent) hxMaterial.roughness = HX.BasicMaterial.roughnessFromShininess(fbxMaterial.Shininess);

        if (fbxMaterial.textures) {
            if (fbxMaterial.textures["NormalMap"])
                this._convertTexture(fbxMaterial.textures["NormalMap"], hxMaterial, FBXConverter._TextureToken.NORMAL_MAP);

            // We don't support specular color, instead hijack as roughness
            if (fbxMaterial.textures["SpecularColor"])
                this._convertTexture(fbxMaterial.textures["SpecularColor"], hxMaterial, FBXConverter._TextureToken.SPECULAR_MAP);

            if (fbxMaterial.textures["DiffuseColor"])
                this._convertTexture(fbxMaterial.textures["DiffuseColor"], hxMaterial, FBXConverter._TextureToken.DIFFUSE_MAP);
        }

        this._objects[fbxMaterial.UID] = hxMaterial;
        return hxMaterial;
    },

    _convertTexture: function(fbxTexture, hxMaterial, mapType)
    {
        var token;
        if (this._objects[fbxTexture.UID]) {
            token = this._objects[fbxTexture.UID];
        }
        else {
            token = new FBXConverter._TextureToken();
            token.name = fbxTexture.name;
            token.mapType = mapType;
            token.filename = fbxTexture.relativeFilename ? fbxTexture.relativeFilename : fbxTexture.video.relativeFilename;
            this._textureTokens.push(token);
            this._objects[fbxTexture.UID] = token;
        }

        var mapping = new FBXConverter._TextureMaterialMapping(hxMaterial, token, mapType);
        this._textureMaterialMap.push(mapping);
    }
};

FBXConverter._TextureMaterialMapping = function(material, token, mapType)
{
    this.material = material;
    this.token = token;
    this.mapType = mapType;
};

FBXConverter._TextureToken = function()
{
    this.filename = null;
    this.name = null;
    this.UID = null;
};

FBXConverter._TextureToken.NORMAL_MAP = 0;
FBXConverter._TextureToken.SPECULAR_MAP = 1;
FBXConverter._TextureToken.DIFFUSE_MAP = 2;

// Could also create an ASCII deserializer
function FBXSettings()
{
    this._matrix = new HX.Matrix4x4();
    this._frameRate = 24;
    // start with indentity matrix
    // SWAP column[up axis index] with column[1]
    // SWAP column[front axis index] with column[2
    // multiply respective columns with signs
}

FBXSettings.prototype =
{
    get orientationMatrix() { return this._matrix; },
    get frameRate() { return this._frameRate; },

    init: function(rootRecord)
    {
        var upAxisIndex = 1;
        var upAxisSign = 1;
        var frontAxisIndex = 2;
        var frontAxisSign = 1;
        var global = rootRecord.getChildByName("GlobalSettings");
        var props = global.getChildByName("Properties70");
        var len = props.children.length;
        var keyFrames = [ 0, 120, 100, 60, 50, 48, 30 ];

        for (var i = 0; i < len; ++i) {
            var p = props.children[i];
            switch (p.data[0]) {
                case "UpAxis":
                    upAxisIndex = p.data[4];
                    break;
                case "UpAxisSign":
                    upAxisSign = p.data[4];
                    break;
                case "FrontAxis":
                    frontAxisIndex = p.data[4];
                    break;
                case "FrontAxisSign":
                    frontAxisSign = p.data[4];
                    break;
                case "TimeMode":
                    if (keyFrames[p.data[4]])
                        this._frameRate = keyFrames[p.data[4]];
                    break;
            }
        }

        var axes = [ HX.Float4.X_AXIS, HX.Float4.Y_AXIS, HX.Float4.Z_AXIS ];
        var fwd = axes[frontAxisIndex].clone();
        var up = axes[upAxisIndex].clone();
        fwd.scale(frontAxisSign);
        up.scale(upAxisSign);
        this._matrix.lookAt(fwd, HX.Float4.ORIGIN_POINT, up);
        this._matrix.invert();
    }
};

/**
 * @classdesc
 * FBX is an importer for Autodesk FBX files. Animations are currently broken.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FBX()
{
    HX$1.Importer.call(this, HX$1.SceneNode, HX$1.Importer.TYPE_BINARY);
    this._rootNode = null;
}

FBX.prototype = Object.create(HX$1.Importer.prototype);

FBX.prototype.parse = function(data, target)
{
    var stream = new HX$1.DataStream(data);

    var deserializer = new FBXBinaryDeserializer();
    var fbxGraphBuilder = new FBXGraphBuilder();
    var fbxSceneConverter = new FBXConverter();
    var settings = new FBXSettings();

    try {
        var newTime, time = Date.now();

        var record = deserializer.deserialize(stream);

        newTime = Date.now();
        console.log("Serialization: " + (newTime - time));
        time = newTime;

        settings.init(record);

        if (deserializer.version < 7000) throw new Error("Unsupported FBX version!");
        fbxGraphBuilder.build(record, settings);

        newTime = Date.now();
        console.log("Graph building: " + (newTime - time));
        time = newTime;

        fbxSceneConverter.convert(fbxGraphBuilder.sceneRoot, fbxGraphBuilder.animationStack, target, settings);

        newTime = Date.now();
        console.log("Conversion: " + (newTime - time));
    }
    catch(err) {
        console.log(err.stack);
        this._notifyFailure(err.message);
        return;
    }

    if (fbxSceneConverter.textureTokens.length > 0) {
        this._loadTextures(fbxSceneConverter.textureTokens, fbxSceneConverter.textureMaterialMap, target);
    }
    else
        this._notifyComplete(target);
};

FBX.prototype._loadTextures = function(tokens, map, target)
{
    var numTextures = tokens.length;

    this._textureLibrary = new HX$1.AssetLibrary(null, this.options.crossOrigin);
    this._textureLibrary.fileMap = this.fileMap;

    for (var i = 0; i < numTextures; ++i) {
        var token = tokens[i];
        token.filename = this._correctURL(token.filename);
        this._textureLibrary.queueAsset(token.filename, token.filename, HX$1.AssetLibrary.Type.ASSET, HX$1.JPG);
    }

    // bulkLoader.onFail = function(message)
    // {
    //     self._notifyFailure(message);
    // };

    this._textureLibrary.onComplete.bind(function()
    {
        var numMappings = map.length;
        for (var i = 0; i < numMappings; ++i) {
            var mapping = map[i];
            var token = mapping.token;
            var texture = this._textureLibrary.get(token.filename);
            texture.name = token.name;

            switch (mapping.mapType) {
                case FBXConverter._TextureToken.NORMAL_MAP:
                    mapping.material.normalMap = texture;
                    break;
                case FBXConverter._TextureToken.SPECULAR_MAP:
                    mapping.material.specularMap = texture;
                    break;
                case FBXConverter._TextureToken.DIFFUSE_MAP:
                    mapping.material.colorMap = texture;
                    break;
            }
        }
        this._notifyComplete(target);
    }, this);

    this._textureLibrary.load();
};

// Note: this is not in core because no exporter or stream output functionality is not essential to rendering

/**
 * @classdesc
 * DataOutputStream is a wrapper for DataView which allows writing the data as a linear stream of data.
 * @param dataView the DataView object to write to.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DataOutputStream(dataView)
{
    this._dataView = dataView;
    this._offset = 0;
    this._endian = DataOutputStream.LITTLE_ENDIAN;
}

/**
 * Little Endian encoding
 */
DataOutputStream.LITTLE_ENDIAN = true;

/**
 * Big Endian encoding
 */
DataOutputStream.BIG_ENDIAN = false;

DataOutputStream.prototype = {
    /**
     * The current byte offset into the file.
     */
    get offset() { return this._offset; },
    set offset(value) { this._offset = value; },

    /**
     * The endianness used by the data.
     */
    get endian() { return this._endian; },
    set endian(value) { this._endian = value; },

    /**
     * The size of the data view in bytes.
     */
    get byteLength () { return this._dataView.byteLength; },

    /**
     * The amount of bytes still left in the file until EOF.
     */
    get bytesAvailable() { return this._dataView.byteLength - this._offset; },

    writeChar: function(v)
    {
        return this.writeUint8(v.charCodeAt(0));
    },

    writeUint8: function(v)
    {
        return this._dataView.setUint8(this._offset++, v);
    },

    writeUint16: function(v)
    {
        var data = this._dataView.setUint16(this._offset, v, this._endian);
        this._offset += 2;
        return data;
    },

    writeUint32: function(v)
    {
        var data = this._dataView.setUint32(this._offset, v, this._endian);
        this._offset += 4;
        return data;
    },

    writeInt8: function(v)
    {
        return this._dataView.setInt8(this._offset++, v);
    },

    writeInt16: function(v)
    {
        var data = this._dataView.setInt16(this._offset, v, this._endian);
        this._offset += 2;
        return data;
    },

    writeInt32: function(v)
    {
        var data = this._dataView.setInt32(this._offset, v, this._endian);
        this._offset += 4;
        return data;
    },

    writeFloat32: function(v)
    {
        var data = this._dataView.setFloat32(this._offset, v, this._endian);
        this._offset += 4;
        return data;
    },

    writeFloat64: function(v)
    {
        var data = this._dataView.setFloat64(this._offset, v, this._endian);
        this._offset += 8;
        return data;
    },

    writeString: function(v)
    {
        var len = v.length;
        for (var i = 0; i < len; ++i)
            this.writeUint8(v.charCodeAt(i));
    },

    writeUint8Array: function(v)
    {
        this._writeArray(v, this.writeUint8);
    },

    writeUint16Array: function(v)
    {
        this._writeArray(v, this.writeUint16);
    },

    writeUint32Array: function(v)
    {
        this._writeArray(v, this.writeUint32);
    },

    // I'm actually not sure why JS cares about whether or not the value is signed when writing...

    writeInt8Array: function(v)
    {
        this._writeArray(v, this.writeInt8);
    },

    writeInt16Array: function(v)
    {
        this._writeArray(v, this.writeInt16);
    },

    writeInt32Array: function(v)
    {
        this._writeArray(v, this.writeInt32);
    },

    writeFloat32Array: function(v)
    {
        this._writeArray(v, this.writeFloat32);
    },

    writeFloat64Array: function(v)
    {
        this._writeArray(v, this.writeFloat64);
    },

    /**
     * @ignore
     */
    _writeArray: function(val, func)
    {
        var len = val.length;
        for (var i = 0; i < len; ++i)
            func.call(this, val[i]);
    }
};

/**
 * @classdesc
 * AnimationClipExporter exports to Helix's own .hclip format.
 *
 * File format:
 *
 * <HEADER>
 * file hash "HX_ANIM" as string (7 bytes)
 * version data: 3 unsigned shorts (major, minor, patch)
 * unsigned byte: valueType (1 = SkeletonPose)
 * unsigned int: numFrames
 *
 * <valueType dependent data>
 *     SkeletonPose:
 *      - unsigned byte: numJoints
 *
 * <FRAMES> #numFrames block of data
 *     unsigned int: time (ms)
 *     any data[varying]: depends on value-type, for SkeletonPose: numJoints triplets of float3, float4, float3 for
 *     translation (3 floats), rotation (4 floats), scale (3 floats).
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationClipExporter()
{

}

AnimationClipExporter.VERSION = "0.1.0";

AnimationClipExporter.VALUE_TYPE_SKELETON_POSE = 1;
AnimationClipExporter.VALUE_TYPE_NUMBER = 2;
AnimationClipExporter.VALUE_TYPE_FLOAT3 = 3;
AnimationClipExporter.VALUE_TYPE_QUATERNION = 4;

AnimationClipExporter.prototype =
{
    // returns an ArrayBuffer object
    // TODO: support layered animations in some way
    export: function(clip)
    {
        var valueType = this._getValueType(clip);
        var size = this._calculateFileSize(clip, valueType);
        var buffer = new ArrayBuffer(size);
        var dataView = new DataView(buffer);
        var dataStream = new DataOutputStream(dataView);

        var version = AnimationClipExporter.VERSION.split(".");
        dataStream.writeString("HX_CLIP");
        dataStream.writeUint16Array(version);

        dataStream.writeUint8(valueType);

        var numFrames = clip.numKeyFrames;
        dataStream.writeUint32(numFrames);

        if (valueType === AnimationClipExporter.VALUE_TYPE_SKELETON_POSE) {
            var keyFrame = clip.getKeyFrame(0);
            var value = keyFrame.value;
            dataStream.writeUint8(value.numJoints);
        }
        else {
            // reserve some data for the future
            dataStream.writeUint8(0);
        }

        for (var i = 0; i < numFrames; ++i) {
            var keyFrame = clip.getKeyFrame(i);
            dataStream.writeUint32(keyFrame.time);
            this._writeValue(dataStream, valueType, keyFrame.value);
        }

        return buffer;
    },

    _getValueType: function(clip)
    {
        var keyFrame = clip.getKeyFrame(0);
        var value = keyFrame.value;

        if (value instanceof HX.SkeletonPose)
            return AnimationClipExporter.VALUE_TYPE_SKELETON_POSE;
        if (value instanceof HX.Float4)
            return AnimationClipExporter.VALUE_TYPE_FLOAT3;
        if (value instanceof HX.Quaternion)
            return AnimationClipExporter.VALUE_TYPE_QUATERNION;
        if (typeof value === "number")
            return AnimationClipExporter.VALUE_TYPE_NUMBER;


        throw new Error("Unsupported animation clip");
    },

    _writeValue: function(dataStream, type, value)
    {
        if (type === AnimationClipExporter.VALUE_TYPE_SKELETON_POSE) {
            var len = value.numJoints;
            for (var i = 0; i < len; ++i) {
                var pose = value.getJointPose(i);
                dataStream.writeFloat32(pose.position.x);
                dataStream.writeFloat32(pose.position.y);
                dataStream.writeFloat32(pose.position.z);
                dataStream.writeFloat32(pose.rotation.x);
                dataStream.writeFloat32(pose.rotation.y);
                dataStream.writeFloat32(pose.rotation.z);
                dataStream.writeFloat32(pose.rotation.w);
                dataStream.writeFloat32(pose.scale.x);
                dataStream.writeFloat32(pose.scale.y);
                dataStream.writeFloat32(pose.scale.z);
            }
        }
        else if (type === AnimationClipExporter.VALUE_TYPE_FLOAT3) {
            dataStream.writeFloat32(value.x);
            dataStream.writeFloat32(value.y);
            dataStream.writeFloat32(value.z);
        }
        else if (type === AnimationClipExporter.VALUE_TYPE_QUATERNION) {
            dataStream.writeFloat32(value.x);
            dataStream.writeFloat32(value.y);
            dataStream.writeFloat32(value.z);
            dataStream.writeFloat32(value.w);
        }
        else if (type === AnimationClipExporter.VALUE_TYPE_NUMBER) {
            dataStream.writeFloat32(value);
        }
    },

    _calculateFileSize: function(clip, valueType)
    {
        var size = 7;   // hash "HX_CLIP"
        size += 2 * 3;  // version (3 shorts)
        size += 1;      // value type
        size += 4;      // numFrames
        size += 1;      // meta

        var keyFrameSize = this._calculateKeyFrameSize(valueType, clip);
        size += clip.numKeyFrames * keyFrameSize;
        return size;
    },

    _calculateKeyFrameSize: function(type, clip)
    {
        var size = 4;   // time;

        if (type === AnimationClipExporter.VALUE_TYPE_SKELETON_POSE) {
            var numJoints = clip.getKeyFrame(0).value.numJoints;
            size += numJoints * 10 * 4;     // 10 floats per joint
        }
        else if (type === AnimationClipExporter.VALUE_TYPE_FLOAT3)
            size += 3 * 4;  // 3 floats
        else if (type === AnimationClipExporter.VALUE_TYPE_QUATERNION)
            size += 4 * 4;  // 4 floats
        else if (type === AnimationClipExporter.VALUE_TYPE_NUMBER)
            size += 4;      // 1 float
        return size;
    }
};

/**
 * @classdesc
 * ModelExporter exports to Helix's own .hmodel format.
 *
 * File format:
 *
 * <HEADER>
 * file hash "HX_MODEL" as string (8 bytes)
 * version data: 3 unsigned shorts (major, minor, patch)
 * unsigned short: numMeshes
 *
 * <MESH DATA> : #numMeshes blocks of mesh definitions
 * unsigned int: numIndices
 * unsigned byte: index size (16 or 32)
 * unsigned short/int[numIndices] (depending on index size): face indices
 * unsigned int: numVertices
 * unsigned byte: numAttributes
 *
 *      <ATTRIBUTE DATA> #numAttributes blocks of vertex attributes
 *          unsigned byte: nameLength
 *          char[nameLength]: name (hx_position etc) of length nameLength
 *          unsigned byte: stream index
 *          unsigned byte: numComponents
 *
 * unsigned byte: numStreams (redundant, but much easier to parse)
 *      <STREAM DATA>    #max(stream index)
 *          unsigned int: length (redundant, but much easier to parse)
 *          float[length]: vertex data
 *
 * <SKELETON DATA>:
 * numJoints: unsigned byte (if 0, there's no skeleton)
 *
 *      <JOINT DATA> #numJoints
 *      unsigned byte: nameLength (can be 0)
 *      char[nameLength]: name
 *      parentIndex: unsigned byte   (0xff is to be interpreted as -1)
 *      float[16]: inverseBindPose
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ModelExporter()
{

}

ModelExporter.VERSION = "0.1.0";

ModelExporter.prototype =
{
    // returns an ArrayBuffer object
    export: function(model)
    {
        var size = this._calculateFileSize(model);
        var buffer = new ArrayBuffer(size);
        var dataView = new DataView(buffer);
        var dataStream = new DataOutputStream(dataView);

        var version = ModelExporter.VERSION.split(".");
        dataStream.writeString("HX_MODEL");
        dataStream.writeUint16Array(version);

        var numMeshes = model.numMeshes;

        dataStream.writeUint16(numMeshes);

        for (var i = 0; i < numMeshes; ++i)
            this._writeMeshData(dataStream, model.getMesh(i));

        this._writeSkeleton(dataStream, model.skeleton);

        return buffer;
    },

    _writeMeshData: function(dataStream, mesh)
    {
        dataStream.writeUint32(mesh.numIndices);

        if (mesh._indexType === HX.DataType.UNSIGNED_INT) {
            dataStream.writeUint8(32);
            dataStream.writeUint32Array(mesh.getIndexData());
        }
        else {
            dataStream.writeUint8(16);
            dataStream.writeUint16Array(mesh.getIndexData());
        }

        dataStream.writeUint32(mesh.numVertices);
        dataStream.writeUint8(mesh.numVertexAttributes);

        for (var j = 0; j < mesh.numVertexAttributes; ++j) {
            var attrib = mesh.getVertexAttributeByIndex(j);
            dataStream.writeUint8(attrib.name.length);
            dataStream.writeString(attrib.name);
            dataStream.writeUint8(attrib.streamIndex);
            dataStream.writeUint8(attrib.numComponents);
        }

        dataStream.writeUint8(mesh.numStreams);
        for (j = 0; j < mesh.numStreams; ++j) {
            var data = mesh.getVertexData(j);
            dataStream.writeUint32(data.length);
            dataStream.writeFloat32Array(data);
        }
    },

    _writeSkeleton: function(dataStream, skeleton)
    {
        var numJoints = skeleton? skeleton.numJoints : 0;

        dataStream.writeUint8(numJoints);

        for (var i = 0; i < numJoints; ++i) {
            var joint = skeleton.getJoint(i);
            if (joint.name) {
                dataStream.writeUint8(joint.name.length);
                dataStream.writeString(joint.name);
            }
            else {
                dataStream.writeUint8(0);
            }
            dataStream.writeUint8(joint.parentIndex === -1? 0xff : joint.parentIndex);
            dataStream.writeFloat32Array(joint.inverseBindPose._m);
        }
    },

    _calculateFileSize: function(model)
    {
        var size = 8;   // hash "HX_MODEL"
        size += 2 * 3;  // version (3 shorts)
        size += 2;      // numMeshes

        var numMeshes = model.numMeshes;
        for (var i = 0; i < numMeshes; ++i) {
            var mesh = model.getMesh(i);
            size += 4; // numIndices
            size += 1; // index size
            var indexSize;
            if (mesh._indexType === HX.DataType.UNSIGNED_INT)
                indexSize = 4;
            else
                indexSize = 2;

            size += indexSize * mesh.numIndices;    // indices
            size += 4;  // numVertices (int in case of int index type)
            size += 1;  // numAttributes

            for (var j = 0; j < mesh.numVertexAttributes; ++j) {
                var attrib = mesh.getVertexAttributeByIndex(j);
                size += 1;      // nameLength
                size += attrib.name.length; // name
                size += 1;  // stream index
                size += 1;  // num components
            }

            size += 1;  // num streams

            for (j = 0; j < mesh.numStreams; ++j) {
                size += 4;  // stream length
                size += 4 * mesh.getVertexData(j).length;   // float per data element
            }
        }

        size += 1;  // numJoints
        var numJoints = model.skeleton? model.skeleton.numJoints : 0;

        for (i = 0; i < numJoints; ++i) {
            var joint = model.skeleton.getJoint(i);
            size += 1;  // name length
            size += joint.name? joint.name.length : 0;  // name
            size += 1; // parentIndex
            size += 16 * 4; // inverseBindPose
        }
        return size;
    }
};

// could we make things switchable based on a config file, so people can generate a file with only the importers they
// need?

exports.GLTF = GLTF;
exports.GLTFData = GLTFData;
exports.MD5Mesh = MD5Mesh;
exports.MD5Anim = MD5Anim;
exports.OBJ = OBJ;
exports.MTL = MTL;
exports.FBX = FBX;
exports.AnimationClipExporter = AnimationClipExporter;
exports.ModelExporter = ModelExporter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
