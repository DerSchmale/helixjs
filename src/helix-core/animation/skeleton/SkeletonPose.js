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
    numJoints: function()
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
        for (var i = 0; i < skeleton.numJoints; ++i) {
            var j = skeleton.getJoint(i);
            var p = this._jointPoses[i] = new SkeletonJointPose();
            // global bind pose matrix
            m.inverseAffineOf(j.inverseBindPose);

            // local bind pose matrix
            if (j.parentIndex >= 0)
                m.append(skeleton.getJoint(j.parentIndex).inverseBindPose);

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
        this._numJoints = numJointPoses;
        this._jointPoses.length = numJointPoses;
        for (var i = 0; i < numJointPoses; ++i)
            this.setJointPose(i, new SkeletonJointPose());
    },

    /**
     * @ignore
     */
    globalFromLocal: function (local, skeleton)
    {
        var numJoints = skeleton.numJoints;
        var rootPose = local._jointPoses;
        var globalPose = this._jointPoses;

        var m = new HX.Matrix4x4();

        for (var i = 0; i < numJoints; ++i) {
            var localJointPose = rootPose[i];
            var globalJointPose = globalPose[i];
            var joint = skeleton.getJoint(i);

            if (joint.parentIndex < 0)
                globalJointPose.copyFrom(localJointPose);
            else {
                var parentPose = globalPose[joint.parentIndex];

                var pSc = parentPose.scale;
                var gTr = globalJointPose.position;
                var ptr = parentPose.position;
                var pQuad = parentPose.rotation;

                pQuad.rotate(localJointPose.position, gTr);
                gTr.x += ptr.x;
                gTr.y += ptr.y;
                gTr.z += ptr.z;

                m.fromQuaternion(localJointPose.rotation);
                m.appendScale(pSc);
                m.prependScale(pSc);
                m.appendQuaternion(pQuad);

                globalJointPose.rotation.fromMatrix(m);
                globalJointPose.scale.x = pSc.x * localJointPose.scale.x;
                globalJointPose.scale.y = pSc.y * localJointPose.scale.y;
                globalJointPose.scale.z = pSc.z * localJointPose.scale.z;
            }
        }
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
    _generateDefault: function (skeleton)
    {
        if (META.OPTIONS.useSkinningTexture) {
            this._skinningTexture = DEFAULTS.DEFAULT_SKINNING_TEXTURE;
            return;
        }

        this._globalMatrices = [];
        this._bindMatrices = [];
        for (var i = 0; i < skeleton.numJoints; ++i) {
            this._globalMatrices[i] = new Matrix4x4();
            this._bindMatrices[i] = new Matrix4x4();
        }
    },

    /**
     * @ignore
     */
    _updateSkeletonMatrices: function (skeleton)
    {
        var globals;
        var binds;

        if (!globals || globals.length !== skeleton.numJoints) {
            this._generateGlobalSkeletonData(skeleton);
            globals = this._globalMatrices;
            binds = this._bindMatrices;
        }

        var len = skeleton.numJoints;

        for (var i = 0; i < len; ++i) {
            var pose = this._jointPoses[i];
            var global = globals[i];
            var joint = skeleton.getJoint(i);
            var parentIndex = joint.parentIndex;

            global.compose(pose);

            if (parentIndex !== -1)
                global.append(globals[parentIndex]);

            if (skeleton._applyInverseBindPose) {
                binds[i].multiplyAffine(global, joint.inverseBindPose);
            }
            else {
                binds[i].copyFrom(global);
            }
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

        for (var i = 0; i < skeleton.numJoints; ++i) {
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
        var data = [];
        var globals = this._bindMatrices;
        var len = globals.length;

        for (var r = 0; r < 3; ++r) {
            for (var i = 0; i < len; ++i) {
                var m = globals[i]._m;

                data.push(m[r], m[r + 4], m[r + 8], m[r + 12]);
            }

            for (i = len; i < META.OPTIONS.maxSkeletonJoints; ++i) {
                data.push(0, 0, 0, 0);
            }
        }

        this._skinningTexture.uploadData(new Float32Array(data), META.OPTIONS.maxSkeletonJoints, 3, false, TextureFormat.RGBA, DataType.FLOAT);
    }
};

export {SkeletonPose};