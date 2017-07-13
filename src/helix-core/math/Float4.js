/**
 * @classdesc
 * Float4 is a class describing 4-dimensional homogeneous points. These can represent points (w == 1), vectors (w == 0),
 * points in homogeneous projective space, or planes (a, b, c = x, y, z), (w = d).
 *
 * @constructor
 * @param x The x-coordinate
 * @param y The y-coordinate
 * @param z The z-coordinate
 * @param w The w-coordinate
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Float4(x, y, z, w)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w === undefined? 1 : w;
}


/**
 * Returns the angle between two vectors.
 */
Float4.angle = function(a, b)
{
    return Math.acos(Float4.dot3(a, b) / (a.length * b.length));
};

/**
 * Returns the 3-component dot product of 2 vectors.
 */
Float4.dot3 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z;
};

/**
 * Returns the 3-component dot product of 2 vectors.
 */
Float4.dot = Float4.dot3;

/**
 * Returns the 4-component dot product of 2 vectors. This can be useful for signed distances to a plane.
 */
Float4.dot4 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
};

/**
 * Linearly interpolates two vectors.
 * @param {Float4} a The first vector to interpolate from.
 * @param {Float4} b The second vector to interpolate to.
 * @param {Number} t The interpolation factor.
 * @param {Float4} target An optional target object. If not provided, a new object will be created and returned.
 * @returns {Float4} The interpolated value.
 */
Float4.lerp = function(a, b, factor, target)
{
    target = target || new Float4();
    var ax = a.x, ay = a.y, az = a.z, aw = a.w;

    target.x = ax + (b.x - ax) * factor;
    target.y = ay + (b.y - ay) * factor;
    target.z = az + (b.z - az) * factor;
    target.w = aw + (b.w - aw) * factor;
    return target;
};

/**
 * Returns the distance between two points.
 */
Float4.distance = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Returns the squared distance between two points.
 */
Float4.distanceSqr = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
};

/**
 * Creates a negated vector.
 * @param a The vector to negate.
 * @param target An optional target object. If not provided, a new object will be created and returned.
 * @returns -a
 */
Float4.negate = function(a, target)
{
    target = target || new Float4();
    target.x = -a.x;
    target.y = -a.y;
    target.z = -a.z;
    target.w = -a.w;
    return target;
};

/**
 * Returns the angle between two vectors, assuming they are normalized.
 */
Float4.angleNormalized = function(a, b)
{
    return Math.acos(Float4.dot3(a, b));
};

/**
 * Adds 2 vectors.
 *
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The sum of a and b.
 */
