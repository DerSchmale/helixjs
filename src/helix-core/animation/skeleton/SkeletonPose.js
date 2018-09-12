import {SkeletonJointPose} from "./SkeletonJointPose";
import {Matrix4x4} from "../../math/Matrix4x4";
import {DataType, DEFAULTS, META, TextureFilter, TextureFormat, TextureWrapMode} from "../../Helix";
import {Texture2D} from "../../texture/Texture2D";


/**
 * @classdesc
 * SkeletonPose represents an entire pose a {@linkcode Skeleton} can have. Usually, several poses are interpolated to create animations.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonPose()
{
    this._jointPoses = [];

    this._skinningTexture = null;
    // "global" is in fact model space
    this._globalMatrices = null;
    this._bindMatrices = null;
    this._skeletonMatricesInvalid = true;
}

SkeletonPose.prototype = {
    /**
     * The number of joint poses.
     */
    get numJoints()
    {
        return this._jointPoses.length;
    },

    /**
     * Returns the joint pose at a given position
     */
    getJointPose: function(index)
    {
        return this._jointPoses[index];
    },

    /**
     * Assigns a joint pose.
     */
    setJointPose: function(index, value)
    {
        this._jointPoses[index] = value;
        value.skeletonPose = this;
    },

    /**
     * Lets the engine know the pose has been updated
     */
    invalidateGlobalPose: function()
    {
        this._skeletonMatricesInvalid = true;
    },

    /**
     * Interpolates between two poses and stores it in the current
     * @param a
     * @param b
     * @param factor
     */
    interpolate: function (a, b, factor)
    {
        a = a._jointPoses;
        b = b._jointPoses;
        var len = a.length;

        if (this._jointPoses.length !== len)
            this._initJointPoses(len);

        var target = this._jointPoses;
        for (var i = 0; i < len; ++i) {
            var t = target[i];
            t.rotation.slerp(a[i].rotation, b[i].rotation, factor);
            t.position.lerp(a[i].position, b[i].position, factor);
            t.scale.lerp(a[i].scale, b[i].scale, factor);
        }
    },

    /**
     * Grabs the inverse bind pose data from a skeleton and generates a local pose from it
     * @param skeleton
     */
    copyBindPose: function (skeleton)
    {
        var m = new Matrix4x4();
		var joints = skeleton.joints;
        for (var i = 0, len = joints.length; i < len; ++i) {
            var j = joints[i];
            var p = this._jointPoses[i] = new SkeletonJointPose();
            // global bind pose matrix
            m.inverseAffineOf(j.inverseBindPose);

            // local bind pose matrix
            if (j.parentIndex >= 0)
                m.append(joints[j.parentIndex].inverseBindPose);

            m.decompose(p);
        }
    },

    /**
     * Copies another pose.
     */
    copyFrom: function (a)
    {
        a = a._jointPoses;
        var target = this._jointPoses;
        var len = a.length;

        if (this._jointPoses.length !== len)
            this._initJointPoses(len);

        for (var i = 0; i < len; ++i)
            target[i].copyFrom(a[i]);
    },

    /**
     * @ignore
     */
    _initJointPoses: function (numJointPoses)
    {
        this._jointPoses.length = numJointPoses;
        for (var i = 0; i < numJointPoses; ++i)
            this.setJointPose(i, new SkeletonJointPose());
    },

    /**
     * @ignore
     */
    getBindMatrices: function(skeleton)
    {
        if (this._skeletonMatricesInvalid || this._skeleton !== skeleton)
            this._updateSkeletonMatrices(skeleton);

        this._skeleton = skeleton;

        return this._skinningTexture || this._bindMatrices;
    },

    /**
     * @ignore
     */
    _updateSkeletonMatrices: function (skeleton)
    {
        var globals = this._globalMatrices;
        var binds = this._bindMatrices;
		var joints = skeleton.joints;
		var len = joints.length;

        if (!globals || globals.length !== len) {
            this._generateGlobalSkeletonData(skeleton);
            globals = this._globalMatrices;
            binds = this._bindMatrices;
        }

        for (var i = 0; i < len; ++i) {
            var pose = this._jointPoses[i];
            var global = globals[i];

            var joint = joints[i];
            var parentIndex = joint.parentIndex;

            global.compose(pose);

            if (parentIndex !== -1)
                global.append(globals[parentIndex]);

            if (skeleton.applyInverseBindPose)
                binds[i].multiplyAffine(global, joint.inverseBindPose);
            else
                binds[i].copyFrom(global);
        }

        if (META.OPTIONS.useSkinningTexture)
            this._updateSkinningTexture();
    },

    /**
     * @ignore
     * @private
     */
    _generateGlobalSkeletonData: function (skeleton)
    {
        this._globalMatrices = [];
        this._bindMatrices = [];

        for (var i = 0, len = skeleton.joints.length; i < len; ++i) {
            this._globalMatrices[i] = new Matrix4x4();
            this._bindMatrices[i] = new Matrix4x4();
        }

        if (META.OPTIONS.useSkinningTexture) {
            this._skinningTexture = new Texture2D();
            this._skinningTexture.filter = TextureFilter.NEAREST_NOMIP;
            this._skinningTexture.wrapMode = TextureWrapMode.CLAMP;
        }
    },

    /**
     * @ignore
     * @private
     */
    _updateSkinningTexture: function ()
    {
        var data;

        return function()
        {
            data = data || new Float32Array(META.OPTIONS.maxSkeletonJoints * 3 * 4);
            var globals = this._bindMatrices;
            var len = globals.length;
            var j = 0;

            for (var r = 0; r < 3; ++r) {
                for (var i = 0; i < len; ++i) {
                    var m = globals[i]._m;

                    data[j++] = m[r];
                    data[j++] = m[r + 4];
                    data[j++] = m[r + 8];
                    data[j++] = m[r + 12];
                }

                for (i = len; i < META.OPTIONS.maxSkeletonJoints; ++i) {
                    data[j++] = 0.0;
                    data[j++] = 0.0;
                    data[j++] = 0.0;
                    data[j++] = 0.0;
                }
            }

            this._skinningTexture.uploadData(data, META.OPTIONS.maxSkeletonJoints, 3, false, TextureFormat.RGBA, DataType.FLOAT);
        }
    }(),

    clone: function()
    {
        var clone = new SkeletonPose();
        clone.copyFrom(this);
        return clone;
    }
};

export {SkeletonPose};