import {Float4} from "../../math/Float4";
import {SkeletonPose} from "./SkeletonPose";


/**
 *
 * @constructor
 */
function SkeletonBlendNode()
{
    this._rootJointDeltaPosition = new Float4();
    this._valueID = null;
    this._pose = new SkeletonPose();
}

SkeletonBlendNode.prototype =
{
    // child nodes should ALWAYS be requested to update first
    update: function(dt, transferRootJoint)
    {
    },

    setValue: function(id, value)
    {
        if (this._valueID === id) {
            this._applyValue(value);
        }
    },   // a node can have a value associated with it, either time, interpolation value, directional value, ...

    get rootJointDeltaPosition() { return this._rootJointDeltaPosition; },
    get numJoints() { return -1; },

    // the id used to set values
    get valueID() { return this._valueID; },
    set valueID(value) { this._valueID = value; },

    _applyValue: function(value) {}
};

export { SkeletonBlendNode };