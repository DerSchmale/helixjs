/**
 * @classdesc
 * CenteredGaussianCurve is a class that can be used to generate values from a gaussian curve symmetrical to the Y-axis.
 *
 * @constructor
 * @param variance The variance of the distribution.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CenteredGaussianCurve(variance)
{
    this._amplitude = 1.0 / Math.sqrt(2.0 * variance * Math.PI);
    this._expScale = -1.0 / (2.0 * variance);
}

CenteredGaussianCurve.prototype =
{
    /**
     * Gets the y-value of the curve at the given x-coordinate.
     */
	evaluate: function(x)
    {
        return this._amplitude * Math.pow(Math.E, x*x*this._expScale);
    }
};

/**
 * Creates a CenteredGaussianCurve with a given "radius" of influence.
 * @param radius The "radius" of the curve.
 * @param epsilon The minimum value to still be considered within the radius.
 * @returns {CenteredGaussianCurve} The curve with the given radius.
 */
CenteredGaussianCurve.fromRadius = function(radius, epsilon)
{
    epsilon = epsilon || .01;
    var standardDeviation = radius / Math.sqrt(-2.0 * Math.log(epsilon));
    return new CenteredGaussianCurve(standardDeviation*standardDeviation);
};

export { CenteredGaussianCurve };