/**
 * An animation clip for skeletal animation
 * @constructor
 */
HX.SkeletonClip = function()
{
    this._name = null;
    this._frameRate = 0;
    this._frames = [];
    this._transferRootJoint = false;
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

    get frameRate()
    {
        return this._frameRate;
    },

    set frameRate(value)
    {
        this._frameRate = value;
    },

    /**
     *
     * @param frame A SkeletonPose
     */
    addFrame: function(frame)
    {
        this._frames.push(frame);
    },

    get numFrames()
    {
        return this._frames.length;
    },

    getFrame: function(index)
    {
        return this._frames[index];
    },

    get numJoints()
    {
        return this._frames[0].jointPoses.length;
    },

    get duration()
    {
        return this._frames.length / this._frameRate;
    },

    /**
     * If true, the last frame of the clip should be a duplicate of the first, but with the final position offset
     */
    get transferRootJoint()
    {
        return this._transferRootJoint;
    },

    set transferRootJoint(value)
    {
        this._transferRootJoint = value;
    },

    toString: function()
    {
        return "[SkeletonClip(name=" + this.name + ")";
    }
};