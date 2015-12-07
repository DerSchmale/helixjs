HX.Quaternion = function ()
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
};

HX.Quaternion.fromAxisAngle = function (axis, radians)
{
    var q = new HX.Quaternion();
    q.fromAxisAngle(axis, radians);
    return q;
};

HX.Quaternion.fromPitchYawRoll = function (pitch, yaw, roll)
{
    var q = new HX.Quaternion();
    q.fromPitchYawRoll(pitch, yaw, roll);
    return q;
};

HX.Quaternion.prototype = {
    fromAxisAngle: function (axis, radians)
    {
        var factor = Math.sin(radians * .5) / axis.length();
        this.x = axis.x * factor;
        this.y = axis.y * factor;
        this.z = axis.z * factor;
        this.w = Math.cos(radians * .5);
    },

    fromPitchYawRoll: function(pitch, yaw, roll)
    {
        var mtx = new HX.Matrix4x4();
        // wasteful. improve.
        mtx.rotationPitchYawRoll(pitch, yaw, roll);
        this.fromMatrix(mtx);
    },

    fromXYZ: function(x, y, z)
    {
        var mtx = new HX.Matrix4x4();
        // wasteful. improve.
        mtx.rotationXYZ(x, y, z);
        this.fromMatrix(mtx);
    },

    fromMatrix: function(m)
    {
        var m00 = m._m[0];
        var m11 = m._m[5];
        var m22 = m._m[10];
        var trace = m00 + m11 + m22;

        if (trace > 0.0) {
            trace += 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;
            this.x = s*(m._m[6] - m._m[9]);
            this.y = s*(m._m[8] - m._m[2]);
            this.z = s*(m._m[1] - m._m[4]);
            this.w = s*trace;
        }
        else if (m00 > m11 && m00 > m22) {
            trace = m00 - m11 - m22 + 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*trace;
            this.y = s*(m._m[1] + m._m[4]);
            this.z = s*(m._m[8] + m._m[2]);
            this.w = s*(m._m[6] - m._m[9]);
        }
        else if (m11 > m22) {
            trace = m11 - m00 - m22 + 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[1] + m._m[4]);
            this.y = s*trace;
            this.z = s*(m._m[6] + m._m[9]);
            this.w = s*(m._m[8] - m._m[2]);
        }
        else {
            trace = m22 - m00 - m11 + 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[8] + m._m[2]);
            this.y = s*(m._m[6] + m._m[9]);
            this.z = s*trace;
            this.w = s*(m._m[1] - m._m[4]);
        }
    },

    rotate: function(v)
    {
        var vx = v.x, vy = v.y, vz = v.z;

        // p*q'
        var w1 = - this.x * vx - this.y * vy - this.z * vz;
        var x1 = w * vx + this.y * vz - this.z * vy;
        var y1 = w * vy - this.x * vz + this.z * vx;
        var z1 = w * vz + this.x * vy - this.y * vx;

        return new HX.Float4(-w1 * this.x + x1 * this.w - y1 * this.z + z1 * this.y,
                                -w1 * this.y + x1 * this.z + y1 * this.w - z1 * this.x,
                                -w1 * this.z - x1 * this.y + y1 * this.x + z1 * this.w,
                                v.w);
    },

    lerp: function(a, b, factor)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

        // use shortest direction
        if (w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2 < 0) {
            w2 = -w2;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
        }

        this.x = x1 + factor * (x2 - x1);
        this.y = y1 + factor * (y2 - y1);
        this.z = z1 + factor * (z2 - z1);
        this.w = w1 + factor * (w2 - w1);

        this.normalize();
    },

    slerp: function(a, b, factor)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;
        var dot = w1*w2 + x1*x2 + y1*y2 + z1*z2;

        // shortest direction
        if (dot < 0.0) {
            dot = -dot;
            w2 = -w2;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
        }

        if (dot < 0.95) {
            // interpolate angle linearly
            var angle = Math.acos(dot);
            var interpolatedAngle = factor*angle;

            this.x = x2 - x1*dot;
            this.y = y2 - y1*dot;
            this.z = z2 - z1*dot;
            this.w = w2 - w1*dot;
            this.normalize();

            var cos = Math.cos(interpolatedAngle);
            var sin = Math.sin(interpolatedAngle);
            this.x = x1 * cos + this.x * sin;
            this.y = y1 * cos + this.y * sin;
            this.z = z1 * cos + this.z * sin;
            this.w = w1 * cos + this.w * sin;
        }
        else {
            // nearly identical angle, interpolate linearly
            this.x = x1 + factor * (x2 - x1);
            this.y = y1 + factor * (y2 - y1);
            this.z = z1 + factor * (z2 - z1);
            this.w = w1 + factor * (w2 - w1);
            this.normalize();
        }
    },

    // results in the same net rotation, but with different orientation
    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
    },

    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    },

    normSquared : function()
    {
        return this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w;
    },

    norm : function()
    {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
    },

    normalize : function()
    {
        var rcpNorm = 1.0/Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
        this.x *= rcpNorm;
        this.y *= rcpNorm;
        this.z *= rcpNorm;
        this.w *= rcpNorm;
    },

    conjugateOf : function(q)
    {
        this.x = -q.x;
        this.y = -q.y;
        this.z = -q.z;
        this.w = q.w;
    },

    inverseOf: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
        this.x = -x*rcpSqrNorm;
        this.y = -y*rcpSqrNorm;
        this.z = -z*rcpSqrNorm;
        this.w = w*rcpSqrNorm;
    },

    invert: function (q)
    {
        var x = this.x, y = this.y, z = this.z, w = this.w;
        var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
        this.x = -x*rcpSqrNorm;
        this.y = -y*rcpSqrNorm;
        this.z = -z*rcpSqrNorm;
        this.w = w*rcpSqrNorm;
    },

    product: function(a, b)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

        this.x = w1*x2 + x1*w2 + y1*z2 - z1*y2;
        this.y = w1*y2 - x1*z2 + y1*w2 + z1*x2;
        this.z = w1*z2 + x1*y2 - y1*x2 + z1*w2;
        this.w = w1*w2 - x1*x2 - y1*y2 - z1*z2;
    },

    append: function(q)
    {
        this.product(q, this);
    },

    prepend: function(q)
    {
        this.product(this, q);
    },

    toString: function()
    {
        return "Quaternion(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
    }

};