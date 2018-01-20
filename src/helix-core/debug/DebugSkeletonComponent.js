import {Component} from "../entity/Component";
import {BasicMaterial} from "../material/BasicMaterial";
import {LightingModel} from "../render/LightingModel";
import {SpherePrimitive} from "../mesh/primitives/SpherePrimitive";

/**
 * @classdesc
 *
 * DebugSkeletonComponent is a component that allows rendering the skeleton of ModelInstances.
 *
 * @property {Color} color The color used to render the debug bounds.
 *
 * @constructor
 *
 * @param {Color} color The color used to render the debug bounds.
 */
function DebugSkeletonComponent(color)
{
    Component.call(this);
    this._color = color === undefined ? new HX.Color(1, 0, 1) : color;
}

Component.create(DebugSkeletonComponent, {
    color: {
        get: function ()
        {
            return this._color;
        },
        set: function (value)
        {
            this._color = value;
            if (this._material)
                this._material.color = value;
        }
    }
});

/**
 * @ignore
 */
DebugSkeletonComponent.prototype.onAdded = function()
{
    this._initGroup();
    this.entity.attach(this._group);
};

/**
 * @ignore
 */
DebugSkeletonComponent.prototype.onRemoved = function()
{
    this.entity.detach(this._group);
    this._group = null;
};

/**
 * @ignore
 */
DebugSkeletonComponent.prototype.onUpdate = function(dt)
{
    var pose = this.entity.skeletonPose;
    var numJoints = pose.numJoints;

    for (var i = 0; i < numJoints; ++i) {
        var jointPose = pose.getJointPose(i);
        var modelInstance = this._modelInstances[i];
        modelInstance.copyTransform(jointPose);
    }
};

/**
 * @ignore
 * @private
 */
DebugSkeletonComponent.prototype._initGroup = function()
{
    // TODO: Allow rendering spherical bounds
    var sphere = new SpherePrimitive({
        radius: .5
    });

    this._group = new HX.SceneNode();
    this._material = new BasicMaterial();
    this._material.color = this._color;
    this._material.depth = this._color;
    this._material.lightingModel = LightingModel.Unlit;

    this._modelInstances = [];

    var skeleton = this.entity.skeleton;
    var numJoints = skeleton.numJoints;

    for (var i = 0; i < numJoints; ++i) {
        var joint = skeleton.getJoint(i);
        var modelInstance = new HX.ModelInstance(sphere, this._material);
        if (joint.parentIndex === -1)
            this._group.attach(modelInstance);
        else {
            this._modelInstances[joint.parentIndex].attach(modelInstance);
        }

        this._modelInstances[i] = modelInstance;
    }
};

export {DebugSkeletonComponent};