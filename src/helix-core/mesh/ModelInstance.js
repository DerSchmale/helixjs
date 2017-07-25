import {BoundingAABB} from "../scene/BoundingAABB";
import {capabilities, DataType, DEFAULTS, META, TextureFilter, TextureFormat, TextureWrapMode} from "../Helix";
import {Matrix4x4} from "../math/Matrix4x4";
import {MeshInstance} from "./MeshInstance";
import {Entity} from "../entity/Entity";
import {SkeletonJointPose} from "../animation/skeleton/SkeletonJointPose";
import {Texture2D} from "../texture/Texture2D";

/**
 * @classdesc
 * <p>ModelInstance is a scene graph node that contains Model geometry and a Material to use for rendering. It allows
 * reusing geometry multiple times in the scene.</p>
 * <p>ModelInstance creates a matching {@linkcode MeshInstance} for each {@linkcode Mesh} in the {@linkcode Model}, in
 * which the {@linkcode Mesh} is linked with its {@linkcode Material}.
 *
 * @property {Model} model The model to use as the geometry
 * @property {boolean} castShadows Defines whether or not this ModelInstance should cast shadows.
 * @property {number} numMeshInstances The amount of MeshInstance objects.
 * @property {Skeleton} skeleton The skeleton used for skinning animations.
 * @property {SkeletonPose} skeletonPose The SkeletonPose object defining the current local skeleton state.
 * @property {MorphPose} morphPose The MorphPose object defining the current morph target state.
 *
 * @constructor
 * @param model The {@linkcode Model} to use as the geometry
 * @param materials Either a single {@linkcode Material} to link to all Meshes in the Model, or an array of materials to link to the meshes in respective order.
 *
 * @extends Entity
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ModelInstance(model, materials)
{
    Entity.call(this);

    this._meshBounds = new BoundingAABB();
    this._model = null;
    this._meshInstances = [];
    this._castShadows = true;
    this._skeletonMatrices = null;
    this._morphPose = null;
    this._meshInstancesInvalid = false;
    this._skeletonMatricesInvalid = false;
    this._skeletonPose = null;
    this._skinningTexture = null;
    this._globalSkeletonPose = null;

    this.init(model, materials);
}

ModelInstance.prototype = Object.create(Entity.prototype, {
    model:
        {
            get: function() { return this._model; }
        },

    castShadows: {
        get: function()
        {
            return this._castShadows;
        },

        set: function(value)
        {
            this._castShadows = value;
        }
    },

    numMeshInstances: {
        get: function ()
        {
            return this._meshInstances.length;
        }
    },

    skeleton: {
        get: function() {
            return this._model.skeleton;
        }
    },

    /**
     * The global matrices defining the skeleton pose. This could be a Float32Array with flat matrix data, or a texture
     * containing the data (depending on the capabilities). This is usually set by {@linkcode SkeletonAnimation}, and
     * should not be handled manually.
     *
     * @ignore
     */
    skeletonMatrices: {
        get: function() {
            if (this._skeletonMatricesInvalid)
                this._updateSkeletonMatrices();

            return this._skinningTexture || this._skeletonMatrices;
        }
    },

    skeletonPose: {
        get: function()
        {
            return this._skeletonPose;
        },

        set: function(value)
        {
            this._skeletonPose = value;
            if (this._model._skeleton) this._skeletonMatricesInvalid = true;
        }

    },

    morphPose: {
        get: function() {
            return this._morphPose;
        },

        set: function(value) {
            if (this._morphPose)
                this._morphPose.onChange.unbind(this._onMorphChanged);

            this._morphPose = value;

            if (this._morphPose) {
                this._morphPose.onChange.bind(this._onMorphChanged, this);
                this._onMorphChanged();
            }
            else
                this._clearMorph();
        }
    }
});

/**
 * Init allows us to leave the constructor empty and initialize the model lazily.
 * @param model The {@linkcode Model} to use as the geometry
 * @param materials Either a single {@linkcode Material} to link to all Meshes in the Model, or an array of materials to link to the meshes in respective order.
 */
ModelInstance.prototype.init = function(model, materials)
{
    if (this._model || this._materials)
        throw new Error("ModelInstance already initialized");

    this._model = model;
    this._model.onChange.bind(this._invalidateWorldBounds, this);

    if (materials)
        this._materials = materials instanceof Array? materials : [ materials ];

    if (model) {
        if (model.skeleton) {
            this._generateDefaultSkeletonPose();
        }
        model.onChange.bind(this._onModelChange, this);
        this._onModelChange();
    }

    this._invalidateWorldBounds();
    this._updateMeshInstances();
};

/**
 * Forces all MeshInstances in the ModelInstance to use the material.
 */
ModelInstance.prototype.assignMaterial = function(material)
{
    if (this._meshInstancesInvalid) this._updateMeshInstances();

    for (var i = 0; i < this._meshInstances.length; ++i) {
        this._meshInstances[i].material = material;
    }
};

/**
 * Gets the {@linkcode MeshInstance} at the given index.
 */
