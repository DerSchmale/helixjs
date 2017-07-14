import {SkeletonPose} from "./SkeletonPose";
import {Texture2D} from "../../texture/Texture2D";
import {META, DataType, TextureWrapMode, TextureFilter, TextureFormat} from "../../Helix";
import {Matrix4x4} from "../../math/Matrix4x4";
import {SkeletonJointPose} from "./SkeletonJointPose";

/**
 * @classdesc
 * A SkeletonBlendTree is used by {@linkcode SkeletonAnimation} internally to blend complex animation setups. Using this,
 * we can crossfade between animation clips (such as walking/running) while additionally having extra modifiers applied,
 * such as gun aiming, head turning, etc.
 *
 * @constructor
 * @param {SkeletonBlendNode} rootNode The root node of the tree.
 * @param {Skeleton} skeleton The skeleton to animate.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonBlendTree(rootNode, skeleton)
{
    this._skeleton = skeleton;
    this._rootNode = rootNode;
    this._transferRootJoint = false;
    this._matrices = null;
    this._globalPose = new SkeletonPose();
    this._applyInverseBindPose = true;

    // TODO: Should we hide this stuff in SkeletonPose along with matrices (only used for the global pose), so we can assign a SkeletonPose object to skinned objects
    if (META.OPTIONS.useSkinningTexture) {
        this._texture = new Texture2D();
        this._texture.filter = TextureFilter.NEAREST_NOMIP;
        this._texture.wrapMode = TextureWrapMode.CLAMP;
    }

    if (skeleton) this.skeleton = skeleton;
}

SkeletonBlendTree.prototype =
{
    get transferRootJoint() { return this._transferRootJoint; },
    set transferRootJoint(value) { this._transferRootJoint = value; },

    get applyInverseBindPose() { return this._applyInverseBindPose; },
    set applyInverseBindPose(value) { this._applyInverseBindPose = value; },

    get skeleton() { return this._skeleton; },
    set skeleton(value)
    {
        this._skeleton = value;
        this._matrices = [];
        for (var i = 0; i < value.numJoints; ++i) {
            this._matrices[i] = new Matrix4x4();
            this._globalPose.jointPoses[i] = new SkeletonJointPose();
        }

    },

    get rootJointDeltaPosition() { return this._rootNode.rootJointDeltaPosition; },

    get rootNode() { return this._rootNode; },
    set rootNode(value) { this._rootNode = value; },

    get matrices() { return this._matrices; },

    // only available if HX.OPTIONS.useSkinningTexture is true
    get texture() { return this._texture; },

    setValue: function(id, value)
    {
        this._rootNode.setValue(id, value);
    },

    update: function(dt)
    {
        if (this._rootNode.update(dt, this._transferRootJoint)) {
            this._updateGlobalPose();
            this._updateMatrices();

            if (META.OPTIONS.useSkinningTexture)
                this._updateTexture();

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

        /*var p = new HX.Matrix4x4();
        var c = new HX.Matrix4x4();
        var pp = new HX.Transform();
        var cc = new HX.Transform();
        var sc = new HX.Float4();*/

        for (var i = 0; i < numJoints; ++i) {
            var localJointPose = rootPose[i];
            var globalJointPose = globalPose[i];
            var joint = skeleton.getJoint(i);

            if (joint.parentIndex < 0)
                globalJointPose.copyFrom(localJointPose);
            else {
                var parentPose = globalPose[joint.parentIndex];

                /*pp.position.copyFrom(parentPose.position);
                pp.rotation.copyFrom(parentPose.rotation);
                pp.scale.copyFrom(parentPose.scale);

                cc.position.copyFrom(localJointPose.position);
                cc.rotation.copyFrom(localJointPose.rotation);
                cc.scale.copyFrom(localJointPose.scale);

                p.compose(pp);
                c.compose(cc);
                c.append(p);

                c.decompose(globalJointPose.position, globalJointPose.rotation, globalJointPose.scale);*/

                var gTr = globalJointPose.position;
                var ptr = parentPose.position;
                var pQuad = parentPose.rotation;
                pQuad.rotate(localJointPose.position, gTr);
                gTr.x += ptr.x;
                gTr.y += ptr.y;
                gTr.z += ptr.z;
                globalJointPose.rotation.multiply(pQuad, localJointPose.rotation);
                globalJointPose.scale.x = parentPose.scale.x * localJointPose.scale.x;
                globalJointPose.scale.y = parentPose.scale.y * localJointPose.scale.y;
                globalJointPose.scale.z = parentPose.scale.z * localJointPose.scale.z;
            }
        }
    },

    _updateMatrices: function()
    {
        var len = this._skeleton.numJoints;
        var matrices = this._matrices;
        var poses = this._globalPose.jointPoses;
        var skeleton = this._skeleton;
        for (var i = 0; i < len; ++i) {
            var pose = poses[i];
            var mtx = matrices[i];
            if (this._applyInverseBindPose)
                mtx.copyFrom(skeleton.getJoint(i).inverseBindPose);
            else
                mtx.copyFrom(Matrix4x4.IDENTITY);

            var sc = pose.scale;
            mtx.appendScale(sc.x, sc.y, sc.z);
            mtx.appendQuaternion(pose.rotation);
            mtx.appendTranslation(pose.position);
        }
    },

    _updateTexture: function()
    {
        var len = this._skeleton.numJoints;
        var data = [];

        for (var r = 0; r < 3; ++r) {
            for (var i = 0; i < len; ++i) {
                var m = this._matrices[i]._m;

                data.push(m[r], m[r + 4], m[r + 8], m[r + 12]);
            }

            for (i = len; i < META.OPTIONS.maxSkeletonJoints; ++i) {
                data.push(0, 0, 0, 0);
            }
        }

        this._texture.uploadData(new Float32Array(data), META.OPTIONS.maxSkeletonJoints, 3, false, TextureFormat.RGBA, DataType.FLOAT);
    }
};


export { SkeletonBlendTree };