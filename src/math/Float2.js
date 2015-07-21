/**
 * Creates a new Float2 object
 * @class
 * @constructor
 */
HX.Float2 = function(x, y)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
};


/**
 * Returns the angle between two vectors
 */
HX.Float2.angle = function(a, b)
{
    return Math.acos(HX.dot2(a, b) / (a.length() * b.length()));
};

HX.Float2.distance = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Returns the angle between two vectors, assuming they are normalized
 */
HX.Float2.angleNormalized = function(a, b)
{
    return Math.acos(HX.dot2(a, b));
};

HX.Float2.sum = function(a, b)
{
    return new HX.Float2(
        a.x + b.x,
        a.y + b.y
    );
};

HX.Float2.scale = function(a, s)
{
    return new HX.Float2(
        a.x * s,
        a.y * s
    );
}

HX.Float2.prototype = {
    constructor: HX.Float2,

    set: function(x, y)
    {
        this.x = x;
        this.y = y;
    },

    lengthSqr: function()
    {
        return this.x * this.x + this.y * this.y;
    },

    length: function()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    normalize: function()
    {
        var rcpLength = 1.0/this.length();
        this.x *= rcpLength;
        this.y *= rcpLength;
    },

    clone: function()
    {
        return new HX.Float2(this.x, this.y);
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

    sum: function(a, b)
    {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
    },

    difference: function(a, b)
    {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
    },

    scaled: function(s, a)
    {
        this.x = s*a.x;
        this.y = s*a.y;
    },

    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
    },

    /**
     * Component-wise multiplication
     */
    multiply: function(v)
    {
        this.x *= v.x;
        this.y *= v.y;
    },

    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
    },

    lerp: function(a, b, t)
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
}

HX.Float2.ZERO = new HX.Float2(0, 0);
HX.Float2.X_AXIS = new HX.Float2(1, 0);
HX.Float2.Y_AXIS = new HX.Float2(0, 1);