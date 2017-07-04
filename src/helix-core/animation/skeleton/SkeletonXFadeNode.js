/**
 * This is generally the node you probably want to be using for simple crossfading between animations.
 * @constructor
 */
import {SkeletonClip} from "./SkeletonClip";
import {SkeletonClipNode} from "./SkeletonClipNode";
import {SkeletonBlendNode} from "./SkeletonBlendNode";
import {MathX as Float4} from "../../math/MathX";

function SkeletonXFadeNode()
{
    SkeletonBlendNode.call(this);
    this._children = [];
    this._numJoints = 0;

    // TODO: Add the possibility to sync times!
    // in this case, the clips should have their timesteps recalculated
};

SkeletonXFadeNode.prototype = Object.create(SkeletonBlendNode.prototype, {
    numJoints: {
        get: function() {return this._numJoints; }
    }
});

SkeletonXFadeNode.prototype.update = function(dt, transferRootJoint)
{
    // TODO: Also updates when the time changes the crossfade factor

    var len = this._children.length;

    // still fading if len > 1
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
            Float4.lerp(delta, childNode._rootJointDeltaPosition, child.weight, delta);

        pose.interpolate(pose, childNode._pose, child.weight);
    }

    return true;
};

/**
 * @param node A SkeletonBlendTreeNode or a clip.
 * @param time In milliseconds
 */
SkeletonXFadeNode.prototype.fadeTo = function(node, time)
{
    if (node instanceof SkeletonClip) node = new SkeletonClipNode(node);

    this._numJoints = node.numJoints;
    // put the new one in front, it makes the update loop more efficient
    this._children.unshift({
        node: node,
        weight: 0.0,
        fadeSpeed: 1 / time
    });
};

export { SkeletonXFadeNode };