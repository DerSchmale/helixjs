import {Float4} from './Float4';
import {Matrix4x4} from './Matrix4x4';

function Quaternion()
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
}

Quaternion.conjugate = function(q, target)
{
    target = target || new Quaternion();
    target.x = -q.x;
    target.y = -q.y;
    target.z = -q.z;
    target.w = q.w;
    return target;
};

Quaternion.invert = function (q, target)
{
    target = target || new Quaternion();
    var x = q.x, y = q.y, z = q.z, w = q.w;
    var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
    this.x = -x*rcpSqrNorm;
    this.y = -y*rcpSqrNorm;
    this.z = -z*rcpSqrNorm;
    this.w = w*rcpSqrNorm;
    return target;
};

Quaternion.lerp = function(a, b, factor, target)
{
    target = target || new Quaternion();
    var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
    var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

    // use shortest direction
    if (w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2 < 0) {
        w2 = -w2;
        x2 = -x2;
        y2 = -y2;
        z2 = -z2;
    }

    target.x = x1 + factor * (x2 - x1);
    target.y = y1 + factor * (y2 - y1);
    target.z = z1 + factor * (z2 - z1);
    target.w = w1 + factor * (w2 - w1);

    this.normalize();
};

Quaternion.slerp = function(a, b, factor, target)
{
    target = target || new Quaternion();
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
        target.x = x1 * cos + this.x * sin;
        target.y = y1 * cos + this.y * sin;
        target.z = z1 * cos + this.z * sin;
        target.w = w1 * cos + this.w * sin;
    }
    else {
        // nearly identical angle, interpolate linearly
        target.x = x1 + factor * (x2 - x1);
        target.y = y1 + factor * (y2 - y1);
        target.z = z1 + factor * (z2 - z1);
        target.w = w1 + factor * (w2 - w1);
        this.normalize();
    }

    return target;
};

Quaternion.prototype =
{
    fromAxisAngle: function (axis, radians)
    {
        var halfAngle = radians * .5;
        var factor = Math.sin(halfAngle) / axis.length;
        this.x = axis.x * factor;
        this.y = axis.y * factor;
        this.z = axis.z * factor;
        this.w = Math.cos(halfAngle);
    },

    // Tait-Bryan angles, not classic Euler, radians
    fromPitchYawRoll: function(pitch, yaw, roll)
    {
        var mtx = new Matrix4x4();
        // wasteful. improve.
        mtx.fromRotationPitchYawRoll(pitch, yaw, roll);
        this.fromMatrix(mtx);
    },

    // X*Y*Z order (meaning z first), radians
    fromEuler: function(x, y, z)
    {
        var cx = Math.cos(x * 0.5), cy = Math.cos(y * 0.5), cz = Math.cos(z * 0.5);
        var sx = Math.sin(x * 0.5), sy = Math.sin(y * 0.5), sz = Math.sin(z * 0.5);

        this.x = sx*cy*cz + cx*sy*sz;
        this.y = cx*sy*cz - sx*cy*sz;
        this.z = cx*cy*sz + sx*sy*cz;
        this.w = cx*cy*cz - sx*sy*sz;
    },

    toEuler: function(target)
    {
        target = target || new Float4();

        var x = this.x, y = this.y, z = this.z, w = this.w;
        var xx = x * x, yy = y * y, zz = z * z, ww = w * w;

        target.x = Math.atan2( -2*(y*z - w*x), ww - xx - yy + zz );
        target.y = Math.asin ( 2*(x*z + w*y) );
        target.z = Math.atan2( -2*(x*y - w*z), ww + xx - yy - zz );

        return target;
    },

    fromMatrix: function(m)
    {
        var m00 = m._m[0];
        var m11 = m._m[5];
        var m22 = m._m[10];
        var trace = m00 + m11 + m22;
        var s;

        if (trace > 0.0) {
            trace += 1.0;
            s = 1.0/Math.sqrt(trace)*.5;
            this.x = s*(m._m[6] - m._m[9]);
            this.y = s*(m._m[8] - m._m[2]);
            this.z = s*(m._m[1] - m._m[4]);
            this.w = s*trace;
        }
        else if (m00 > m11 && m00 > m22) {
            trace = m00 - m11 - m22 + 1.0;
            s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*trace;
            this.y = s*(m._m[1] + m._m[4]);
            this.z = s*(m._m[8] + m._m[2]);
            this.w = s*(m._m[6] - m._m[9]);
        }
        else if (m11 > m22) {
            trace = m11 - m00 - m22 + 1.0;
            s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[1] + m._m[4]);
            this.y = s*trace;
            this.z = s*(m._m[6] + m._m[9]);
            this.w = s*(m._m[8] - m._m[2]);
        }
        else {
            trace = m22 - m00 - m11 + 1.0;
            s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[8] + m._m[2]);
            this.y = s*(m._m[6] + m._m[9]);
            this.z = s*trace;
            this.w = s*(m._m[1] - m._m[4]);
        }

        // this is to prevent non-normalized due to rounding errors
        this.normalize();
    },

    rotate: function(v, target)
    {
        target = target || new Float4();

        var vx = v.x, vy = v.y, vz = v.z;
        var x = this.x, y = this.y, z = this.z, w = this.w;

        // p*q'
        var w1 = - x * vx - y * vy - z * vz;
        var x1 = w * vx + y * vz - z * vy;
        var y1 = w * vy - x * vz + z * vx;
        var z1 = w * vz + x * vy - y * vx;

        target.x = -w1 * x + x1 * w - y1 * z + z1 * y;
        target.y = -w1 * y + x1 * z + y1 * w - z1 * x;
        target.z = -w1 * z - x1 * y + y1 * x + z1 * w;
        target.w = v.w;
        return target;
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

    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.w = b.w;
    },

    get normSquared()
    {
        return this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w;
    },

    get norm()
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

    invert: function ()
    {
        var x = this.x, y = this.y, z = this.z, w = this.w;
        var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
        this.x = -x*rcpSqrNorm;
        this.y = -y*rcpSqrNorm;
        this.z = -z*rcpSqrNorm;
        this.w = w*rcpSqrNorm;
    },

    multiply: function(a, b)
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
        this.multiply(q, this);
    },

    prepend: function(q)
    {
        this.multiply(this, q);
    },

    toString: function()
    {
        return "Quaternion(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
    }
};

export { Quaternion };