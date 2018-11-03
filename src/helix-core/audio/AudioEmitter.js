import {Component} from "../entity/Component";
import {META} from "../Helix";
import {MathX} from "../math/MathX";
import {AudioDistanceModel} from "./AudioDistanceModel";

/**
 * @classdesc
 * AudioEmitter is a {@linkcode Component} that allows playing back audio from the Entity's position. If any component
 * wishes to trigger playback from the Entity's origin, that Entity should have the AudioEmitter component assigned which
 * in turn should be retrieved from the Component triggering the playback.
 * Another way of triggering/stopping playback is broadcasting AudioEmitter.PLAY_MESSAGE or AudioEmitter.STOP_MESSAGE
 * with the AudioEmitter's name as parameter.
 * Most of the panning properties are wrappers for [PannerNode]{@link https://developer.mozilla.org/en-US/docs/Web/API/PannerNode}.
 *
 * @constructor
 *
 * @param clip The audio clip to be played by this AudioEmitter. Multiple AudioClips can be added to an Entity.
 *
 * @property name Allows tagging AudioEmitters with a name. For instance: collision sounds could have the name "collision"
 * @property autoplay If true, playback starts when the component is added. Usually used with looping AudioClips.
 * @property coneInnerAngle The angle in radians (!!!) of a cone inside of which there will be no volume reduction.
 * @property coneOuterAngle The angle in radians (!!!) of a cone outside of which the volume will be reduced by a constant value, defined by the coneOuterGain attribute.
 * @property coneOuterGain The amount of volume reduction outside the cone defined by the coneOuterAngle attribute. Its default value is 0, meaning that no sound can be heard.
 * @property distanceModel One of {@linkcode AudioDistanceModel}, determining which algorithm to use to reduce the volume of the audio source as it moves away from the listener. Defaults to "linear".
 * @property maxDistance Represents the maximum distance between the audio source and the listener, after which the volume is not reduced any further.
 * @property panningModel One of {@linkcode AudioPanningModel}, determining which spatialisation algorithm to use to position the audio in 3D space. Defaults to "hrtf".
 * @property refDistance Representing the reference distance for reducing volume as the audio source moves further from the listener. {@see AudioDistanceModel}
 * @property rolloffFactor Describes how quickly the volume is reduced as the source moves away from the listener. This value is used by all distance models. {@see AudioDistanceModel}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AudioEmitter(clip)
{
	Component.call(this);

	this.name = "";
	this.autoplay = false;
	this.clip = clip;
	this._source = null;
    this._gain = META.AUDIO_CONTEXT.createGain();
    this._panner = META.AUDIO_CONTEXT.createPanner();
    this._panner.connect(this._gain);
}

AudioEmitter.PLAY_MESSAGE = "hx_audioPlay";
AudioEmitter.STOP_MESSAGE = "hx_audioStop";

AudioEmitter.prototype = Object.create(Component.prototype, {
	gain: {
		get: function() {
			return this._gain.gain.value;
		},

		set: function(value) {
            this._gain.gain.value = value;
		}
	},

    coneInnerAngle: {
        get: function() {
            return this._coneInnerAngle;
        },

        set: function(value) {
        	// store a copy, so we always return exactly the same value
        	this._coneInnerAngle = value;
            this._panner.coneInnerAngle = value * MathX.RAD_TO_DEG;
        }
	},

    coneOuterAngle: {
        get: function() {
            return this._coneOuterAngle;
        },

        set: function(value) {
        	// store a copy, so we always return exactly the same value
        	this._coneOuterAngle = value;
            this._panner.coneOuterAngle = value * MathX.RAD_TO_DEG;
        }
	},

    coneOuterGain: {
        get: function() {
            return this._panner.coneOuterGain;
        },

        set: function(value) {
            this._panner.coneOuterGain = value;
        }
	},

    distanceModel: {
        get: function() {
            return this._panner.distanceModel;
        },

        set: function(value) {
            this._panner.distanceModel = value;
        }
	},

    maxDistance: {
        get: function() {
            return this._panner.maxDistance;
        },

        set: function(value) {
            this._panner.maxDistance = value;
        }
	},

    panningModel: {
        get: function() {
            return this._panner.panningModel;
        },

        set: function(value) {
            this._panner.panningModel = value;
        }
	},

    refDistance: {
        get: function() {
            return this._panner.refDistance;
        },

        set: function(value) {
            this._panner.refDistance = value;
        }
	},

    rolloffFactor: {
        get: function() {
            return this._panner.rolloffFactor;
        },

        set: function(value) {
            this._panner.rolloffFactor = value;
        }
	}
});

/**
 * @inheritDoc
 */
