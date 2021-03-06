import {Float2} from "./Float2";

/**
 * @classdesc
 * PoissonDisk is a class that allows generating 2D points in a poisson distribution.
 *
 * @constructor
 * @param [mode] Whether the points should be contained in a square ({@linkcode PoissonDisk#SQUARE}) or a circle ({@linkcode PoissonDisk#CIRCULAR}). Defaults to circular.
 * @param [initialDistance]
 * @param [decayFactor]
 * @param [maxTests]
 *
 * @property points An array of all points currently generated.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PoissonDisk(mode, initialDistance, decayFactor, maxTests)
{
	this.points = null;
	this.decayFactor = decayFactor || .99;
	this.initialDistance = initialDistance || 1.0;
	this.maxTests = maxTests || 20000;
	this.mode = mode === undefined? PoissonDisk.CIRCULAR : mode;
	this._currentDistance = 0;
    this.reset();
}

/**
 * Generates points in a square.
 */
PoissonDisk.SQUARE = 0;

/**
 * Generates points in a circle.
 */
PoissonDisk.CIRCULAR = 1;

/**
 * @ignore
 */
PoissonDisk._initDefault = function()
{
    PoissonDisk.DEFAULT = new PoissonDisk();
    PoissonDisk.DEFAULT.generatePoints(64);
    PoissonDisk.DEFAULT_FLOAT32 = new Float32Array(64 * 2);

    var diskPoints = PoissonDisk.DEFAULT.points;

    for (var i = 0; i < 64; ++i) {
        var p = diskPoints[i];
        PoissonDisk.DEFAULT_FLOAT32[i * 2] = p.x;
        PoissonDisk.DEFAULT_FLOAT32[i * 2 + 1] = p.y;
    }
};

PoissonDisk.prototype =
{
    /**
     * Clears all generated points.
     */
    reset : function()
    {
		this.points = [];
		this._currentDistance = this.initialDistance;
    },

    /**
     * Generates new points and add them to the set. This does not return a set of points.
     * @param numPoints The amount of points to generate.
     */
    generatePoints: function(numPoints)
    {
        for (var i = 0; i < numPoints; ++i)
            this.generatePoint();
    },

    /**
     * Generates a single point and adds it to the set.
     */
    generatePoint: function()
    {
        for (;;) {
            var testCount = 0;
            var sqrDistance = this._currentDistance*this._currentDistance;

            while (testCount++ < this.maxTests) {
                var candidate = this._getCandidate();
                if (this._isValid(candidate, sqrDistance)) {
                    this.points.push(candidate);
                    return candidate;
                }
            }
            this._currentDistance *= this.decayFactor;
        }
    },

    /**
     * @ignore
     * @private
     */
    _getCandidate: function()
    {
        for (;;) {
            var x = Math.random() * 2.0 - 1.0;
            var y = Math.random() * 2.0 - 1.0;
            if (this.mode === PoissonDisk.SQUARE || (x * x + y * y <= 1))
                return new Float2(x, y);
        }
    },

    /**
     * @ignore
     * @private
     */
    _isValid: function(candidate, sqrDistance)
    {
        var len = this.points.length;
        for (var i = 0; i < len; ++i) {
            var p = this.points[i];
            var dx = candidate.x - p.x;
            var dy = candidate.y - p.y;
            if (dx*dx + dy*dy < sqrDistance)
                return false;
        }

            return true;
    }
};

export { PoissonDisk };