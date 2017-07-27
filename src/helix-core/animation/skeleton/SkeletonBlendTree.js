import {SkeletonPose} from "./SkeletonPose";
import {Texture2D} from "../../texture/Texture2D";
import {META, DataType, TextureWrapMode, TextureFilter, TextureFormat} from "../../Helix";
import {Matrix4x4} from "../../math/Matrix4x4";
import {SkeletonJointPose} from "./SkeletonJointPose";

/**
 * @classdesc
 * A SkeletonBlendTree is used by {@linkcode SkeletonAnimation} internally to blend complex animation setups. Using this,
 * we can crossfade between animation clips (such as walking/running) while additionally having extra modifiers applied,
 * such as gun aiming, head turning, etc.
 *
 * @constructor
 * @param {SkeletonBlendNode} rootNode The root node of the tree.
 * @param {Skeleton} skeleton The skeleton to animate.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonBlendTree(rootNode, skeleton)
{
    this._skeleton = skeleton;
    this._rootNode = rootNode;
    this._transferRootJoint = false;

    if (skeleton) this.skeleton = skeleton;
}

SkeletonBlendTree.prototype =
{
    get transferRootJoint() { return this._transferRootJoint; },
    set transferRootJoint(value) { this._transferRootJoint = value; },

    get skeleton() { return this._skeleton; },
    set skeleton(value)
    {
        this._skeleton = value;
    },

    get skeletonPose() { return this._rootNode._pose; },

    get rootJointDeltaPosition() { return this._rootNode.rootJointDeltaPosition; },

    get rootNode() { return this._rootNode; },
    set rootNode(value) { this._rootNode = value; },

    setValue: function(id, value)
    {
        this._rootNode.setValue(id, value);
    },

    update: function(dt)
    {
        var updated = this._rootNode.update(dt, this._transferRootJoint);
        if (updated)
            this._rootNode._pose.invalidateGlobalPose();

        return updated;
    }
};


export { SkeletonBlendTree };