ModelInstance.prototype.getMeshInstance = function(index)
{
    return this._meshInstances[index];
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._generateDefaultSkeletonPose = function()
{
    if (META.OPTIONS.useSkinningTexture) {
        this._skeletonMatrices = DEFAULTS.DEFAULT_SKINNING_TEXTURE;
        return;
    }

    this._skeletonMatrices = [];
    for (var i = 0; i < this._model.skeleton.numJoints; ++i) {
        this._skeletonMatrices[i] = new Matrix4x4();
    }
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._updateMeshInstances = function()
{
    this._meshInstances = [];
    var maxIndex = this._materials.length - 1;

    for (var i = 0; i < this._model.numMeshes; ++i) {
        this._meshInstances.push(new MeshInstance(this._model.getMesh(i), this._materials[Math.min(i, maxIndex)]));
    }

    this._meshInstancesInvalid = false;
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._onModelChange = function()
{
    this._meshInstancesInvalid = true;
    this._invalidateWorldBounds();
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._clearMorph = function()
{
    var numTargets = capabilities.NUM_MORPH_TARGETS;
    var numMeshes = this._meshInstances.length;

    for (var t = 0; t < numTargets; ++t) {
        for (var i = 0; i < numMeshes; ++i) {
            this._meshInstances[i].setMorphTarget(t, null, 0);
        }
    }
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._onMorphChanged = function()
{
    var numTargets = capabilities.NUM_MORPH_TARGETS;
    var numMeshes = this._meshInstances.length;

    for (var t = 0; t < numTargets; ++t) {
        var target = this._morphPose.getMorphTarget(t);
        if (target) {
            var weight = this._morphPose.getWeight(target.name);
            for (var i = 0; i < numMeshes; ++i) {
                var meshInstance = this._meshInstances[i];
                meshInstance.setMorphTarget(t, target.getVertexBuffer(i), weight);
            }
        }
        else {
            for (i = 0; i < numMeshes; ++i) {
                this._meshInstances[i].setMorphTarget(t, null, 0.0);
            }
        }
    }
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._updateWorldBounds = function()
{
    if (this._meshInstancesInvalid) this._updateMeshInstances();
    Entity.prototype._updateWorldBounds.call(this);
    this._meshBounds.transformFrom(this._model.localBounds, this.worldMatrix);
    this._worldBounds.growToIncludeBound(this._meshBounds);
};

/**
 * @ignore
 */
ModelInstance.prototype.acceptVisitor = function(visitor)
{
    if (this._meshInstancesInvalid) this._updateMeshInstances();
    visitor.visitModelInstance(this, this.worldMatrix, this.worldBounds);
    Entity.prototype.acceptVisitor.call(this, visitor);
};

/**
 * @ignore
 */
ModelInstance.prototype.toString = function()
{
    return "[ModelInstance(name=" + this._name + ")]";
};

/**
 * @ignore
 */
ModelInstance.prototype._updateSkeletonMatrices = function()
{
    if (!this._skeletonPose) {
        this._generateDefaultSkeletonPose();
        return;
    }

    var skeleton = this._model.skeleton;
    var globals = this._skeletonMatrices;
    if (!globals || globals.length !== skeleton.numJoints) {
        this._generateGlobalSkeletonData(skeleton);
        globals = this._skeletonMatrices;
    }

    this._globalSkeletonPose.globalFromLocal(this._skeletonPose, skeleton);


    var len = skeleton.numJoints;
    var poses = this._globalSkeletonPose.jointPoses;

    for (var i = 0; i < len; ++i) {
        var pose = poses[i];
        var mtx = globals[i];
        if (skeleton._applyInverseBindPose)
            mtx.copyFrom(skeleton.getJoint(i).inverseBindPose);
        else
            mtx.copyFrom(Matrix4x4.IDENTITY);

        var sc = pose.scale;
        mtx.appendScale(sc.x, sc.y, sc.z);
        mtx.appendQuaternion(pose.rotation);
        mtx.appendTranslation(pose.position);
    }

    if (META.OPTIONS.useSkinningTexture)
        this._updateSkinningTexture();
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._generateGlobalSkeletonData = function(skeleton)
{
    this._skeletonMatrices = [];
    this._globalSkeletonPose = new HX.SkeletonPose();
    for (var i = 0; i < skeleton.numJoints; ++i) {
        this._skeletonMatrices[i] = new Matrix4x4();
        this._globalSkeletonPose.jointPoses[i] = new SkeletonJointPose();
    }

    if (META.OPTIONS.useSkinningTexture) {
        this._skinningTexture = new Texture2D();
        this._skinningTexture.filter = TextureFilter.NEAREST_NOMIP;
        this._skinningTexture.wrapMode = TextureWrapMode.CLAMP;
    }
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._updateSkinningTexture = function()
{
    var data = [];
    var globals = this._skeletonMatrices;
    var len = globals.length;

    for (var r = 0; r < 3; ++r) {
        for (var i = 0; i < len; ++i) {
            var m = globals[i]._m;

            data.push(m[r], m[r + 4], m[r + 8], m[r + 12]);
        }

        for (i = len; i < META.OPTIONS.maxSkeletonJoints; ++i) {
            data.push(0, 0, 0, 0);
        }
    }

    this._skinningTexture.uploadData(new Float32Array(data), META.OPTIONS.maxSkeletonJoints, 3, false, TextureFormat.RGBA, DataType.FLOAT);
};

export { ModelInstance };