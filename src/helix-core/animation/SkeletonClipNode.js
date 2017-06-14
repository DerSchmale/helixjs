
/**
 *
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
};

HX.SkeletonClipNode.prototype = Object.create(HX.SkeletonBlendNode.prototype,
    {
        numJoints: {
            get: function() { return this._clip.numJoints; }
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
    var clip = this._clip;
    var lastFramePos = clip.getKeyFrame(clip.numKeyFrames - 1).value.jointPoses[0].position;
    var firstFramePos = clip.getKeyFrame(0).value.jointPoses[0].position;

    var currentPos = this._pose.jointPoses[0].position;
    var rootPos = this._rootPosition;
    var rootDelta = this._rootJointDeltaPosition;

    if (dt > 0 && numWraps > 0) {
        rootDelta.x = lastFramePos.x - rootPos.x + currentPos.x - firstFramePos.x + (lastFramePos.x - firstFramePos.x) * (numWraps - 1);
        rootDelta.y = lastFramePos.y - rootPos.y + currentPos.y - firstFramePos.y + (lastFramePos.y - firstFramePos.y) * (numWraps - 1);
        rootDelta.z = lastFramePos.z - rootPos.z + currentPos.z - firstFramePos.z + (lastFramePos.z - firstFramePos.z) * (numWraps - 1);
    }
    else if (numWraps > 0) {
        rootDelta.x = firstFramePos.x - rootPos.x + currentPos.x - lastFramePos.x + (firstFramePos.x - lastFramePos.x) * (numWraps - 1);
        rootDelta.y = firstFramePos.y - rootPos.y + currentPos.y - lastFramePos.y + (firstFramePos.y - lastFramePos.y) * (numWraps - 1);
        rootDelta.z = firstFramePos.z - rootPos.z + currentPos.z - lastFramePos.z + (firstFramePos.z - lastFramePos.z) * (numWraps - 1);
    }
    else { // no wraps
        rootDelta.x = currentPos.x - rootPos.x;
        rootDelta.y = currentPos.y - rootPos.y;
        rootDelta.z = currentPos.z - rootPos.z;
    }

    this._rootPosition.copyFrom(currentPos);
    currentPos.set(0.0, 0.0, 0.0);
};

HX.SkeletonClipNode.prototype._applyValue = function(value)
{
    this.time = value * this._clip.duration;
};