/**
 * A node to contain a single clip
 * @param clip
 * @constructor
 */
import {Float4} from "../../math/Float4";
import {SkeletonBlendNode} from "./SkeletonBlendNode";
import {AnimationClipPlayer} from "../AnimationClipPlayer";

function SkeletonClipNode(clip)
{
    SkeletonBlendNode.call(this);
    this._animationClipPlayer = new AnimationClipPlayer(clip);
    this._rootPosition = new Float4();

    var lastFramePos = clip.getKeyFrame(clip.numKeyFrames - 1).value.jointPoses[0].position;
    var firstFramePos = clip.getKeyFrame(0).value.jointPoses[0].position;
    this._clipRootDelta = Float4.subtract(lastFramePos, firstFramePos);
}

SkeletonClipNode.prototype = Object.create(SkeletonBlendNode.prototype,
    {
        numJoints: {
            get: function() { return this._clip.getKeyFrame(0).value.jointPoses.length; }
        },
        timeScale: {
            get: function() { return this._animationClipPlayer.timeScale; },
            set: function(value) { this._animationClipPlayer.timeScale = value; }
        },
        time: {
            get: function() { return this._animationClipPlayer; },
            set: function(value)
            {
                this._animationClipPlayer.time = value;
                this._timeChanged = true;
            }
        }
    });

SkeletonClipNode.prototype.play = function()
{
    this._animationClipPlayer.play();
};

SkeletonClipNode.prototype.stop = function()
{
    this._animationClipPlayer.stop();
};

SkeletonClipNode.prototype.update = function(dt, transferRootJoint)
{
    if (!this._animationClipPlayer.update(dt))
        return false;

    var frameA = this._animationClipPlayer.frame1;
    var frameB = this._animationClipPlayer.frame2;
    var fraction = this._animationClipPlayer.ratio;

    this._pose.interpolate(frameA.value, frameB.value, fraction);

    if (transferRootJoint)
        this._transferRootJointTransform(this._animationClipPlayer.wraps, dt);

    return true;
};

SkeletonClipNode.prototype._transferRootJointTransform = function(numWraps, dt)
{
    var rootBonePos = this._pose.jointPoses[0].position;
    var rootPos = this._rootPosition;
    var rootDelta = this._rootJointDeltaPosition;

    Float4.subtract(rootBonePos, rootPos, rootDelta);

    if (dt > 0 && numWraps > 0) {
        // apply the entire displacement for the amount of times it wrapped
        rootDelta.addScaled(this._clipRootDelta, numWraps);
    }
    else if (dt < 0 && numWraps > 0) {
        // apply the entire displacement for the amount of times it wrapped, in the other direction
        rootDelta.addScaled(this._clipRootDelta, -numWraps);
    }

    this._rootPosition.copyFrom(rootBonePos);
    rootBonePos.set(0.0, 0.0, 0.0);
};

SkeletonClipNode.prototype._applyValue = function(value)
{
    this.time = value * this._clip.duration;
};

export { SkeletonClipNode };