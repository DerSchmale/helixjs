import {AnimationLayer} from "./AnimationLayer";
import {Float4} from "../../math/Float4";
import {Debug} from "../../debug/Debug";

/**
 * @classdesc
 * AnimationLayerFloat4 is an {@linkcode AnimationLayer} targeting {@linkcode Float4} objects
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayerFloat4(targetObject, clip)
{
    Debug.assert(targetObject instanceof Float4, "Type mismatch!");
    AnimationLayer.call(this, targetObject, clip);
}

AnimationLayerFloat4.prototype = Object.create(AnimationLayer.prototype);

/**
 * This needs to be called every frame.
 * @param dt The time passed since last frame in milliseconds.
 * @returns {boolean} Whether or not the playhead moved. This can be used to spare further calculations if the old state is kept.
 */
AnimationLayerFloat4.prototype.update = function (dt)
{
    var playhead = this._playhead;
    if (playhead.update(dt))
        this._targetObject.lerp(playhead.frame1.value, playhead.frame2.value, playhead.ratio);
};

export {AnimationLayerFloat4};