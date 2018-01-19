import {AnimationLayer} from "./AnimationLayer";
import {Debug} from "../../debug/Debug";
import {Quaternion} from "../../math/Quaternion";
import {SkeletonJointPose} from "../skeleton/SkeletonJointPose";
import {MathX} from "../../math/MathX";

/**
 * @classdesc
 * AnimationLayerMorphPose is an {@linkcode AnimationLayer} targeting {@linkcode MorphPose} objects
 *
 * @constructor
 *
 * @param targetObject The MorphPose to be targeted
 * @param morphTargetName The name of the morph target to be played
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayerMorphTarget(targetObject, morphTargetName, clip)
{
    AnimationLayer.call(this, targetObject, morphTargetName, clip);
}

AnimationLayerMorphTarget.prototype = Object.create(AnimationLayer.prototype);

/**
 * @inheritDoc
 */
AnimationLayerMorphTarget.prototype.update = function (dt)
{
    var playhead = this._playhead;

    if (playhead.update(dt)) {
        var value = MathX.lerp(playhead.frame1.value, playhead.frame2.value, playhead.ratio);
        this._targetObject.setWeight(this._propertyName, value);

    }
};

export {AnimationLayerMorphTarget};