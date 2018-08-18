import {AnimationLayer} from "./AnimationLayer";
import {Float4} from "../../math/Float4";
import {Debug} from "../../debug/Debug";
import {SkeletonJointPose} from "../skeleton/SkeletonJointPose";

/**
 * @classdesc
 * AnimationLayerFloat4 is an {@linkcode AnimationLayer} targeting {@linkcode Float4} objects
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayerFloat4(targetName, propertyName, clip)
{
    AnimationLayer.call(this, targetName, propertyName, clip);
}

AnimationLayerFloat4.prototype = Object.create(AnimationLayer.prototype);

/**
 * @ignore
 * @private
 */
AnimationLayerFloat4.prototype._verifyTarget = function()
{
	Debug.assert(this._targetObject[this._propertyName] instanceof Float4, "Type mismatch!");

	this._skeletonPose = this._targetObject instanceof SkeletonJointPose? this._targetObject.skeletonPose : null;
};

/**
 * This needs to be called every frame.
 * @param dt The time passed since last frame in milliseconds.
 * @returns {boolean} Whether or not the playhead moved. This can be used to spare further calculations if the old state is kept.
 */
AnimationLayerFloat4.prototype.update = function (dt)
{
    var playhead = this._playhead;

    if (playhead.update(dt)) {
        this._targetObject[this._propertyName].lerp(playhead.frame1.value, playhead.frame2.value, playhead.ratio);
        if (this._skeletonPose) this._skeletonPose.invalidateGlobalPose();
    }
};

/**
 * @inheritDoc
 */
AnimationLayerFloat4.prototype.clone = function()
{
	return new AnimationLayerFloat4(this._targetName, this._propertyName, this._clip);
};

export {AnimationLayerFloat4};