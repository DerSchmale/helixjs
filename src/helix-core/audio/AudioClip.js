/**
 * @classdesc
 * AudioClip provides the data for audio playback.
 *
 * @constructor
 *
 * @param {AudioBuffer} [audioBuffer] The AudioBuffer object containing the binary sound data.
 * @param {Boolean} [looping] Whether or not the audio clip should loop.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AudioClip(audioBuffer, looping)
{
	this._buffer = audioBuffer || null;
	this._looping = looping || false;
}

AudioClip.prototype = {
	/**
	 * Indicates whether or not the audio clip should loop.
	 */
	get looping()
	{
		return this._looping;
	},

	set looping(value)
	{
		this._looping = value;
	},

	/**
	 * The AudioBuffer object containing the data for playback.
	 */
	get buffer()
	{
		return this._buffer;
	},

	set buffer(value)
	{
		this._buffer = value;
	}
};

export {AudioClip}