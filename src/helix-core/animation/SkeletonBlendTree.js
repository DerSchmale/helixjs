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

    get rootJointDeltaPosition() { return this._rootNode.rootJointDeltaPosition; },

    get rootNode() { return this._rootNode; },
    set rootNode(value) { this._rootNode = value; },

    get matrices() { return this._matrices; },

    update: function(dt)
    {
        if (this._rootNode.update(dt)) {
            this._updateGlobalPose();
            this._updateMatrices();
            return true;
        }
        return false;
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
