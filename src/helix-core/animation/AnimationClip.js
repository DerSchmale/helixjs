/**
 *
 * @constructor
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
    get looping()
    {
        return this._looping;
    },

    set looping(value)
    {
        this._looping = value;
    },

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    get numKeyFrames()
    {
        return this._keyFrames.length;
    },

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
     * Only call this if for some reason the keyframes were added out of order.
     */
    sortKeyFrames: function()
    {
        this._keyFrames.sort(function(a, b) {
            return a.time - b.time;
        });
    },

    getKeyFrame: function(index)
    {
        return this._keyFrames[index];
    },

    toString: function()
    {
        return "[AnimationClip(name=" + this.name + ")";
    }
};

export { AnimationClip };