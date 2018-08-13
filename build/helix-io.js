(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('helix')) :
	typeof define === 'function' && define.amd ? define('HX', ['exports', 'helix'], factory) :
	(factory((global.HX = global.HX || {}),global.HX));
}(this, (function (exports,HX$1) { 'use strict';

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
     * The loaded entities (these are "nodes" containing a "mesh" in GLTF).
     */
    this.entities = {};

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
    this._entities = [];
    for (var i = 0; i < meshDefs.length; ++i) {
        var meshDef = meshDefs[i];
		var entity = new HX$1.Entity();

        for (var j = 0; j < meshDef.primitives.length; ++j) {
            var primDef = meshDef.primitives[j];
            this._parsePrimitive(primDef, entity);
            if (meshDef.weights) {
                this._parseMorphWeights(meshDef.weights, entity);
            }
        }

		entity.name = meshDef.name;

        this._entities[i] = entity;
    }
};

GLTF.prototype._parseMorphWeights = function(morphWeights, entity)
{
	var morphComponent = new HX$1.MorphAnimation();

	if (morphWeights) {
		for (var i = 0, len = morphWeights.length; i < len; ++i) {
			morphComponent.setWeight("morphTarget_" + i, morphWeights[i]);
		}
	}

	entity.addComponent(morphComponent);
};
GLTF.prototype._parseMorphTargets = function(targetDefs, mesh)
{
    for (var i = 0; i < targetDefs.length; ++i) {
        var attribs = targetDefs[i];
        var morphTarget = new HX$1.MorphTarget();

		morphTarget.name = "morphTarget_" + i;

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

        morphTarget.init(positionData, normalData);

		mesh.addMorphTarget(morphTarget);
    }
};


GLTF.prototype._parsePrimitive = function(primDef, entity)
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

	entity.addComponent(new HX$1.MeshInstance(mesh, this._materials[primDef.material]));

	if (primDef.targets && primDef.targets.length > 0)
		this._parseMorphTargets(primDef.targets, mesh);
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
            for (j = 0; j < numComponents; ++j) {
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
        nodeIndex = skinDef.joints[i];
        node = this._nodes[nodeIndex];
        joint = skeleton.getJoint(i);
        joint.parentIndex = node !== skelNode && node.parent? node.parent._jointIndex : -1;
    }

    var instances = target.getComponentsByType(HX$1.MeshInstance);
    for (i = 0; i < instances.length; ++i) {
		var instance = instances[i];
		instance.mesh.skeleton = skeleton;
		instance.skeletonPose = pose;
	}
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
            node = this._entities[nodeDef.mesh];
            // if the node has a specific name, use that.
            // otherwise (for model instances possible), use the model name, or assign a unique one
            node.name = nodeDef.name || ("node_" + i);
            this._target.entities[node.name] = node;
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
            for (i = 0; i < elmCount; ++i) {
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
            clips = this._parseAnimationSampler(samplers[channelDef.sampler], true);
            layers = [ new HX$1.AnimationLayerQuat(target, "rotation", clips[0]) ] ;
            break;
        case "scale":
            clips = this._parseAnimationSampler(samplers[channelDef.sampler], false);
            layers = [ new HX$1.AnimationLayerFloat4(target, "scale", clips[0]) ];
            break;
        case "weights":
            clips = this._parseAnimationSampler(samplers[channelDef.sampler], false);

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

/**
 * @classdesc
 * OBJ is an importer for the Wavefront OBJ format.
 * The options property supports the following settings:
 * <ul>
 * <li>groupsAsObjects: Specifies whether group tags should be treated as separate scene graph objects (true) or as separate MeshInstance components (false). Defaults to true.</li>
 * </ul>
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function OBJ()
{
    HX$1.Importer.call(this, HX$1.Entity);
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
    var entity = new HX$1.Entity();

    for (var i = 0; i < numGroups; ++i) {
        var group = object.groups[i];

        for (var key in group.subgroups)
        {
            if (group.subgroups.hasOwnProperty(key)) {
                var subgroup = group.subgroups[key];
                if (subgroup.numIndices === 0) continue;

                var material = mtlLib? mtlLib[key] : null;
                material = material || this._defaultMaterial;

                var mesh = this._translateMesh(subgroup);
                var meshInstance = new HX$1.MeshInstance(mesh, material);
				entity.addComponent(meshInstance);
            }
        }
    }

	entity.name = object.name;
    this._target.attach(entity);

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

    for (hash in realIndices) {
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

/**
 * @classdesc
 *
 * BufferGeometryJSON loads three.js' JSON BufferGeometry format.
 *
 * @constructor
 */
function THREEBufferGeometry()
{
    HX.Importer.call(this, HX.Model);
}

THREEBufferGeometry.prototype = Object.create(HX.Importer.prototype);

THREEBufferGeometry.prototype.parse = function(data, target)
{
    var json = JSON.parse(data);
    if (json.type !== "BufferGeometry") throw new Error("JSON does not contain correct BufferGeometry data! (type property is not BufferGeometry)");
    var mesh = HX.Mesh.createDefaultEmpty();

    this.parseAttributes(json.data.attributes, mesh);
    this.parseIndices(json.data.index, mesh);

    var flags = json.data.attributes.normal? HX.NormalTangentGenerator.MODE_NORMALS : 0;
    flags |= json.data.attributes.tangent? HX.NormalTangentGenerator.MODE_TANGENTS : 0;
    if (flags) {
        var gen = new HX.NormalTangentGenerator();
        gen.generate(mesh, flags);
    }
    target.addMesh(mesh);
    this._notifyComplete(target);
};

THREEBufferGeometry.prototype.parseAttributes = function(attributes, mesh)
{
    var map = {
        "position": "hx_position",
        "normal": "hx_normal",
        "tangent": "hx_tangent",
        "uv": "hx_texCoord"
    };

    // assume position is always present
    var numVertices = attributes.position.array.length / attributes.position.itemSize;

    for (var name in attributes) {
        if (!attributes.hasOwnProperty(name)) continue;
        if (!map.hasOwnProperty(name)) {
            mesh.addVertexAttribute(name, attributes[name].itemSize);
            if (attributes[name].type !== "Float32Array")
                throw new Error("Unsupported vertex attribute data type!");
        }
    }

    var stride = mesh.getVertexStride(0);

    var data = new Float32Array(numVertices * stride);

    for (name in attributes) {
        if (!attributes.hasOwnProperty(name)) continue;
        var attrib = attributes[name];
        var mappedName = map[name] || name;
        var def = mesh.getVertexAttributeByName(mappedName);

        var itemSize = attrib.itemSize;
        var j = 0;
        var len = attrib.array.length;
        var offset = def.offset;

        var flip = false;
        if (name === "position" || name === "normal" || name === "tangent") {
            flip = true;
        }

        while (j < len) {
            for (var i = 0; i < itemSize; ++i)
                data[offset + i] = attrib.array[j++];

            if (flip) {
                var z = data[offset + 1];
                var y = data[offset + 2];

                data[offset + 1] = y;
                data[offset + 2] = z;
            }
            offset += stride;
        }
    }

    mesh.setVertexData(data, 0);
};

THREEBufferGeometry.prototype.parseIndices = function(indexData, mesh)
{
    var indices;
    switch (indexData.type) {
        case "Uint16Array":
            indices = new Uint16Array(indexData.array);
            break;
        case "Uint32Array":
            indices = new Uint32Array(indexData.array);
            break;
        default:
            throw new Error("Unsupported index type " + indexData.type);
    }

    mesh.setIndexData(indices);
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
            keyFrame = clip.getKeyFrame(i);
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
 * MeshExporter exports to Helix's own .hmesh format.
 *
 * File format:
 *
 * <HEADER>
 * file hash "HX_MESH" as string (7 bytes)
 * version data: 3 unsigned shorts (major, minor, patch)
 *
 * <MESH DATA>
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
function MeshExporter()
{

}

MeshExporter.VERSION = "0.1.0";

MeshExporter.prototype =
{
    // returns an ArrayBuffer object
    export: function(mesh)
    {
        var size = this._calculateFileSize(mesh);
        var buffer = new ArrayBuffer(size);
        var dataView = new DataView(buffer);
        var dataStream = new DataOutputStream(dataView);

        var version = MeshExporter.VERSION.split(".");
        dataStream.writeString("HX_MESH");
        dataStream.writeUint16Array(version);

        this._writeMeshData(dataStream, mesh);

        this._writeSkeleton(dataStream, mesh.skeleton);

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

    _calculateFileSize: function(mesh)
    {
        var size = 7;   // hash "HX_MESH"
        size += 2 * 3;  // version (3 shorts)

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

        size += 1;  // numJoints
        var numJoints = mesh.skeleton? mesh.skeleton.numJoints : 0;

        for (var i = 0; i < numJoints; ++i) {
            var joint = mesh.skeleton.getJoint(i);
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
exports.OBJ = OBJ;
exports.MTL = MTL;
exports.THREEBufferGeometry = THREEBufferGeometry;
exports.AnimationClipExporter = AnimationClipExporter;
exports.MeshExporter = MeshExporter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
