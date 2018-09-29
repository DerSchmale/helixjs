import {Float4} from "./Float4";

var sh_1_4 = Math.sqrt(1.0 / (4.0 * Math.PI));
var sh_1_3 = Math.sqrt(1.0 / (3.0 * Math.PI));
var sh_15_64 = Math.sqrt(15.0 / (64.0 * Math.PI));
var sh_5_256 = Math.sqrt(5.0 / (256.0 * Math.PI));
var sh_15_256 = Math.sqrt(15.0 / (256.0 * Math.PI));
var sh_15_128 = Math.sqrt(5.0 / (128.0 * Math.PI));

var shConstants = [
	sh_1_4,

	-sh_1_3,
	sh_1_3,
	-sh_1_3,

	sh_15_64,
	-sh_15_64,
	sh_5_256,
	-sh_15_128,
	sh_15_256
];

/**
 * @classdesc
 *
 * SphericalHarmonicsRGB represents an L2 spherical harmonics approximation, storing 27 floats as an approximation for a
 * low-frequency function on the unit sphere domain mapping to colour values.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SphericalHarmonicsRGB()
{
	// coefficients are premultiplied with the SH constant values!
	this._coefficients = [ ];
	for (var i = 0; i < 9; ++i) {
		this._coefficients[i] = new Float4();
	}
}

SphericalHarmonicsRGB.prototype = {
	/**
	 * Assigns the weight for a given SH basis function
	 * @param level The SH level from 0 to 2
	 * @param index The index of the base function for the current level. For level 0, this must be 0. Otherwise it's in the range [-level, level]
	 * @param value A Float4 object containing the three weights in xyz.
	 */
	setWeight: function(level, index, value)
	{
		var i = this._getCoeffIndex(level, index);
		Float4.scale(value, shConstants[i], this._coefficients[i]);

		console.log(this._coefficients);
	},

	/**
	 * Evaluates the SH representation and returns the value at the given direction.
	 * @param vector The direction vector for which we're evaluating the function. This is expected to be normalized.
	 * @param {Float4} [target] An optional target to store the evaluated value
	 */
	evaluate: function(vector, target)
	{
		var x = vector.x;
		var y = vector.y;
		var z = vector.z;
		var c = this._coefficients;

		target = target || new Float4();
		// L0
		target.copyFrom(c[0]);

		// L1
		target.addScaled(c[1], y);
		target.addScaled(c[2], z);
		target.addScaled(c[3], x);

		// L2
		target.addScaled(c[4], x * y);
		target.addScaled(c[5], y * z);
		target.addScaled(c[6], 3.0 * z * z - 1.0);
		target.addScaled(c[7], x * z);
		target.addScaled(c[8], x * x - y * y);

		return target;
	},

	/**
	 * @ignore
	 * @private
	 */
	_getCoeffIndex: function(level, index)
	{
		// level * level is the amount of coefficients *before* the current level
		// (level 0 --> 0, level1 --> 1, level2 --> 4)
		// index + level is the offset from signed indices to unsigned for the current level
		return level * level + index + level;
	}
};

export { SphericalHarmonicsRGB };