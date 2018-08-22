/**
 * @classdesc
 * Float2 is a class describing 2-dimensional points.
 *
 * @constructor
 * @param x The x-coordinate
 * @param y The y-coordinate
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Float2(x, y)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
}

/**
 * Adds 2 vectors.
 *
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The sum of a and b.
 */
Float2.add = function(a, b, target)
{
    target = target || new Float2();
    target.x = a.x + b.x;
    target.y = a.y + b.y;
    return target;
};

/**
 * Subtracts 2 vectors.
 *
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The difference of a and b.
 */
Float2.subtract = function(a, b, target)
{
    target = target || new Float2();
    target.x = a.x - b.x;
    target.y = a.y - b.y;
    return target;
};

/**
 * Multiplies a vector with a scalar.
 *
 * @param a
 * @param s
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The product of a * s
 */
Float2.scale = function(a, s, target)
{
    target = target || new Float2();
    target.x = a.x * s;
    target.y = a.y * s;
    return target;
};

Float2.prototype =
{

    /**
     * Sets the components explicitly.
     */
    set: function(x, y)
    {
        this.x = x;
        this.y = y;
    },

    /**
     * Returns the dot product with another vector.
     */
    dot: function(a)
    {
        return a.x * this.x + a.y * this.y;
    },

    /**
     * The squared length of the vector.
     */
    get lengthSqr()
    {
        return this.x * this.x + this.y * this.y;
    },

    /**
     * The length of the vector.
     */
    get length()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    /**
     * Normalizes the vector.
     */
    normalize: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
    },

    /**
     * Returns a copy of this object.
     */
    clone: function()
    {
        return new Float2(this.x, this.y);
    },

    /**
     * Adds a vector to this one in place.
     */
    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
    },

    /**
     * Adds a scalar multiple of another vector in place.
     * @param v The vector to scale and add.
	 * @param s The scale to apply to v
     */
    addScaled: function(v, s)
    {
        this.x += v.x * s;
        this.y += v.y * s;
    },

    /**
     * Subtracts a vector from this one in place.
     */
    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
    },

	/**
	 * Subtracts a scaled vector from this one in place.
	 *
	 * @param v The vector to scale and subtract.
	 * @param s The scale to apply to v
	 */
	subtractScaled: function (v, s)
	{
		this.x -= v.x * s;
		this.y -= v.y * s;
		return this;
	},

    /**
     * Multiplies the components of this vector with a scalar.
     */
    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
    },

    /**
     * Negates the components of this vector.
     */
    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
    },

    /**
     * Copies the negative of a vector
     */
    negativeOf: function(v)
    {
        this.x = -v.x;
        this.y = -v.y;
    },

    /**
     * Sets the components of this vector to their absolute values.
     */
    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
    },

    /**
     * Sets the euclidian coordinates based on polar coordinates
     * @param radius The radius coordinate
     * @param angle The angle coordinate
     */
    fromPolarCoordinates: function(radius, angle)
    {
        this.x = radius*Math.cos(angle);
        this.y = radius*Math.sin(angle);
    },

    /**
     * Copies the values from a different Float2
     */
    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
    },

    /**
     * Returns the distance between this and another point.
     */
    distanceTo: function(a)
    {
        var dx = a.x - this.x;
        var dy = a.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Returns the squared distance between this and another point.
     */
    squareDistanceTo: function(a)
    {
        var dx = a.x - this.x;
        var dy = a.y - this.y;
        return dx * dx + dy * dy;
    },

    /**
     * Linearly interpolates two vectors.
     * @param {Float2} a The first vector to interpolate from.
     * @param {Float2} b The second vector to interpolate to.
     * @param {Number} t The interpolation factor.
     */
    lerp: function(a, b, t)
    {
        var ax = a.x, ay = a.y;

        this.x = ax + (b.x - ax) * t;
        this.y = ay + (b.y - ay) * t;
    },

    /**
     * Replaces the components' values if those of the other Float2 are higher, respectively
     */
    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
    },

    /**
     * Replaces the components' values if those of the other Float2 are lower, respectively
     */
    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
    },

    /**
     * Returns the angle between this and another vector.
     */
    angle: function(a)
    {
        return Math.acos(this.dot(a) / (this.length * a.length));
    },

    /**
     * Returns the angle between two vectors, assuming they are normalized
     */
    angleNormalized: function(a)
    {
        return Math.acos(this.dot(a));
    }
};

/**
 * A preset for the origin
 */
Float2.ZERO = new Float2(0, 0);

/**
 * A preset for the X-axis
 */
Float2.X_AXIS = new Float2(1, 0);

/**
 * A preset for the Y-axis
 */
Float2.Y_AXIS = new Float2(0, 1);

export { Float2 };