AudioEmitter.prototype.onAdded = function()
{
    this._gain.connect(META.AUDIO_CONTEXT.destination);

    if (this.autoplay)
        this.play();

    this.bindListener(AudioEmitter.PLAY_MESSAGE, this._onPlayMessage, this);
    this.bindListener(AudioEmitter.STOP_MESSAGE, this._onStopMessage, this);
};

/**
 * @inheritDoc
 */
AudioEmitter.prototype.onRemoved = function()
{
    this.unbindListener(AudioEmitter.PLAY_MESSAGE, this._onPlayMessage);
    this.unbindListener(AudioEmitter.STOP_MESSAGE, this._onStopMessage);
	this.stop();
};


/**
 * Starts playback of the audio clip.
 *
 * @param {Number} [gain] The gain of the volume. If provided, this parameter will override the currently assigned gain of the component.
 */
AudioEmitter.prototype.play = function(gain)
{
	// make sure position updates immediately
    var m = this.entity.worldMatrix._m;
	var panner = this._panner;

    if (panner.positionX) {
        panner.positionX.value = m[12];
        panner.positionY.value = m[13];
        panner.positionZ.value = m[14];

        panner.orientationX.value = m[4];
        panner.orientationY.value = m[5];
        panner.orientationZ.value = m[6];
    }
    else {
        panner.setPosition(m[12], m[13], m[14]);
        panner.setOrientation(m[4], m[5], m[6]);
	}

	if (gain !== undefined)
    	this._gain.gain.value = gain;

	this._source = META.AUDIO_CONTEXT.createBufferSource();
	this._source.buffer = this.clip.buffer;
	this._source.loop = this.clip.looping;
	this._source.connect(this._panner);
	this._source.start();
};

/**
 * Stops playback of the audio clip.
 */
AudioEmitter.prototype.stop = function()
{
	if (this._source) {
		this._source.stop();
		this._source.disconnect();
		this._source= null;
        this._gain.disconnect();
    }
};

/**
 * @inheritDoc
 * @returns {AudioEmitter}
 */
AudioEmitter.prototype.clone = function()
{
	var emitter = new AudioEmitter(this.clip);
	emitter.name = this.name;
	return emitter;
};

AudioEmitter.prototype.onUpdate = function(dt)
{
	if (!(this._source && this._source.isPlaying)) return;
	var time = META.AUDIO_CONTEXT.currentTime;

	var m = this.entity.worldMatrix._m;

	var panner = this._panner;
	if (panner.positionX) {
		panner.positionX.setValueAtTime(m[12], time);
		panner.positionY.setValueAtTime(m[13], time);
		panner.positionZ.setValueAtTime(m[14], time);

        panner.orientationX.setValueAtTime(m[4], time);
        panner.orientationY.setValueAtTime(m[5], time);
        panner.orientationZ.setValueAtTime(m[6], time);
    }
    else {
        panner.setPosition(m[12], m[13], m[14]);
        panner.setOrientation(m[4], m[5], m[6]);
	}
};

AudioEmitter.prototype._onPlayMessage = function(message, audioName, gain)
{
    if (audioName === this.name)
        this.play(gain);
};

AudioEmitter.prototype._onStopMessage = function(message, audioName)
{
    if (audioName === this.name)
        this.stop();
};

Component.register("audioEmitter", AudioEmitter);

export { AudioEmitter };