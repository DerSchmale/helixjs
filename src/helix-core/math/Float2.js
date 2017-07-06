/**
 * Returns the angle between two vectors
 */
Float2.angle = function(a, b)
{
    return Math.acos(Float2.dot(a, b) / (a.length * b.length));
};


/**
 * Creates a new Float2 object
 * @class
 * @constructor
 */
function Float2(x, y)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
}

Float2.distance = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

Float2.dot = function(a, b)
{
    return a.x * b.x + a.y * b.y;
};

/**
 * Returns the angle between two vectors, assuming they are normalized
 */
Float2.angleNormalized = function(a, b)
{
    return Math.acos(Float2.dot(a, b));
};

Float2.add = function(a, b, target)
{
    target = target || new Float2();
    target.x = a.x + b.x;
    target.y = a.y + b.y;
    return target;
};

Float2.subtract = function(a, b, target)
{
    target = target || new Float2();
    target.x = a.x - b.x;
    target.y = a.y - b.y;
    return target;
};

Float2.scale = function(a, s, target)
{
    target = target || new Float2();
    target.x = a.x * s;
    target.y = a.y * s;
    return target;
};

Float2.negate = function(a, b, target)
{
    target = target || new Float2();
    target.x = -target.x;
    target.y = -target.y;
    return target;
};

Float2.prototype =
{
    set: function(x, y)
    {
        this.x = x;
        this.y = y;
    },

    get lengthSqr()
    {
        return this.x * this.x + this.y * this.y;
    },

    get length()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    normalize: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
    },

    clone: function()
    {
        return new Float2(this.x, this.y);
    },

    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
    },

    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
    },

    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
    },

    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
    },

    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
    },

    lerp: function(a, b, factor)
    {
        var ax = a.x, ay = a.y;

        this.x = ax + (b.x - ax) * factor;
        this.y = ay + (b.y - ay) * factor;
    },

    fromPolarCoordinates: function(radius, angle)
    {
        this.x = radius*Math.cos(angle);
        this.y = radius*Math.sin(angle);
    },

    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
    },

    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
    },

    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
    }
};

Float2.ZERO = new Float2(0, 0);
Float2.X_AXIS = new Float2(1, 0);
Float2.Y_AXIS = new Float2(0, 1);

export { Float2 };