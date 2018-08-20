import {Importer} from "./Importer";
import {AudioClip} from "../audio/AudioClip";
import {META} from "../Helix";

/**
 * @classdesc
 *
 * AudioFile is an importer for audio files. Yields an {@see AudioClip} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AudioFile()
{
	Importer.call(this, AudioClip, Importer.TYPE_BINARY);
}

AudioFile.prototype = Object.create(Importer.prototype);

/**
 * @ignore
 */
AudioFile.prototype.parse = function(data, target)
{
	META.AUDIO_CONTEXT.decodeAudioData(data.buffer, this._onDecoded.bind(this, target), this._onFailed.bind(this));
};

/**
 * @ignore
 * @private
 */
AudioFile.prototype._onDecoded = function(target, buffer)
{
	target.buffer = buffer;
	this._notifyComplete(target);
};

/**
 * @ignore
 * @private
 */
AudioFile.prototype._onFailed = function()
{
	this._notifyFailure("Failed to decode audio data");
};

export {AudioFile};