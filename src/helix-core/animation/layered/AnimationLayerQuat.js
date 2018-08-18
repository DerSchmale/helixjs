import {AnimationLayer} from "./AnimationLayer";
import {Debug} from "../../debug/Debug";
import {Quaternion} from "../../math/Quaternion";
import {SkeletonJointPose} from "../skeleton/SkeletonJointPose";

/**
 * @classdesc
 * AnimationLayerQuat is an {@linkcode AnimationLayer} targeting {@linkcode Quaternion} objects
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayerQuat(targetName, propertyName, clip)
{
    AnimationLayer.call(this, targetName, propertyName, clip);
}

AnimationLayerQuat.prototype = Object.create(AnimationLayer.prototype);

/**
 * @ignore
 * @private
 */
AnimationLayerQuat.prototype._verifyTarget = function()
{
	Debug.assert(this._targetObject[this._propertyName] instanceof Quaternion, "Type mismatch!");
	this._skeletonPose = this._targetObject instanceof SkeletonJointPose? this._targetObject.skeletonPose : null;
};



/**
 * This needs to be called every frame.
 * @param dt The time passed since last frame in milliseconds.
 * @returns {boolean} Whether or not the playhead moved. This can be used to spare further calculations if the old state is kept.
 */
AnimationLayerQuat.prototype.update = function (dt)
{
    var playhead = this._playhead;

    if (playhead.update(dt)) {
        this._targetObject[this._propertyName].slerp(playhead.frame1.value, playhead.frame2.value, playhead.ratio);
        if (this._skeletonPose) this._skeletonPose.invalidateGlobalPose();
    }
};

/**
 * @inheritDoc
 */
AnimationLayerQuat.prototype.clone = function()
{
	return new AnimationLayerQuat(this._targetName, this._propertyName, this._clip);
};

export {AnimationLayerQuat};