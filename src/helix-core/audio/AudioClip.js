/**
 * @classdesc
 * AudioClip provides the data for audio playback.
 *
 * @constructor
 *
 * @param {AudioBuffer} [audioBuffer] The AudioBuffer object containing the binary sound data.
 * @param {Boolean} [looping] Whether or not the audio clip should loop.
 *
 * @property {Boolean} looping Indicates whether or not the audio clip should loop.
 * @property {AudioBuffer} buffer The AudioBuffer object containing the data for playback.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AudioClip(audioBuffer, looping)
{
	this.buffer = audioBuffer || null;
	this.looping = looping || false;
}

AudioClip.prototype = {};

export {AudioClip}