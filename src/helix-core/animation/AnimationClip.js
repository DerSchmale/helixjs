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
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationClip()
{
    this._name = null;
    this._keyFrames = [];
    this._duration = 0;
    this._looping = true;
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
     * The name of the animation clip.
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
     * The amount of key frames in this clip.
     */
    get numKeyFrames()
    {
        return this._keyFrames.length;
    },

    /**
     * The total duration of the clip, in milliseconds.
     */
    get duration()
    {
        return this._duration;
    },

    /**
     * Adds a keyframe. Last keyframe is usually the same pose as the first and serves as an "end marker"
     * @param frame A KeyFrame containing a SkeletonPose
     */
    addKeyFrame: function(frame)
    {
        this._keyFrames.push(frame);
        if (frame.time > this._duration) this._duration = frame.time;
    },

    /**
     * Sorts the key frames based on their time. Only call this if for some reason the keyframes were added out of order.
     */
    sortKeyFrames: function()
    {
        this._keyFrames.sort(function(a, b) {
            return a.time - b.time;
        });
    },

    /**
     * Returns the key frame with the given index.
     */
    getKeyFrame: function(index)
    {
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