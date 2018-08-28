import {KeyFrame} from "./KeyFrame";

var nameCounter = 0;

/**
 * @classdesc
 * AnimationClip is a resource that contains key frames (time / value pairs). AnimationClip itself has no playback state,
 * but is only used as a shareable data resource. It can be passed to {@linkcode AnimationPlayhead} or its wrappers
 * (fe: {@linkcode SkeletonClipNode}) which will manage the play head position and allow animations.
 *
 * @constructor
 *
 * @see {@linkcode KeyFrame}
 * @see {@linkcode AnimationPlayhead}
 *
 * @property duration The total duration of the clip, in milliseconds.
 * @property name The name of the animation clip.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationClip()
{
    this.duration = 0;
    this.name = "hx_animationclip_" + (nameCounter++);
    this._keyFrames = [];
    this._looping = true;
    this._framesInvalid = true;
}

AnimationClip.prototype =
{
    /**
     * Defines whether this clip should repeat or not.
     */
    get looping()
    {
        return this._looping;
    },

    set looping(value)
    {
        this._looping = value;
    },

    /**
     * The amount of key frames in this clip.
     */
    get numKeyFrames()
    {
        return this._keyFrames.length;
    },

    /**
     * Adds a keyframe. Last keyframe is usually the same pose as the first and serves as an "end marker"
     * @param frame A KeyFrame containing a SkeletonPose
     */
    addKeyFrame: function(frame)
    {
        this._framesInvalid = true;
        this._keyFrames.push(frame);
        if (frame.time > this.duration) this.duration = frame.time;
    },

    /**
     * @ignore
     */
    _updateFrames: function()
    {
        this._keyFrames.sort(function(a, b) {
            return a.time - b.time;
        });

        // make sure first and last frame is 0-based by clamping
        var first = this._keyFrames[0];
        var last = this._keyFrames[this._keyFrames.length - 1];

        if (first.time > 0)
            this._keyFrames.unshift(new KeyFrame(0, first.value));

        // this can happen if we explicitly set the duration to be longer, need to clamp final keyframe
        if (last.time < this.duration)
            this._keyFrames.push(new KeyFrame(this.duration, last.value));

        this._framesInvalid = false;
    },

    /**
     * Returns the key frame with the given index.
     */
    getKeyFrame: function(index)
    {
        if (this._framesInvalid)
            this._updateFrames();


        return this._keyFrames[index];
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[AnimationClip(name=" + this.name + ")";
    }
};

export { AnimationClip };