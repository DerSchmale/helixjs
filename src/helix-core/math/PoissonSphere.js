import {Float4} from "./Float4";

/**
 * @classdesc
 * PoissonSphere is a class that allows generating 3D points in a poisson distribution.
 *
 * @constructor
 * @param [mode] Whether the points should be contained in a square ({@linkcode PoissonSphere#BOX}) or a circle ({@linkcode PoissonSphere#SPHERICAL}). Defaults to spherical.
 * @param [initialDistance]
 * @param [decayFactor]
 * @param [maxTests]
 *
 * @property points An array of all points currently generated.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PoissonSphere(mode, initialDistance, decayFactor, maxTests)
{
	this.points = null;
	this.mode = mode === undefined? PoissonSphere.SPHERICAL : mode;
	this.initialDistance = initialDistance || 1.0;
	this.decayFactor = decayFactor || .99;
	this.maxTests = maxTests || 20000;
	this._currentDistance = 0;
    this.reset();
}

/**
 * Generates points in a box.
 */
PoissonSphere.BOX = 0;

/**
 * Generates points in a sphere.
 */
PoissonSphere.SPHERICAL = 1;

/**
 * @ignore
 * @private
 */
PoissonSphere._initDefault = function()
{
    PoissonSphere.DEFAULT = new PoissonSphere();
    PoissonSphere.DEFAULT.generatePoints(64);
    PoissonSphere.DEFAULT_FLOAT32 = new Float32Array(64 * 3);

    var spherePoints = PoissonSphere.DEFAULT.points;

    for (var i = 0; i < 64; ++i) {
        var p = spherePoints[i];
        PoissonSphere.DEFAULT_FLOAT32[i * 3] = p.x;
        PoissonSphere.DEFAULT_FLOAT32[i * 3 + 1] = p.y;
        PoissonSphere.DEFAULT_FLOAT32[i * 3 + 2] = p.z;
    }
};

PoissonSphere.prototype = {
    /**
     * Clears all generated points.
     */
    reset : function()
    {
        this._currentDistance = this.initialDistance;
        this.points = [];
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
            var z = Math.random() * 2.0 - 1.0;
            if (this.mode === PoissonSphere.BOX || (x * x + y * y + z * z <= 1))
                return new Float4(x, y, z, 0.0);
        }
    },

    /**
     * @ignore
     * @private
     */
    _isValid: function(candidate, sqrDistance)
    {
        var pts = this.points;
        var len = pts.length;
        for (var i = 0; i < len; ++i) {
            var p = pts[i];
            var dx = candidate.x - p.x;
            var dy = candidate.y - p.y;
            var dz = candidate.z - p.z;
            if (dx*dx + dy*dy + dz*dz < sqrDistance)
                return false;
        }

        return true;
    }
};

export { PoissonSphere };