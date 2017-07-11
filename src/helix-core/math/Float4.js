/**
 * Creates a new Float4 object, which can be used as a vector (w = 0), a point (w = 1) or a homogeneous coordinate.
 * @class
 * @constructor
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
 * Returns the angle between two vectors
 */
Float4.angle = function(a, b)
{
    return Math.acos(Float4.dot3(a, b) / (a.length * b.length));
};

Float4.dot = Float4.dot3 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z;
};

Float4.dot4 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
};

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

Float4.distance = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

Float4.distanceSqr = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
};

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
 * Returns the angle between two vectors, assuming they are normalized
 */
Float4.angleNormalized = function(a, b)
{
    return Math.acos(Float4.dot3(a, b));
};

Float4.add = function(a, b, target)
{
    target = target || new Float4();
    target.x = a.x + b.x;
    target.y = a.y + b.y;
    target.z = a.z + b.z;
    target.w = a.w + b.w;
    return target;
};

Float4.subtract = function(a, b, target)
{
    target = target || new Float4();
    target.x = a.x - b.x;
    target.y = a.y - b.y;
    target.z = a.z - b.z;
    target.w = a.w - b.w;
    return target;
};

Float4.scale = function(a, s, target)
{
    target = target || new Float4();
    target.x = a.x * s;
    target.y = a.y * s;
    target.z = a.z * s;
    return target;
};

Float4.scale4 = function(a, s, target)
{
    target = target || new Float4();
    target.x = a.x * s;
    target.y = a.y * s;
    target.z = a.z * s;
    target.w = a.w * s;
    return target;
};

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
    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w === undefined? this.w : w;
    },

    get lengthSqr()
    {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    },

    get length()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },

    normalize: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
    },

    normalizeAsPlane: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
        this.w *= rcpLength;
    },

    clone: function()
    {
        return new Float4(this.x, this.y, this.z, this.w);
    },

    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
    },

    addScaled: function(v, s)
    {
        this.x += v.x * s;
        this.y += v.y * s;
        this.z += v.z * s;
        this.w += v.w * s;
    },

    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
    },

    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        //this.w *= s;
    },

    scale4: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
    },

    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
    },

    /**
     * Project to carthesian 3D space by dividing by w
     */
    homogeneousProject: function()
    {
        var rcpW = 1.0/this.w;
        this.x *= rcpW;
        this.y *= rcpW;
        this.z *= rcpW;
        this.w = 1.0;
    },

    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);
        this.w = Math.abs(this.w);
    },

    fromSphericalCoordinates: function(radius, azimuthalAngle, polarAngle)
    {
        this.x = radius*Math.sin(polarAngle)*Math.cos(azimuthalAngle);
        this.y = radius*Math.cos(polarAngle);
        this.z = radius*Math.sin(polarAngle)*Math.sin(azimuthalAngle);
        this.w = 0.0;
    },

    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.w = b.w;
    },

    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
        if (b.w > this.w) this.w = b.w;
    },

    maximize3: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
    },

    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
        if (b.w < this.w) this.w = b.w;
    },

    minimize3: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
    },

    planeFromNormalAndPoint: function(normal, point)
    {
        var nx = normal.x, ny = normal.y, nz = normal.z;
        this.x = nx;
        this.y = ny;
        this.z = nz;
        this.w = -(point.x * nx + point.y * ny + point.z * nz);
    },

    toString: function()
    {
        return "Float4(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
    }
};

Float4.ORIGIN_POINT = new Float4(0, 0, 0, 1);
Float4.ZERO = new Float4(0, 0, 0, 0);
Float4.X_AXIS = new Float4(1, 0, 0, 0);
Float4.Y_AXIS = new Float4(0, 1, 0, 0);
Float4.Z_AXIS = new Float4(0, 0, 1, 0);

export { Float4 };