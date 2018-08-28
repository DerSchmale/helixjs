import {Float4} from "../../math/Float4";
import {SkeletonBlendNode} from "./SkeletonBlendNode";
import {AnimationPlayhead} from "../AnimationPlayhead";

/**
 * @classdesc
 * A node in a SkeletonBlendTree to contain a single animation clip. An AnimationClip on its own is simply a resource and
 * does not contain playback state so it can be used across different animation instances. That relevant state is kept here.
 *
 * @property {number} playbackRate A value to control the playback speed.
 * @property {number} time The current time in milliseconds of the play head.
 *
 * @param {AnimationClip} clip The animation clip to be played.
 * @constructor
 *
 * @extends  SkeletonBlendNode
 *
 * @see {@linkcode AnimationClip}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonClipNode(clip)
{
    SkeletonBlendNode.call(this);
    this._playhead = new AnimationPlayhead(clip);
    this._rootPosition = new Float4();

    this.name = clip.name;
    this.numJoints = clip.getKeyFrame(0).value._jointPoses.length;

    var lastFramePos = clip.getKeyFrame(clip.numKeyFrames - 1).value._jointPoses[0].position;
    var firstFramePos = clip.getKeyFrame(0).value._jointPoses[0].position;
    this._clipRootDelta = Float4.subtract(lastFramePos, firstFramePos);
}

SkeletonClipNode.prototype = Object.create(SkeletonBlendNode.prototype,
    {
        /**
         * Determines whether the animation should loop or not. By default, it uses the value determined by the
         * AnimationClip, but can be overridden.
         */
        looping: {
            get: function() { return this._playhead.looping; },
            set: function(value) { this._playhead.looping = value; }
        },

        /**
         * The duration of the clip.
         */
        duration: {
            get: function() { return this._clip.duration; }
        },

        playbackRate: {
            get: function() { return this._playhead.playbackRate; },
            set: function(value) { this._playhead.playbackRate = value; }
        },

        time: {
            get: function() { return this._playhead.time; },
            set: function(value)
            {
                this._playhead.time = value;
            }
        }
    });

/**
 * Starts playback.
 */
SkeletonClipNode.prototype.play = function()
{
    this._playhead.play();
};

/**
 * Pauses playback.
 */
SkeletonClipNode.prototype.stop = function()
{
    this._playhead.stop();
};

/**
 * @ignore
 */
SkeletonClipNode.prototype.update = function(dt, transferRootJoint)
{
    if (!this._playhead.update(dt))
        return false;

    var playhead = this._playhead;

    this.pose.interpolate(playhead.frame1.value, playhead.frame2.value, playhead.ratio);

    if (transferRootJoint)
        this._transferRootJointTransform(playhead.wraps, dt);

    return true;
};

/**
 * @ignore
 */
SkeletonClipNode.prototype._transferRootJointTransform = function(numWraps, dt)
{
    var rootJointPos = this.pose._jointPoses[0].position;
    var rootPos = this._rootPosition;
    var rootDelta = this.rootJointDeltaPosition;

    Float4.subtract(rootJointPos, rootPos, rootDelta);

    if (dt > 0 && numWraps > 0) {
        // apply the entire displacement for the amount of times it wrapped
        rootDelta.addScaled(this._clipRootDelta, numWraps);
    }
    else if (dt < 0 && numWraps > 0) {
        // apply the entire displacement for the amount of times it wrapped, in the other direction
        rootDelta.addScaled(this._clipRootDelta, -numWraps);
    }

    this._rootPosition.copyFrom(rootJointPos);
    rootJointPos.set(0.0, 0.0, 0.0);
};

SkeletonClipNode.prototype._queryChildren = function(name)
{
    // this is a leaf node
    return null;
};

export { SkeletonClipNode };