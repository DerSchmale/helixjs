import {Component} from "../entity/Component";
import {AudioEmitter} from "./AudioEmitter";
import {META} from "../Helix";

// keeping this here so we can use it as a test for uniqueness
var listener = null;

/**
 * @classdesc
 * AudioListener is a Component that defines the position of the virtual microphone in the scene. It's usually attached
 * to the camera
 *
 * @constructor
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AudioListener()
{
	Component.call(this);
}

Component.create(AudioListener);

AudioListener.prototype.onAdded = function()
{
	// TODO: Check it's the only listener in existence
	console.assert(!listener, "Can only have one active AudioListener!");
	listener = META.AUDIO_CONTEXT.listener;
};

AudioListener.prototype.onRemoved = function()
{
	listener = null;
};

AudioListener.prototype.onUpdate = function(dt)
{
	var time = META.AUDIO_CONTEXT.currentTime;
	var m = this._entity.worldMatrix._m;

	if (listener.positionX) {
        listener.positionX.setValueAtTime(m[12], time);
        listener.positionY.setValueAtTime(m[13], time);
        listener.positionZ.setValueAtTime(m[14], time);
        listener.forwardX.setValueAtTime(m[4], time);
        listener.forwardY.setValueAtTime(m[5], time);
        listener.forwardZ.setValueAtTime(m[6], time);
        listener.upX.setValueAtTime(m[8], time);
        listener.upY.setValueAtTime(m[9], time);
        listener.upZ.setValueAtTime(m[10], time);
    }
    else {
        listener.setPosition(m[12], m[13], m[14]);
        listener.setOrientation(m[4], m[5], m[6], m[8], m[9], m[10]);
	}
};


export {AudioListener}