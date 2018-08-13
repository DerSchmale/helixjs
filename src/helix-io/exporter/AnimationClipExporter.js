import * as HX from "helix";
import {DataOutputStream} from "../core/DataOutputStream";

/**
 * @classdesc
 * AnimationClipExporter exports to Helix's own .hclip format.
 *
 * File format:
 *
 * <HEADER>
 * file hash "HX_ANIM" as string (7 bytes)
 * version data: 3 unsigned shorts (major, minor, patch)
 * unsigned byte: valueType (1 = SkeletonPose)
 * unsigned int: numFrames
 *
 * <valueType dependent data>
 *     SkeletonPose:
 *      - unsigned byte: numJoints
 *
 * <FRAMES> #numFrames block of data
 *     unsigned int: time (ms)
 *     any data[varying]: depends on value-type, for SkeletonPose: numJoints triplets of float3, float4, float3 for
 *     translation (3 floats), rotation (4 floats), scale (3 floats).
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationClipExporter()
{

}

AnimationClipExporter.VERSION = "0.1.0";

AnimationClipExporter.VALUE_TYPE_SKELETON_POSE = 1;
AnimationClipExporter.VALUE_TYPE_NUMBER = 2;
AnimationClipExporter.VALUE_TYPE_FLOAT3 = 3;
AnimationClipExporter.VALUE_TYPE_QUATERNION = 4;

AnimationClipExporter.prototype =
{
    // returns an ArrayBuffer object
    // TODO: support layered animations in some way
    export: function(clip)
    {
        var valueType = this._getValueType(clip);
        var size = this._calculateFileSize(clip, valueType);
        var buffer = new ArrayBuffer(size);
        var dataView = new DataView(buffer);
        var dataStream = new DataOutputStream(dataView);

        var version = AnimationClipExporter.VERSION.split(".");
        dataStream.writeString("HX_CLIP");
        dataStream.writeUint16Array(version);

        dataStream.writeUint8(valueType);

        var numFrames = clip.numKeyFrames;
        dataStream.writeUint32(numFrames);

        if (valueType === AnimationClipExporter.VALUE_TYPE_SKELETON_POSE) {
            var keyFrame = clip.getKeyFrame(0);
            var value = keyFrame.value;
            dataStream.writeUint8(value.numJoints);
        }
        else {
            // reserve some data for the future
            dataStream.writeUint8(0);
        }

        for (var i = 0; i < numFrames; ++i) {
            keyFrame = clip.getKeyFrame(i);
            dataStream.writeUint32(keyFrame.time);
            this._writeValue(dataStream, valueType, keyFrame.value);
        }

        return buffer;
    },

    _getValueType: function(clip)
    {
        var keyFrame = clip.getKeyFrame(0);
        var value = keyFrame.value;

        if (value instanceof HX.SkeletonPose)
            return AnimationClipExporter.VALUE_TYPE_SKELETON_POSE;
        if (value instanceof HX.Float4)
            return AnimationClipExporter.VALUE_TYPE_FLOAT3;
        if (value instanceof HX.Quaternion)
            return AnimationClipExporter.VALUE_TYPE_QUATERNION;
        if (typeof value === "number")
            return AnimationClipExporter.VALUE_TYPE_NUMBER;


        throw new Error("Unsupported animation clip");
    },

    _writeValue: function(dataStream, type, value)
    {
        if (type === AnimationClipExporter.VALUE_TYPE_SKELETON_POSE) {
            var len = value.numJoints;
            for (var i = 0; i < len; ++i) {
                var pose = value.getJointPose(i);
                dataStream.writeFloat32(pose.position.x);
                dataStream.writeFloat32(pose.position.y);
                dataStream.writeFloat32(pose.position.z);
                dataStream.writeFloat32(pose.rotation.x);
                dataStream.writeFloat32(pose.rotation.y);
                dataStream.writeFloat32(pose.rotation.z);
                dataStream.writeFloat32(pose.rotation.w);
                dataStream.writeFloat32(pose.scale.x);
                dataStream.writeFloat32(pose.scale.y);
                dataStream.writeFloat32(pose.scale.z);
            }
        }
        else if (type === AnimationClipExporter.VALUE_TYPE_FLOAT3) {
            dataStream.writeFloat32(value.x);
            dataStream.writeFloat32(value.y);
            dataStream.writeFloat32(value.z);
        }
        else if (type === AnimationClipExporter.VALUE_TYPE_QUATERNION) {
            dataStream.writeFloat32(value.x);
            dataStream.writeFloat32(value.y);
            dataStream.writeFloat32(value.z);
            dataStream.writeFloat32(value.w);
        }
        else if (type === AnimationClipExporter.VALUE_TYPE_NUMBER) {
            dataStream.writeFloat32(value);
        }
    },

    _calculateFileSize: function(clip, valueType)
    {
        var size = 7;   // hash "HX_CLIP"
        size += 2 * 3;  // version (3 shorts)
        size += 1;      // value type
        size += 4;      // numFrames
        size += 1;      // meta

        var keyFrameSize = this._calculateKeyFrameSize(valueType, clip);
        size += clip.numKeyFrames * keyFrameSize;
        return size;
    },

    _calculateKeyFrameSize: function(type, clip)
    {
        var size = 4;   // time;

        if (type === AnimationClipExporter.VALUE_TYPE_SKELETON_POSE) {
            var numJoints = clip.getKeyFrame(0).value.numJoints;
            size += numJoints * 10 * 4;     // 10 floats per joint
        }
        else if (type === AnimationClipExporter.VALUE_TYPE_FLOAT3)
            size += 3 * 4;  // 3 floats
        else if (type === AnimationClipExporter.VALUE_TYPE_QUATERNION)
            size += 4 * 4;  // 4 floats
        else if (type === AnimationClipExporter.VALUE_TYPE_NUMBER)
            size += 4;      // 1 float
        return size;
    }
};

export { AnimationClipExporter };