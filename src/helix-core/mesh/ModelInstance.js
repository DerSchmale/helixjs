import {BoundingAABB} from "../scene/BoundingAABB";
import {MeshInstance} from "./MeshInstance";
import {Entity} from "../entity/Entity";
import {SkeletonPose} from "../animation/skeleton/SkeletonPose";

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
    this._skeletonPose = null;

    this.init(model, materials);
}

ModelInstance.prototype = Object.create(Entity.prototype, {
    model:
        {
            get: function() { return this._model; }
        },

    localBounds:
        {
            get: function() { return this._model.localBounds; }
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
        get: function()
        {
            return this._skeletonPose? this._skeletonPose.getBindMatrices(this._model._skeleton) : null;
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

    if (materials)
        this._materials = materials instanceof Array? materials : [ materials ];

    if (model) {
        this._model = model;

        if (model.skeleton)
            this._generateDefaultSkeletonPose();

        model.onMeshesChange.bind(this._onModelChange, this);
        model.onSkeletonChange.bind(this._onSkeletonChange, this);
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
    this._skeletonPose = new SkeletonPose();
    this._skeletonPose._generateDefault(this._model._skeleton);
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
ModelInstance.prototype._onSkeletonChange = function()
{
    for (var i = 0; i < this._meshInstances.length; ++i) {
        this._meshInstances[i].material._setUseSkinning(!!this._model.skeleton);
    }

    if (this._model.skeleton) {
        this._generateDefaultSkeletonPose();
    }
    else
        this._skeletonPose = null;
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
    var numMeshes = this._meshInstances.length;

    for (var i = 0; i < numMeshes; ++i) {
        for (var t = 0; t < 8; ++t) {
            this._meshInstances[i].setMorphTarget(t, null, null, 0);
        }
    }
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._onMorphChanged = function()
{
    var numMeshes = this._meshInstances.length;

    for (var t = 0; t < 8; ++t) {
        var target = this._morphPose.getMorphTarget(t);
        if (target) {
            var weight = this._morphPose.getWeight(target.name);

            for (var i = 0; i < numMeshes; ++i) {
                var meshInstance = this._meshInstances[i];
                var pos = target.getPositionBuffer(i);
                var normal = target.hasNormals? target.getNormalBuffer(i) : null;
                meshInstance.setMorphTarget(t, pos, normal, weight);
            }
        }
        else {
            for (i = 0; i < numMeshes; ++i) {
                this._meshInstances[i].setMorphTarget(t, null, null, 0.0);
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

export { ModelInstance };