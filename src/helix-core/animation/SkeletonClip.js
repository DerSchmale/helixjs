/**
 * An animation clip for skeletal animation
 * @constructor
 */
HX.SkeletonClip = function()
{
    this._name = null;
    this._keyFrames = [];
    this._duration = 0;
};

HX.SkeletonClip.prototype =
{
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
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

    get numKeyFrames()
    {
        return this._keyFrames.length;
    },

    getKeyFrame: function(index)
    {
        return this._keyFrames[index];
    },

    get numJoints()
    {
        return this._keyFrames[0].jointPoses.length;
    },

    get duration()
    {
        return this._duration;
    },

    toString: function()
    {
        return "[SkeletonClip(name=" + this.name + ")";
    }
};