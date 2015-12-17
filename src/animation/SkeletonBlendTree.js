/**
 *
 * @constructor
 */
HX.SkeletonBlendNode = function()
{
    this._rootJointDeltaPosition = new HX.Float4();
    this._valueID = null;
    this._poseInvalid = true;
    this._parentNode = null;
    this._pose = new HX.SkeletonPose();
    this._rootPosition = new HX.Float4();
};

HX.SkeletonBlendNode.prototype =
{
    // child nodes should ALWAYS be requested to update first
    update: function(dt)
    {
        if (this._poseInvalid) {
            this._updatePose(dt);
            this._poseInvalid = false;
        }
    },

    setValue: function(id, value) {},   // a node can have a value associated with it, either time, interpolation value, directional value, ...

    get rootJointDeltaPosition() { return this._rootJointDeltaPosition; },
    get duration() { return -1; },
    get numJoints() { return -1; },

    // the id used to set values
    get valueID() { return this._valueID; },
    set valueID(value) { this._valueID = value; },

    _invalidatePose: function()
    {
        this._poseInvalid = true;
        if (this._parentNode) this._parentNode._invalidatePose();
    },

    _updatePose: function(dt) {}
};

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
    this._playing = true;
    this._time = 0;
};

HX.SkeletonClipNode.prototype = Object.create(HX.SkeletonBlendNode.prototype,
    {
        duration: {
            get: function() { return this._clip.duration; }
        },
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
                this._invalidatePose();
            }
        }
    });

// the value of this node is a ratio in the time
HX.SkeletonClipNode.prototype.update = function(dt)
{
    if (this._playing && dt > 0) this._invalidatePose();
    HX.SkeletonBlendNode.prototype.update.call(this, dt);
};

HX.SkeletonClipNode.prototype._updatePose = function(dt)
{
    dt *= this._timeScale;
    this._time += dt/1000.0;

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
};

HX.SkeletonClipNode.prototype._transferRootJointTransform = function(numWraps)
{
    var clip = this._clip;
    var lastFramePos = clip.getFrame(clip.numFrames - 1).jointPoses[0].translation;
    var firstFramePos = clip.getFrame(0).jointPoses[0].translation;

    var currentPos = this._pose.jointPoses[0].translation;
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

HX.SkeletonClipNode.prototype.setValue = function(id, value)
{
    if (this._valueID == id)
        this.time = value * this._clip.duration;
};

/**
 *
 * @constructor
 */
HX.SkeletonBlendTree = function(rootNode, skeleton)
{
    this._skeleton = skeleton;
    this._rootNode = rootNode;
    this._matrices = null;
    this._globalPose = new HX.SkeletonPose();
    if (skeleton) this.skeleton = skeleton;
};

HX.SkeletonBlendTree.prototype =
{
    get skeleton() { return this._skeleton; },
    set skeleton(value)
    {
        this._skeleton = value;
        this._matrices = [];
        for (var i = 0; i < value.numJoints; ++i) {
            this._matrices[i] = new HX.Matrix4x4();
            this._globalPose.jointPoses[i] = new HX.SkeletonJointPose();
        }

    },

    get rootNode() { return this._rootNode; },
    set rootNode(value) { this._rootNode = value; },

    get matrices() { return this._matrices; },

    update: function(dt)
    {
        this._rootNode.update(dt);

        // TODO: only update these if anything in rootNode was updated
        this._updateGlobalPose();
        this._updateMatrices();
    },

    _updateGlobalPose: function()
    {
        var skeleton = this._skeleton;
        var numJoints = skeleton.numJoints;
        var rootPose = this._rootNode._pose.jointPoses;
        var globalPose = this._globalPose.jointPoses;

        for (var i = 0; i < numJoints; ++i) {
            var localJointPose = rootPose[i];
            var globalJointPose = globalPose[i];
            var joint = skeleton.getJoint(i);

            if (joint.parentIndex < 0)
                globalJointPose.copyFrom(localJointPose);
            else {
                var parentPose = globalPose[joint.parentIndex];
                var tr = globalJointPose.translation;
                var ptr = parentPose.translation;
                var pQuad = parentPose.orientation;
                pQuad.rotate(localJointPose.translation, tr);
                tr.x += ptr.x;
                tr.y += ptr.y;
                tr.z += ptr.z;
                globalJointPose.orientation.product(pQuad, localJointPose.orientation);
            }
        }
    },

    _updateMatrices: function()
    {
        var len = this._skeleton.numJoints;
        var matrices = this._matrices;
        var pose = this._globalPose.jointPoses;
        var skeleton = this._skeleton;
        for (var i = 0; i < len; ++i) {
            var tr = pose[i].translation;
            var mtx = matrices[i];
            mtx.copyFrom(skeleton.getJoint(i).inverseBindPose);
            mtx.appendRotationQuaternion(pose[i].orientation);
            mtx.appendTranslation(tr.x, tr.y, tr.z);
        }
    }
};
