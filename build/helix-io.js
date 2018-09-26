(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('helix')) :
    typeof define === 'function' && define.amd ? define('HX_IO', ['exports', 'helix'], factory) :
    (factory((global.HX_IO = {}),global.HX));
}(this, (function (exports,HX) { 'use strict';

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
    }

    function readFloat(dataView, offset)
    {
        return dataView.getFloat32(offset, true);
    }

    function readFloat3(dataView, offset)
    {
        var f = new HX.Float4();
        f.x = dataView.getFloat32(offset, true);
        f.y = dataView.getFloat32(offset + 4, true);
        f.z = dataView.getFloat32(offset + 8, true);
        return f;
    }

    function readMatrix4x4(dataView, offset)
    {
        var m = [];
        for (var j = 0; j < 16; ++j) {
            m[j] = dataView.getFloat32(offset, true);
            offset += 4;
        }
        return new HX.Matrix4x4(m);
    }

    function readQuat(dataView, offset)
    {
        var q = new HX.Quaternion();
        q.x = dataView.getFloat32(offset, true);
        q.y = dataView.getFloat32(offset + 4, true);
        q.z = dataView.getFloat32(offset + 8, true);
        q.w = dataView.getFloat32(offset + 12, true);
        return q;
    }

    /**
     * GLTF is an importer for glTF files. When loading, GLTF will immediately return a GLTFAsset containing the default
     * scene (empty scene if not specified in the glTF file), and will populate this object as it's being loaded.
     *
     * @constructor
     *
     * @see {@link https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#introduction}
     *
     * @author derschmale <http://www.derschmale.com>
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

        this._flipCoord = new HX.Matrix4x4();
        this._flipCoord.setColumn(0, new HX.Float4(-1, 0, 0, 0));
        this._flipCoord.setColumn(1, new HX.Float4(0, 0, 1, 0));
        this._flipCoord.setColumn(2, new HX.Float4(0, 1, 0, 0));
    }

    GLTF.prototype = Object.create(HX.Importer.prototype);

    GLTF.prototype.parse = function(file, target)
    {
        this._defaultSceneIndex = undefined;
        this._gltf = JSON.parse(file);

        var asset = this._gltf.asset;

        this._target = target;
        // maps the animation targets to their closest scene graph objects (the targets can be the scene graph entity
        // itself, a MorphAnimation, a SkeletonJointPose)
    	this._animationTargetNodes = {};
    	this._animations = [];

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
        queue.queue(this._assignAnimations.bind(this));

        queue.onComplete.bind(this._finalize.bind(this));

        queue.onProgress.bind((function(ratio) {
            this._notifyProgress(.8 + .2 * ratio);
        }).bind(this));

        queue.execute();
    };

    GLTF.prototype._finalize = function()
    {
        var queue = new HX.AsyncTaskQueue();

        // this just initializes materials trying not to freeze up the browser
        // otherwise it'd all happen on first render

        for (var i = 0, len = this._materials.length; i < len; ++i) {
            var material = this._materials[i];
            queue.queue(material.init.bind(material));
        }

        queue.onComplete.bind((function() {
            this._notifyComplete(this._target);
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
            byteStride: bufferView.byteStride,
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
            byteLength: bufferView.byteLength,
            byteStride: bufferView.byteStride
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
            var mat = new HX.BasicMaterial();

            mat.name = matDef.name;
            mat.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_METALLIC_ROUGHNESS;
            mat.normalMap = this._getTexture(matDef.normalTexture);
            mat.occlusionMap = this._getTexture(matDef.occlusionTexture);
            mat.emissionMap = this._getTexture(matDef.emissiveTexture);

            if (matDef.doubleSided) {
                mat.cullMode = HX.CullMode.NONE;
            }

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
                mat.normalSpecularReflectance = 0.04; // the default specified by GLTF spec

                if (mat.specularMap) {
                    mat.roughness *= .5;
                    mat.roughnessRange = -mat.roughness;
                }

                // TODO: There can also be a texCoord property with the textures, but secondary uvs are not supported yet in the default material
            }

            this._materials[i] = mat;
        }
    };

    GLTF.prototype._getTexture = function(textureDef)
    {
        return textureDef? this._assetLibrary.get("hx_image_" + this._gltf.textures[textureDef.index].source) : null;
    };

    GLTF.prototype._parseMeshes = function()
    {
        var meshDefs = this._gltf.meshes;

        if (!meshDefs) return;

        // locally stored by index, using gltf nomenclature (actually contains model instances)
        this._entities = [];

        for (var i = 0, numMeshes = meshDefs.length; i < numMeshes; ++i) {
            var meshDef = meshDefs[i];
    		var entity = new HX.Entity();
    		entity.name = meshDef.name;

            for (var j = 0, numPrims = meshDef.primitives.length; j < numPrims; ++j) {
                var primDef = meshDef.primitives[j];
                this._parsePrimitive(primDef, entity);
                if (meshDef.weights) {
                    this._parseMorphWeights(meshDef.weights, entity);
                }
            }

            this._entities[i] = entity;
        }
    };

    GLTF.prototype._parseMorphWeights = function(morphWeights, entity)
    {
    	var morphComponent = new HX.MorphAnimation();

    	if (morphWeights) {
    		for (var i = 0, len = morphWeights.length; i < len; ++i) {
    			morphComponent.setWeight("morphTarget_" + i, morphWeights[i]);
    		}
    	}

    	entity.addComponent(morphComponent);

    	this._animationTargetNodes[morphComponent.name] = entity;
    };

    GLTF.prototype._parseMorphTargets = function(targetDefs, mesh)
    {
        for (var i = 0; i < targetDefs.length; ++i) {
            var attribs = targetDefs[i];
            var morphTarget = new HX.MorphTarget();

    		morphTarget.name = "morphTarget_" + i;

            var positionAcc = this._getAccessor(attribs.POSITION);
            var normalAcc = attribs.NORMAL !== undefined? this._getAccessor(attribs.NORMAL) : null;

            // tangent morphing not supported in Helix!
            // var tangentAcc = attribs.TANGENT !== undefined? this._getAccessor(attribs.TANGENT) : null;

            var positionData = new Float32Array(positionAcc.count * 3);
            this._readVertexData(positionData, 0, positionAcc, 3, 3, true);
    		morphTarget.setPositionData(positionData);

            if (normalAcc) {
                var normalData = new Float32Array(normalAcc.count * 3);
                this._readVertexData(normalData, 0, normalAcc, 3, 3, true);
    			morphTarget.setNormalData(normalData);
            }

    		mesh.addMorphTarget(morphTarget);
        }
    };


    GLTF.prototype._parsePrimitive = function(primDef, entity)
    {
        var mesh = HX.Mesh.createDefaultEmpty();
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
            normalGenMode = HX.NormalTangentGenerator.MODE_NORMALS;

        if (tangentAcc)
            this._readVertexData(vertexData, 6, tangentAcc, 4, stride, true);
        else if (texCoordAcc)
            normalGenMode = normalGenMode | HX.NormalTangentGenerator.MODE_TANGENTS;

        if (texCoordAcc)
            this._readUVData(vertexData, 10, texCoordAcc, stride);

        mesh.setVertexData(vertexData, 0);

        if (primDef.hasOwnProperty("mode"))
            mesh.elementType = primDef.mode;

        var indexAcc = this._getAccessor(primDef.indices);
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
            this._readVertexData(jointData, 0, jointIndexAcc, 4, stride);
            this._readVertexData(jointData, 4, jointWeightsAcc, 4, stride);

            mesh.setVertexData(jointData, 1);
        }

    	entity.addComponent(new HX.MeshInstance(mesh, this._materials[primDef.material]));

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
        var srcStride = accessor.byteStride || 0;
        var readFnc;
        var elmSize;

        if (src) {
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
            else if (accessor.dataType === HX.DataType.UNSIGNED_BYTE) {
                readFnc = src.getUint8;
                elmSize = 1;
            }
            else {
                throw new Error("Unknown data type " + accessor.dataType)
            }


            for (i = 0; i < len; ++i) {
                var or = o;

                for (var j = 0; j < numComponents; ++j) {
                    target[p + j] = readFnc.call(src, o, true);
                    o += elmSize;
                }

                p += stride;

                if (srcStride)
                    o = or + srcStride;
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

        if (accessor.dataType === HX.DataType.UNSIGNED_SHORT) {
            readIndexFnc = indexData.getUint16;
            idSize = 2;
        }
        else if (accessor.dataType === HX.DataType.UNSIGNED_INT) {
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

        if (accessor.dataType === HX.DataType.UNSIGNED_SHORT) {
            return new Uint16Array(src.buffer, o, len);
        }
        else if (accessor.dataType === HX.DataType.UNSIGNED_INT) {
    		return new Uint32Array(src.buffer, o, len);
        }
        else
            throw new Error("Unknown data type for indices!");
    };

    GLTF.prototype._parseSkin = function(nodeDef, target)
    {
        var skinIndex = nodeDef.skin;
        var skinDef = this._gltf.skins[skinIndex];

    	skinDef.name = skinDef.name || "skin ";

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

            joint.inverseBindPose = readMatrix4x4(src, o);
            o += 64;

            joint.inverseBindPose.prepend(this._flipCoord);
            joint.inverseBindPose.append(this._flipCoord);

            skeleton.joints.push(joint);

            var node = this._nodes[nodeIndex];
            if (node._jointIndex !== undefined) {
                throw new Error("Adding one node to multiple skeletons!");
            }

            // we use this to keep a mapping when assigning target animations
            node._jointIndex = i;
            node._skeletonPose = pose;
            node._skeleton = skeleton;

            if (skinDef.name)
                joint.name = skinDef.name + "_joint_" + i;

            var jointPose = new HX.SkeletonJointPose();
            jointPose.position.copyFrom(node.position);
            jointPose.rotation.copyFrom(node.rotation);
            jointPose.scale.copyFrom(node.scale);
            pose.setJointPose(i, jointPose);

            this._animationTargetNodes[joint.name] = target;
        }

        for (i = 0; i < skinDef.joints.length; ++i) {
            nodeIndex = skinDef.joints[i];
            node = this._nodes[nodeIndex];
            joint = skeleton.joints[i];
            joint.parentIndex = node !== skelNode && node.parent? node.parent._jointIndex : -1;
        }

        var instances = target.getComponentsByType(HX.MeshInstance);
        for (i = 0; i < instances.length; ++i) {
    		var instance = instances[i];
    		instance.skeleton = skeleton;
    		instance.skeletonPose = pose;
    	}
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
                node = this._entities[nodeDef.mesh];
                // if the node has a specific name, use that.
                if (nodeDef.name)
                    node.name = nodeDef.name;
            }
            else {
    			node = new HX.SceneNode();
    		}
    		this._animationTargetNodes[node.name] = node;

            if (nodeDef.rotation) {
                node.rotation.set(nodeDef.rotation[0], nodeDef.rotation[1], nodeDef.rotation[2], nodeDef.rotation[3]);
                m.fromQuaternion(node.rotation);
                m.prepend(this._flipCoord);
                m.append(this._flipCoord);
                node.rotation.fromMatrix(m);
            }

            if (nodeDef.translation)
                node.position.set(-nodeDef.translation[0], nodeDef.translation[2], nodeDef.translation[1], 1.0);

            if (nodeDef.scale) {
                m.fromScale(nodeDef.scale[0], nodeDef.scale[1], nodeDef.scale[2]);
                m.prepend(this._flipCoord);
                m.append(this._flipCoord);
                node.scale.set(m.getColumn(0).length, m.getColumn(1).length, m.getColumn(2).length);
            }

            if (nodeDef.matrix) {
                node.matrix = new HX.Matrix4x4(nodeDef.matrix);
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

    GLTF.prototype._parseAnimationSampler = function(samplerDef, flipCoords, duration)
    {
        var timesAcc = this._getAccessor(samplerDef.input);
        var valuesAcc = this._getAccessor(samplerDef.output);
        var timeSrc = timesAcc.data;
        var valueSrc = valuesAcc.data;
        var t = timesAcc.byteOffset;
        var v = valuesAcc.byteOffset;
        var m = new HX.Matrix4x4();

        // in the case of weights
        var elmCount = valuesAcc.count / timesAcc.count;

        var clips = [];

        if (elmCount === 1) {
            var clip = clips[0] = new HX.AnimationClip();
            clip.duration = duration;
        }
        else {
            for (var i = 0; i < elmCount; ++i) {
                clips[i] = new HX.AnimationClip();
                clips[i].duration = duration;
            }
        }

        // valuesAcc can be a multiple of timesAcc, if it contains more weights

        for (var k = 0; k < timesAcc.count; ++k) {
            var value;

            switch(valuesAcc.numComponents) {
                case 1:
                    value = [];
                    for (i = 0; i < elmCount; ++i)
                        value[i] = readFloat(valueSrc, v + i * 4);
                    break;
                case 3:
                    value = readFloat3(valueSrc, v);
                    if (flipCoords) {
                        value.x = -value.x;
                        var tmp = value.y;
                        value.y = value.z;
                        value.z = tmp;
                    }
                    break;
                case 4:
                    value = readQuat(valueSrc, v);
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

            var time = readFloat(timeSrc, t) * 1000.0;
            var keyFrame;

            if (elmCount === 1) {
                keyFrame = new HX.KeyFrame(time, value);
                clip.addKeyFrame(keyFrame);
            }
            else {
                for (i = 0; i < elmCount; ++i) {
                    keyFrame = new HX.KeyFrame(time, value[i]);
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
            var animation = new HX.LayeredAnimation();

            var duration = 0;

            for (var j = 0; j < animDef.samplers.length; ++j) {
                var max = this._gltf.accessors[animDef.samplers[j].input].max[0];
                duration = Math.max(duration, max);
            }

            // milliseconds
            duration *= 1000;

            for (j = 0; j < animDef.channels.length; ++j) {
                var layers = this._parseAnimationChannel(animDef.channels[j], animDef.samplers, duration);
                for (var k = 0; k < layers.length; ++k)
                    animation.addLayer(layers[k]);
            }

            animation.name = animDef.name || "animation_" + i;
            this._animations.push(animation);
        }
    };

    GLTF.prototype._parseAnimationChannel = function(channelDef, samplers, duration)
    {
        var target = this._nodes[channelDef.target.node];
        var targetName;
        var layers = [];

        // gltf targets a node, but we need to target the joint pose
        if (target._jointIndex !== undefined) {
    		targetName = target._skeleton.joints[target._jointIndex].name;
    		target = target._skeletonPose._jointPoses[target._jointIndex];
    	}
    	else {
    		targetName = target.name;
        }

        switch (channelDef.target.path) {
            case "translation":
                var clips = this._parseAnimationSampler(samplers[channelDef.sampler], true, duration);
                layers = [ new HX.AnimationLayerFloat4(targetName, "position", clips[0]) ];
                break;
            case "rotation":
                clips = this._parseAnimationSampler(samplers[channelDef.sampler], true, duration);
                layers = [ new HX.AnimationLayerQuat(targetName, "rotation", clips[0]) ] ;
                break;
            case "scale":
                clips = this._parseAnimationSampler(samplers[channelDef.sampler], false, duration);
                layers = [ new HX.AnimationLayerFloat4(targetName, "scale", clips[0]) ];
                break;
            case "weights":
                clips = this._parseAnimationSampler(samplers[channelDef.sampler], false, duration);

                layers = [];

                for (var i = 0; i < clips.length; ++i)
                    layers.push(new HX.AnimationLayerMorphTarget(target.getFirstComponentByType(HX.MorphAnimation).name, "morphTarget_" + i, clips[i]));

                break;
            default:
                throw new Error("Unknown channel path!");
        }
        return layers;
    };

    GLTF.prototype._assignAnimations = function()
    {
        var anims = this._animations;
        for (var i = 0, len = anims.length; i < len; ++i) {
            var anim = anims[i];
    			// this expects separate animations to target separate scenes:
            var entity = this._animationTargetNodes[anim._layers[0]._targetName];
            var rootNode = entity._scene.rootNode;
            rootNode.addComponent(anim);
    	}
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
            // param is an optional extra parameter for some internal functionality
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
         *
         * @param [payload] An optional amount of arguments to be passed in as a parameter to the listening functions. Can be used to provide data.
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
     * @classdesc
     *
     * @constructor
     *
     * @author derschmale <http://www.derschmale.com>
     */
    function AsyncTaskQueue()
    {
        this.onComplete = new Signal();
        this.onProgress = new Signal();
        this._queue = [];
        this._childQueues = [];
        this._currentIndex = 0;
        this._isRunning = false;
    	this._timeout = undefined;
    }

    AsyncTaskQueue.prototype = {
    	/**
    	 * Indicates whether the queue is currently running or not.
    	 */
    	get isRunning() { return this._isRunning },

    	/**
         * Adds a function to execute. Provide the parameters for the function as parameters after the function.
    	 */
    	queue: function(func, rest)
        {
            // V8 engine doesn't perform well if not copying the array first before slicing
            var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));

            this._queue.push({
                func: func,
                args: args.slice(1)
            });
        },

    	/**
         * Adds a child queue to execute. This can be done by queued tasks while this queue is already running.
    	 */
        addChildQueue: function(queue)
        {
            this._childQueues.push(queue);
        },

    	/**
         * Starts execution of the tasks in the queue.
    	 */
    	execute: function()
        {
            if (this._isRunning)
                throw new Error("Already running!");

            this._isRunning = true;
            this._currentIndex = 0;

            this._executeTask();
        },

    	/**
         * Cancels execution of the queue.
    	 */
    	cancel: function()
        {
            if (!this._isRunning) return;
            if (this._timeout !== undefined)
                clearTimeout(this._timeout);

            this._isRunning = false;
            this._timeout = undefined;
        },

    	/**
         * @ignore
    	 * @private
    	 */
    	_executeTask: function()
        {
            this._timeout = setTimeout(this._executeImpl.bind(this));
        },

    	/**
    	 * @ignore
    	 * @private
    	 */
        _executeImpl: function()
        {
            // cancelled
            if (!this._isRunning) return;

            this.onProgress.dispatch(this._currentIndex / this._queue.length);

            if (this._childQueues.length > 0) {
                var queue = this._childQueues.shift();
                queue.onComplete.bind(this._executeImpl, this);
                queue.execute();
            }
            else if (this._queue.length === this._currentIndex) {
    			this._isRunning = false;
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
     *
     * @author derschmale <http://www.derschmale.com>
     */
    function MTL()
    {
        HX.Importer.call(this, Object, HX.URLLoader.DATA_TEXT);
        this._textures = [];
        this._texturesToLoad = [];
        this._activeMaterial = null;
    }

    MTL.prototype = Object.create(HX.Importer.prototype);

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
                this._activeMaterial = new HX.BasicMaterial();
                this._activeMaterial.name = tokens[1];
                target[tokens[1]] = this._activeMaterial;
                break;
            case "ns":
                var specularPower = parseFloat(tokens[1]);
                this._activeMaterial.roughness = HX.BasicMaterial.roughnessFromShininess(specularPower);
                this._activeMaterial.roughnessRange = this._activeMaterial.roughness;
                break;
            case "kd":
                this._activeMaterial.color = new HX.Color(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
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
            var tex = new HX.Texture2D();
            this._textures[url] = tex;

            this._texturesToLoad.push({
                file: this._correctURL(url),
                importer: HX.JPG,
                target: tex
            });
        }
        return this._textures[url];
    };

    MTL.prototype._loadTextures = function(lib)
    {
        var library = new HX.AssetLibrary(null, this.options.crossOrigin);
        library.fileMap = this.fileMap;
        var files = this._texturesToLoad;
        var len = files.length;
        if (len === 0) {
            this._notifyComplete(lib);
            return;
        }

        for (var i = 0; i < files.length; ++i) {
            library.queueAsset(files[i].file, files[i].file, HX.AssetLibrary.Type.ASSET, files[i].importer, this.options, files[i].target);
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
        HX.Importer.call(this, HX.Entity);
        this._objects = [];
        this._vertices = [];
        this._normals = [];
        this._uvs = [];
        this._hasNormals = false;
        this._defaultMaterial = new HX.BasicMaterial();
        this._target = null;
        this._mtlLibFile = null;
    }

    OBJ.prototype = Object.create(HX.Importer.prototype);

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
        var queue = new AsyncTaskQueue();
        var numObjects = this._objects.length;

        for (var i = 0; i < numObjects; ++i) {
            queue.queue(this._translateObject.bind(this), i, mtlLib);
        }

        for (var m in mtlLib) {
            // init all materials while we're in the async queue, otherwise it will all happen on first render
            if (mtlLib.hasOwnProperty(m)) {
                var material = mtlLib[m];
                queue.queue(material.init.bind(material));
            }
        }

        queue.onComplete.bind(this._onComplete, this);
        queue.execute();
    };

    OBJ.prototype._onComplete = function()
    {
        this._notifyComplete(this._target);
    };

    OBJ.prototype._loadMTLLib = function(filename)
    {
        var loader = new HX.AssetLoader(MTL);
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
        var entity = new HX.Entity();

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
                    var meshInstance = new HX.MeshInstance(mesh, material);
    				entity.addComponent(meshInstance);
                }
            }
        }

        if (object.name)
    	    entity.name = object.name;

        this._target.attach(entity);

        this._notifyProgress(.8 + (objectIndex + 1) / this._objects.length * .2);
    };

    OBJ.prototype._translateMesh = function(group)
    {
        var mesh = HX.Mesh.createDefaultEmpty();
        var realIndices = [];
        var indices = new Array(group.numIndices);
        var numVertices = 0;
        var currentIndex = 0;

        if (group.name)
            mesh.name = group.name;

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

        var vertices = new Array(numVertices * HX.Mesh.DEFAULT_VERTEX_SIZE);

        for (hash in realIndices) {
            if (!realIndices.hasOwnProperty(hash)) continue;
            var data = realIndices[hash];
            var vertex = data.vertex;
            var index = data.index * HX.Mesh.DEFAULT_VERTEX_SIZE;

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

        var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
        if (!this._hasNormals) mode = mode | HX.NormalTangentGenerator.MODE_NORMALS;
        var generator = new HX.NormalTangentGenerator();
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
        this.name = null;
        this._activeMaterial = null;
    };

    OBJ._ObjectData = function()
    {
        this.name = null;
        this.groups = [];
        this._activeGroup = null;
    };

    /**
     * @classdesc
     *
     * BufferGeometryJSON loads three.js' JSON BufferGeometry format.
     *
     * @constructor
     *
     * @author derschmale <http://www.derschmale.com>
     */
    function THREEBufferGeometry()
    {
        HX.Importer.call(this, HX.Mesh);
    }

    THREEBufferGeometry.prototype = Object.create(HX.Importer.prototype);

    THREEBufferGeometry.prototype.parse = function(data, target)
    {
        var json = JSON.parse(data);
        if (json.type !== "BufferGeometry") throw new Error("JSON does not contain correct BufferGeometry data! (type property is not BufferGeometry)");
        HX.Mesh.createDefaultEmpty(target);

        this.parseAttributes(json.data.attributes, target);
        this.parseIndices(json.data.index, target);

        var flags = json.data.attributes.normal? HX.NormalTangentGenerator.MODE_NORMALS : 0;
        flags |= json.data.attributes.tangent? HX.NormalTangentGenerator.MODE_TANGENTS : 0;
        if (flags) {
            var gen = new HX.NormalTangentGenerator();
            gen.generate(target, flags);
        }

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

    // could we make things switchable based on a config file, so people can generate a file with only the importers they

    exports.GLTF = GLTF;
    exports.GLTFData = GLTFData;
    exports.OBJ = OBJ;
    exports.MTL = MTL;
    exports.THREEBufferGeometry = THREEBufferGeometry;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
