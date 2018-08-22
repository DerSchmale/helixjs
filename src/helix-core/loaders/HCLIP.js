import {Importer} from "./Importer";
import {URLLoader} from "./URLLoader";
import {DataStream} from "../core/DataStream";
import {AnimationClip} from "../animation/AnimationClip";
import {SkeletonPose} from "../animation/skeleton/SkeletonPose";
import {SkeletonJointPose} from "../animation/skeleton/SkeletonJointPose";

/**
 * @classdesc
 * HCLIP is an Importer for Helix' (binary) animation clip format. Yields an {@linkcode AnimationClip} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HCLIP()
{
    Importer.call(this, AnimationClip, URLLoader.DATA_BINARY);
}

HCLIP.prototype = Object.create(Importer.prototype);

HCLIP.VERSION = "0.1.0";

HCLIP.VALUE_TYPE_SKELETON_POSE = 1;
HCLIP.VALUE_TYPE_NUMBER = 2;
HCLIP.VALUE_TYPE_FLOAT3 = 3;
HCLIP.VALUE_TYPE_QUATERNION = 4;


HCLIP.prototype.parse = function(data, target)
{
    var stream = new DataStream(data);

    var hash = stream.getString(7);
    if (hash !== "HX_CLIP")
        throw new Error("Invalid file hash!");

    var version = stream.getUint16Array(3).join(".");
    // pointless to check this now, only know when to support which versions in the future
    // if (version !== HCLIP.VERSION)
    //     throw new Error("Unsupported file version!");

// figure out type:
    var valueType = stream.getUint8();
    var numFrames = stream.getUint32();
    var info = stream.getUint8(); // numJoints in SkeletonPose

    for (var i = 0; i < numFrames; ++i) {
        var keyFrame = new HX.KeyFrame();
        keyFrame.time = stream.getUint32();
        keyFrame.value = this._readValue(stream, valueType, info);
        target.addKeyFrame(keyFrame);
    }

    this._notifyComplete(target);
};

HCLIP.prototype._readValue = function(stream, type, info)
{
    if (type === HCLIP.VALUE_TYPE_SKELETON_POSE) {
        var numJoints = info;
        var pose = new SkeletonPose();

        for (var i = 0; i < numJoints; ++i) {
            var jointPose = new SkeletonJointPose();

            jointPose.position.set(stream.getFloat32(), stream.getFloat32(), stream.getFloat32());
            jointPose.rotation.set(stream.getFloat32(), stream.getFloat32(), stream.getFloat32(), stream.getFloat32());
            jointPose.scale.set(stream.getFloat32(), stream.getFloat32(), stream.getFloat32());

            pose.setJointPose(i, jointPose);
        }

        return pose;
    }
    else if (type === AnimationClipExporter.VALUE_TYPE_FLOAT3) {
        return new HX.Float4(stream.getFloat32(), stream.getFloat32(), stream.getFloat32(), 0.0);
    }
    else if(type === AnimationClipExporter.VALUE_TYPE_QUATERNION) {
        return new HX.Quaternion(stream.getFloat32(), stream.getFloat32(), stream.getFloat32(), stream.getFloat32());
    }
    else if (type === AnimationClipExporter.VALUE_TYPE_NUMBER) {
        return stream.getFloat32();
    }
};

export { HCLIP };