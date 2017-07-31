import {AnimationClip} from "./../AnimationClip";
import {SkeletonClipNode} from "./SkeletonClipNode";
import {SkeletonBlendNode} from "./SkeletonBlendNode";

/**
 * SkeletonXFadeNode is a {@linkcode SkeletonBlendNode} for simple cross-fading between child animation clips.
 *
 * @constructor
 *
 * @extends  SkeletonBlendNode
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonXFadeNode()
{
    SkeletonBlendNode.call(this);
    this._children = [];
    this._numJoints = 0;

    // TODO: Add the possibility to sync times, useful for syncing walk -> run!
    // in this case, the clips should have their timesteps recalculated
}

SkeletonXFadeNode.prototype = Object.create(SkeletonBlendNode.prototype, {
    /**
     * @ignore
     */
    numJoints: {
        get: function() {return this._numJoints; }
    }
});

/**
 * @classdesc
 * Cross-fades the animation to a new target animation.
 * @param node A {@linkcode SkeletonBlendTreeNode} or an {@linkcode AnimationClip}.
 * @param time The time the fade takes in milliseconds.
 */
SkeletonXFadeNode.prototype.fadeTo = function(node, time)
{
    if (node instanceof AnimationClip) node = new SkeletonClipNode(node);

    this._numJoints = node.numJoints;
    // put the new one in front, it makes the update loop more efficient
    this._children.unshift({
        node: node,
        weight: 0.0,
        fadeSpeed: 1 / time
    });
};

/**
 * @ignore
 */
SkeletonXFadeNode.prototype.update = function(dt, transferRootJoint)
{
    var len = this._children.length;

    // we're still fading if len > 1
    var updated = len > 1 && dt > 0;

    // update weights and remove any node that's become unused
    // do not interpolate the nodes into the pose yet, because if no updates occur, this is unnecessary
    for (var i = 0; i < len; ++i) {
        var child = this._children[i];

        updated = child.node.update(dt, transferRootJoint) || updated;

        var w = child.weight + dt * child.fadeSpeed;

        if (w > .999) {
            child.weight = 1.0;
            // we can safely remove any of the following child nodes, because their values will be lerped away
            this._children.splice(i + 1);
            break;
        }

        child.weight = w;
    }


    if (!updated) return false;

    var last = this._children.length - 1;

    // work backwards, so we can just override each old state progressively
    var childNode = this._children[last].node;
    var delta = this._rootJointDeltaPosition;
    var pose = this._pose;
    pose.copyFrom(childNode._pose);

    if (transferRootJoint)
        delta.copyFrom(childNode._rootJointDeltaPosition);
    
    for (i = last - 1; i >= 0; --i) {
        child = this._children[i];
        childNode = child.node;

        if (transferRootJoint)
            delta.lerp(delta, childNode._rootJointDeltaPosition, child.weight);

        pose.interpolate(pose, childNode._pose, child.weight);
    }

    return true;
};

export { SkeletonXFadeNode };