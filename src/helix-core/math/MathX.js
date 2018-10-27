var RCP_LOG_OF_2 = 1.0 / Math.log(2);

/**
 * Some extra Math functionality for your enjoyment.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var MathX = {
    /**
     * The factor to convert degrees to radians.
     */
    DEG_TO_RAD: Math.PI / 180.0,

    /**
     * The factor to convert radians to degrees.
     */
    RAD_TO_DEG: 180.0 / Math.PI,

    /**
     * Returns the sign of a given value.
     * @returns {number} -1 if v < 0, 0 if v == 0, 1 if v > 1
     */
    sign: function(v)
    {
        return  v === 0.0? 0.0 :
            v > 0.0? 1.0 : -1.0;
    },

    /**
     * Verifies whether the value is a power of 2.
     */
    isPowerOfTwo: function(value)
    {
        return value? ((value & -value) === value) : false;
    },

	/**
	 * Gets the power of two larger or equal to the passed value.
	 */
	getNextPowerOfTwo: function(value)
    {
        var s = 1;

        while (s < value)
            s <<= 1;

        return s;
    },

    /**
     * Return the base-2 logarithm.
     */
    log2: function(value)
    {
        return Math.log(value) * RCP_LOG_OF_2;
    },

    /**
     * Clamps a value to a minimum and maximum.
     */
    clamp: function(value, min, max)
    {
        return  value < min?    min :
            value > max?    max :
                value;
    },

    /**
     * Clamps a value to 0 and 1
     */
    saturate: function(value)
    {
        return MathX.clamp(value, 0.0, 1.0);
    },

    /**
     * Linearly interpolates a number.
     */
    lerp: function(a, b, factor)
    {
        return a + (b - a) * factor;
    },

    /**
     * Returns 0 if x < lower, 1 if x > lower, and linearly interpolates in between.
     */
    linearStep: function(lower, upper, x)
    {
        return MathX.saturate((x - lower) / (upper - lower));
    },

    /**
     * Estimates the radius of a gaussian curve.
     * @param variance The variance of the gaussian curve.
     * @param epsilon The minimum value of the curve to still be considered within the radius.
     */
    estimateGaussianRadius: function (variance, epsilon)
    {
        return Math.sqrt(-2.0 * variance * Math.log(epsilon));
    },

    fract: function(value)
    {
        return value - Math.floor(value);
    }
};

export { MathX };