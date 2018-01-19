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
    this._pose = new SkeletonPose();
    this._name = null;
}

SkeletonBlendNode.prototype =
{
    /**
     * The name of the node, by which it can be retrieved from {@linkcode SkeletonBlendTree} and {@linkcode SkeletonAnimation}
     */
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },


    /**
     * @ignore
     */
    findNode: function(name)
    {
        if (this._name === name) return this;
        return this._queryChildren(name);
    },

    /**
     * @ignore
     */
    update: function(dt, transferRootJoint)
    {
    },

    /**
     * @ignore
     */
    get rootJointDeltaPosition() { return this._rootJointDeltaPosition; },

    /**
     * @ignore
     */
    get numJoints() { return -1; },

    /**
     * @ignore
     */
    _queryChildren: function(name)
    {
        throw new Error("Abstract method called!");
    }
};

export { SkeletonBlendNode };