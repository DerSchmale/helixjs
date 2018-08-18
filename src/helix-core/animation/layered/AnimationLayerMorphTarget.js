import {AnimationLayer} from "./AnimationLayer";
import {MathX} from "../../math/MathX";
import {Debug} from "../../debug/Debug";
import {MeshInstance} from "../../mesh/MeshInstance";
import {MorphAnimation} from "../morph/MorphAnimation";

/**
 * @classdesc
 * AnimationLayerMorphPose is an {@linkcode AnimationLayer} targeting {@linkcode MorphPose} objects
 *
 * @constructor
 *
 * @param targetName The MorphPose to be targeted
 * @param morphTargetName The name of the morph target to be played
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayerMorphTarget(targetName, morphTargetName, clip)
{
    AnimationLayer.call(this, targetName, morphTargetName, clip);
}

AnimationLayerMorphTarget.prototype = Object.create(AnimationLayer.prototype);


/**
 * @ignore
 * @private
 */
AnimationLayerMorphTarget.prototype._verifyTarget = function()
{
    if (this._targetObject instanceof MeshInstance)
		this._targetObject = this._targetObject.morphPose;
	else
        Debug.assert(this._targetObject instanceof MorphAnimation, "Type mismatch!");
};

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

/**
 * @inheritDoc
 */
AnimationLayerMorphTarget.prototype.clone = function()
{
	return new AnimationLayerMorphTarget(this._targetName, this._propertyName, this._clip);
};


export {AnimationLayerMorphTarget};