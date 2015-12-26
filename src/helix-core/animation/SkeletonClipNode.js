
/**
 *
 * @param clip
 * @constructor
 */
HX.SkeletonClipNode = function(clip)
{
    HX.SkeletonBlendNode.call(this);
    this._clip = clip;
    this._interpolate = true;
    this._timeScale = 1.0;
    this._isPlaying = true;
    this._time = 0;
};

HX.SkeletonClipNode.prototype = Object.create(HX.SkeletonBlendNode.prototype,
    {
        numJoints: {
            get: function() { return this._clip.numJoints; }
        },
        interpolate: {
            get: function() { return this._interpolate; },
            set: function(value) { this._interpolate = value; }
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

HX.SkeletonClipNode.prototype.update = function(dt)
{
    if ((!this._isPlaying || dt === 0.0) && !this._timeChanged)
        return false;

    this._timeChanged = false;

    if (this._isPlaying) {
        dt *= this._timeScale;
        this._time += dt/1000.0;
    }

    var clip = this._clip;
    var numBaseFrames = clip._transferRootJoint? clip.numFrames - 1 : clip.numFrames;
    var duration = numBaseFrames / clip.frameRate;
    var wraps = 0;

    while (this._time >= duration) {
        this._time -= duration;
        ++wraps;
    }
    while (this._time < 0) {
        this._time += duration;
        ++wraps;
    }

    var frameFactor = this._time * clip.frameRate;
    var firstIndex = Math.floor(frameFactor);
    var poseA = clip.getFrame(firstIndex);

    if (this._interpolate) {
        var secondIndex = firstIndex == clip.numFrames - 1? 0 : firstIndex + 1;
        var poseB = clip.getFrame(secondIndex);
        this._pose.interpolate(poseA, poseB, frameFactor - firstIndex);
    }
    else {
        this._pose.copyFrom(poseA);
    }

    if (clip._transferRootJoint)
        this._transferRootJointTransform(wraps);

    return true;
};

HX.SkeletonClipNode.prototype._transferRootJointTransform = function(numWraps)
{
    var clip = this._clip;
    var lastFramePos = clip.getFrame(clip.numFrames - 1).jointPoses[0].position;
    var firstFramePos = clip.getFrame(0).jointPoses[0].position;

    var currentPos = this._pose.jointPoses[0].position;
    var rootPos = this._rootPosition;
    var rootDelta = this._rootJointDeltaPosition;

    if (this._timeScale > 0 && numWraps > 0) {
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