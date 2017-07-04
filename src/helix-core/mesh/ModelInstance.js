/**
 * ModelInstance is a combination of a Model and a set of Materials (up to 1 per Mesh).
 * @param model
 * @param materials Either a single material or an array of materials for each mesh in model.
 * @constructor
 */
import {BoundingAABB} from "../scene/BoundingAABB";
import {capabilities, DEFAULTS, META} from "../Helix";
import {Matrix4x4} from "../math/Matrix4x4";
import {MeshInstance} from "./MeshInstance";
import {Entity} from "../entity/Entity";

function ModelInstance(model, materials)
{
    Entity.call(this);

    this._meshBounds = new BoundingAABB();
    this._model = null;
    this._meshInstances = [];
    this._castShadows = true;
    this._skeletonPose = null;
    this._morphPose = null;

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

    skeletonMatrices: {
        get: function() {
            return this._skeletonPose;
        },
        set: function(value) {
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
 * Used if we choose to deferredly initialize the model
 * @param model
 * @param materials
 */
ModelInstance.prototype.init = function(model, materials)
{
    if (this._model || this._materials)
        throw new Error("ModelInstance already initialized");

    this._model = model;

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
};

ModelInstance.prototype.getMeshInstance = function(index)
{
    return this._meshInstances[index];
};

ModelInstance.prototype._generateDefaultSkeletonPose = function()
{
    if (META.OPTIONS.useSkinningTexture) {
        this._skeletonPose = DEFAULTS.DEFAULT_SKINNING_TEXTURE;
        return;
    }

    this._skeletonPose = [];
    for (var i = 0; i < this._model.skeleton.numJoints; ++i) {
        this._skeletonPose[i] = new Matrix4x4();
    }
};


ModelInstance.prototype._addMeshInstance = function(mesh, material)
{
    this._meshInstances.push(new MeshInstance(mesh, material));
};

ModelInstance.prototype._onModelChange = function()
{
    var maxIndex = this._materials.length - 1;
    for (var i = 0; i < this._model.numMeshes; ++i) {
        this._addMeshInstance(this._model.getMesh(i), this._materials[Math.min(i, maxIndex)]);
    }

    this._invalidateWorldBounds();
};

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

// override for better matches
ModelInstance.prototype._updateWorldBounds = function()
{
    Entity.prototype._updateWorldBounds.call(this);
    this._meshBounds.transformFrom(this._model.localBounds, this.worldMatrix);
    this._worldBounds.growToIncludeBound(this._meshBounds);
};

ModelInstance.prototype.acceptVisitor = function(visitor)
{
    visitor.visitModelInstance(this, this.worldMatrix, this.worldBounds);
    Entity.prototype.acceptVisitor.call(this, visitor);
};

ModelInstance.prototype.toString = function()
{
    return "[ModelInstance(name=" + this._name + ")]";
};

export { ModelInstance };