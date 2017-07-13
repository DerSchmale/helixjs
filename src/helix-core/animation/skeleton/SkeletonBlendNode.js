import {Float4} from "../../math/Float4";
import {SkeletonPose} from "./SkeletonPose";


/**
 * @classdesc
 * An abstract base class for nodes in a {@linkcode SkeletonBlendTree}
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonBlendNode()
{
    this._rootJointDeltaPosition = new Float4();
    this._valueID = null;
    this._pose = new SkeletonPose();
}

SkeletonBlendNode.prototype =
{
    /**
     * @ignore
     */
    update: function(dt, transferRootJoint)
    {
    },

    /**
     * @ignore
     */
    setValue: function(id, value)
    {
        if (this._valueID === id) {
            this._applyValue(value);
        }
    },   // a node can have a value associated with it, either time, interpolation value, directional value, ...

    /**
     * @ignore
     */
    get rootJointDeltaPosition() { return this._rootJointDeltaPosition; },

    /**
     * @ignore
     */
    get numJoints() { return -1; },

    /**
     * The value ID linked to this node. The meaning is context dependent.
     *
     * @deprecated
     */
    get valueID() { return this._valueID; },
    set valueID(value) { this._valueID = value; },

    _applyValue: function(value) {}
};

export { SkeletonBlendNode };