Float4.add = function(a, b, target)
{
    target = target || new Float4();
    target.x = a.x + b.x;
    target.y = a.y + b.y;
    target.z = a.z + b.z;
    target.w = a.w + b.w;
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
Float4.subtract = function(a, b, target)
{
    target = target || new Float4();
    target.x = a.x - b.x;
    target.y = a.y - b.y;
    target.z = a.z - b.z;
    target.w = a.w - b.w;
    return target;
};

/**
 * Multiplies a vector with a scalar. The w-coordinate is not scaled, since that's generally not what is desired.
 *
 * @param a
 * @param s
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The product of a * s
 */
Float4.scale = function(a, s, target)
{
    target = target || new Float4();
    target.x = a.x * s;
    target.y = a.y * s;
    target.z = a.z * s;
    return target;
};

/**
 * Multiplies a vector with a scalar, including the w-coordinate.
 * @param a
 * @param s
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The product of a * s
 */
Float4.scale4 = function(a, s, target)
{
    target = target || new Float4();
    target.x = a.x * s;
    target.y = a.y * s;
    target.z = a.z * s;
    target.w = a.w * s;
    return target;
};

/**
 * Returns the 3-component dot product of 2 vectors.
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The product of a x b
 */
Float4.cross = function(a, b, target)
{
    target = target || new Float4();
    // safe to use either a and b parameter
    var ax = a.x, ay = a.y, az = a.z;
    var bx = b.x, by = b.y, bz = b.z;

    target.x = ay*bz - az*by;
    target.y = az*bx - ax*bz;
    target.z = ax*by - ay*bx;
    return target;
};

Float4.prototype =
{
    /**
     * Sets the components explicitly.
     */
    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w === undefined? this.w : w;
    },

    /**
     * The squared length of the vector.
     */
    get lengthSqr()
    {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    },

    /**
     * The length of the vector.
     */
    get length()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },

    /**
     * Normalizes the vector.
     */
    normalize: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
    },

    /**
     * Normalizes the vector as if it were a plane.
     */
    normalizeAsPlane: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
        this.w *= rcpLength;
    },

    /**
     * Returns a copy of this object.
     */
    clone: function()
    {
        return new Float4(this.x, this.y, this.z, this.w);
    },

    /**
     * Adds a vector to this one in place.
     */
    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
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
        this.z += v.z * s;
        this.w += v.w * s;
    },

    /**
     * Subtracts a vector from this one in place.
     */
    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
    },

    /**
     * Multiplies the components of this vector with a scalar, except the w-component.
     */
    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        //this.w *= s;
    },

    /**
     * Multiplies the components of this vector with a scalar, including the w-component.
     */
    scale4: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
    },

    /**
     * Negates the components of this vector.
     */
    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
    },

    /**
     * Project a point in homogeneous projective space to carthesian 3D space by dividing by w
     */
    homogeneousProject: function()
    {
        var rcpW = 1.0/this.w;
        this.x *= rcpW;
        this.y *= rcpW;
        this.z *= rcpW;
        this.w = 1.0;
    },

    /**
     * Sets the components of this vector to their absolute values.
     */
    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);
        this.w = Math.abs(this.w);
    },

    /**
     * Sets the euclidian coordinates based on spherical coordinates
     * @param radius The radius coordinate
     * @param azimuthalAngle The azimuthal coordinate
     * @param polarAngle The polar coordinate
     */
    fromSphericalCoordinates: function(radius, azimuthalAngle, polarAngle)
    {
        this.x = radius*Math.sin(polarAngle)*Math.cos(azimuthalAngle);
        this.y = radius*Math.cos(polarAngle);
        this.z = radius*Math.sin(polarAngle)*Math.sin(azimuthalAngle);
        this.w = 0.0;
    },

    /**
     * Copies the values from a different Float4
     */
    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.w = b.w;
    },

    /**
     * Replaces the components' values if those of the other Float2 are higher, respectively
     */
    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
        if (b.w > this.w) this.w = b.w;
    },

    /**
     * Replaces the components' values if those of the other Float2 are higher, respectively. Excludes the w-component.
     */
    maximize3: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
    },

    /**
     * Replaces the components' values if those of the other Float2 are lower, respectively
     */
    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
        if (b.w < this.w) this.w = b.w;
    },

    /**
     * Replaces the components' values if those of the other Float2 are lower, respectively. Excludes the w-component.
     */
    minimize3: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
    },

    /**
     * Generates a plane representation from the normal vector and a point contained in the plane.
     * @param normal The vector normal to the plane.
     * @param point A point contained in the plane.
     */
    planeFromNormalAndPoint: function(normal, point)
    {
        var nx = normal.x, ny = normal.y, nz = normal.z;
        this.x = nx;
        this.y = ny;
        this.z = nz;
        this.w = -(point.x * nx + point.y * ny + point.z * nz);
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "Float4(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
    }
};

/**
 * A preset for the origin point (w = 1)
 */
Float4.ORIGIN_POINT = new Float4(0, 0, 0, 1);

/**
 * A preset for the zero vector (w = 0)
 */
Float4.ZERO = new Float4(0, 0, 0, 0);

/**
 * A preset for the X-axis
 */
Float4.X_AXIS = new Float4(1, 0, 0, 0);

/**
 * A preset for the Y-axis
 */
Float4.Y_AXIS = new Float4(0, 1, 0, 0);

/**
 * A preset for the Z-axis
 */
Float4.Z_AXIS = new Float4(0, 0, 1, 0);

export { Float4 };