/**
 * A node to contain a single clip
 * @param clip
 * @constructor
 */
HX.SkeletonClipNode = function(clip)
{
    HX.SkeletonBlendNode.call(this);
    this._clip = clip;
    this._timeScale = 1.0;
    this._isPlaying = true;
    this._time = 0;
    this._currentFrameIndex = 0;
    this._rootPosition = new HX.Float4();

    var lastFramePos = clip.getKeyFrame(clip.numKeyFrames - 1).value.jointPoses[0].position;
    var firstFramePos = clip.getKeyFrame(0).value.jointPoses[0].position;
    this._clipRootDelta = HX.Float4.subtract(lastFramePos, firstFramePos);
};

HX.SkeletonClipNode.prototype = Object.create(HX.SkeletonBlendNode.prototype,
    {
        numJoints: {
            get: function() { return this._clip.getKeyFrame(0).value.jointPoses.length; }
        },
        timeScale: {
            get: function() { return this._timeScale; },
            set: function(value) { this._timeScale = value; }
        },
        time: {
            get: function() { return this._time; },
            set: function(value)
            {
                this._time = value;
                this._timeChanged = true;
            }
        }
    });

HX.SkeletonClipNode.prototype.play = function()
{
    this._isPlaying = true;
};

HX.SkeletonClipNode.prototype.stop = function()
{
    this._isPlaying = false;
};

HX.SkeletonClipNode.prototype.update = function(dt, transferRootJoint)
{
    if ((!this._isPlaying || dt === 0.0) && !this._timeChanged)
        return false;

    this._timeChanged = false;

    if (this._isPlaying) {
        dt *= this._timeScale;
        this._time += dt;
    }

    var clip = this._clip;
    // the last keyframe is just an "end marker" to interpolate with, it has no duration
    var numKeyFrames = clip.numKeyFrames;
    var numBaseFrames = numKeyFrames - 1;
    var duration = clip.duration;
    var wraps = 0;


    var frameA, frameB;

    if (dt > 0) {
        // todo: should be able to simply do this by division
        while (this._time >= duration) {
            // reset playhead to make sure progressive update logic works
            this._currentFrameIndex = 0;
            this._time -= duration;
            ++wraps;
        }
        //  old     A            B
        //  new                  A           B
        //  frames: 0           10          20          30
        //  time:         x   ----->   x
        do {
            // advance play head
            if (++this._currentFrameIndex === numKeyFrames) this._currentFrameIndex = 0;
            frameB = clip.getKeyFrame(this._currentFrameIndex);
        } while (frameB.time < this._time);

        --this._currentFrameIndex;
        frameA = clip.getKeyFrame(this._currentFrameIndex);
    }
    else {
        while (this._time < 0) {
            // reset playhead to make sure progressive update logic works
            this._currentFrameIndex = numBaseFrames;
            this._time += duration;
            ++wraps;
        }

        //  old     A            B
        //  new                  A           B
        //  frames: 0           10          20          30
        //  time:         x   <-----   x
        // advance play head
        ++this._currentFrameIndex;
        do {
            if (--this._currentFrameIndex < 0) this._currentFrameIndex = numKeyFrames;
            frameA = clip.getKeyFrame(this._currentFrameIndex);
        } while (frameA.time > this._time);
    }

    var fraction = (this._time - frameA.time) / (frameB.time - frameA.time);

    this._pose.interpolate(frameA.value, frameB.value, fraction);

    if (transferRootJoint)
        this._transferRootJointTransform(wraps, dt);

    return true;
};

HX.SkeletonClipNode.prototype._transferRootJointTransform = function(numWraps, dt)
{
    var rootBonePos = this._pose.jointPoses[0].position;
    var rootPos = this._rootPosition;
    var rootDelta = this._rootJointDeltaPosition;

    HX.Float4.subtract(rootBonePos, rootPos, rootDelta);

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

HX.SkeletonClipNode.prototype._applyValue = function(value)
{
    this.time = value * this._clip.duration;
};