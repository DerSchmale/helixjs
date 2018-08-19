import {Component} from "../entity/Component";
import {Float4} from "../math/Float4";
import {META} from "../Helix";

/**
 * @classdesc
 * AudioEmitter is a {@linkcode Component} that allows playing back audio from the Entity's position. If any component
 * wishes to trigger playback from the Entity's origin, that Entity should have the AudioEmitter component assigned which
 * in turn should be retrieved from the Component triggering the playback.
 *
 * @constructor
 *
 * @param clip The audio clip to be played by this AudioEmitter. Multiple AudioClips can be added to an Entity.
 *
 * @property name Allows tagging AudioEmitters with a name. For instance: collision sounds could have the name "collision"
 * @property positionOffset Allows setting an offset between the entity's position and the audio source. For example: a
 * @property autoplay If true, playback starts when the component is added. Usually used with looping AudioClips.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AudioEmitter(clip)
{
	Component.call(this);

	this.name = "";
	this._autoplay = false;
	this._clip = clip;
	this._sourceNode = null;
}

Component.create(AudioEmitter, {
	positionOffset: {
		get: function() {
			return this._positionOffset;
		},

		set: function(value) {
			this._positionOffset = value;
		}
	},

	autoplay: {
		get: function() {
			return this._autoplay;
		},

		set: function(value) {
			this._autoplay = value;
		}
	},

	clip: {
		get: function() {
			return this._clip;
		},

		set: function(value) {
			this._clip = value;
		}
	}
});

/**
 * @inheritDoc
 */
AudioEmitter.prototype.onAdded = function()
{
	if (this._autoplay)
		this.play();
};

/**
 * @inheritDoc
 */
AudioEmitter.prototype.onRemoved = function()
{
	this.stop();
};


/**
 * Starts playback of the audio clip.
 */
AudioEmitter.prototype.play = function()
{
	this._sourceNode = META.AUDIO_CONTEXT.createBufferSource();
	this._sourceNode.buffer = this._clip.buffer;
	this._sourceNode.loop = this._clip.looping;
	this._sourceNode.connect(META.AUDIO_CONTEXT.destination);
	this._sourceNode.start();
};

/**
 * Stops playback of the audio clip.
 */
AudioEmitter.prototype.stop = function()
{
	if (this._sourceNode) {
		this._sourceNode.stop();
		this._sourceNode.disconnect();
		this._sourceNode = null;
	}
};

/**
 * @inheritDoc
 * @returns {AudioEmitter}
 */
AudioEmitter.prototype.clone = function()
{
	var emitter = new AudioEmitter(this._clip);
	emitter.name = this.name;
	return emitter;
};

AudioEmitter.prototype.onUpdate = function(dt)
{
	var worldPos = new Float4();
	return function()
	{
		if (this._sourceNode && this._sourceNode.isPlaying) {
			this._entity.worldMatrix.getColumn(3, worldPos);
			// TODO: Assign position, orientation to pannernode (doesn't exist yet)
		}
	}
}();


export { AudioEmitter };