import {Float4} from "../../math/Float4";
import {SkeletonPose} from "./SkeletonPose";


/**
 * @classdesc
 * An abstract base class for nodes in a {@linkcode SkeletonBlendTree}
 *
 * @constructor
 *
 * @property name The name of the node, by which it can be retrieved from {@linkcode SkeletonBlendTree} and {@linkcode SkeletonAnimation}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonBlendNode()
{
    this.numJoints = -1;
	this.name = null;
	this.rootJointDeltaPosition = new Float4();
	this.pose = new SkeletonPose();
}

SkeletonBlendNode.prototype =
{
    /**
     * @ignore
     */
    findNode: function(name)
    {
        if (this.name === name) return this;
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
    _queryChildren: function(name)
    {
        throw new Error("Abstract method called!");
    }
};

export { SkeletonBlendNode };