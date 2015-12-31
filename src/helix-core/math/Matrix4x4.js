/**
 * Creates a new Matrix4x4 object
 * @class
 * @constructor
 */
// row-major order of passing
HX.Matrix4x4 = function (m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33)
{
    if (m00 !== undefined && isNaN(m00)) {
        this._m = new Float32Array(m00);
    }
    else {
        this._m = new Float32Array(16);

        this._m[0] = m00 === undefined ? 1 : 0;
        this._m[1] = m10 || 0;
        this._m[2] = m20 || 0;
        this._m[3] = m30 || 0;
        this._m[4] = m01 || 0;
        this._m[5] = m11 === undefined ? 1 : 0;
        this._m[6] = m21 || 0;
        this._m[7] = m31 || 0;
        this._m[8] = m02 || 0;
        this._m[9] = m12 || 0;
        this._m[10] = m22 === undefined ? 1 : 0;
        this._m[11] = m32 || 0;
        this._m[12] = m03 || 0;
        this._m[13] = m13 || 0;
        this._m[14] = m23 || 0;
        this._m[15] = m33 === undefined ? 1 : 0;
    }
};

HX.Matrix4x4.prototype =
{
    constructor: HX.Matrix4x4,

    /**
     * Transforms a Float4 object (use for homogeneous general case of Float4)
     */
    transform: function (v, target)
    {
        target = target || new HX.Float4();
        var x = v.x, y = v.y, z = v.z, w = v.w;
        var m = this._m;

        target.x = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
        target.y = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
        target.z = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
        target.w = m[3] * x + m[7] * y + m[11] * z + m[15] * w;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a point. Slightly faster than transform for points.
     */
    transformPoint: function (v, target)
    {
        target = target || new HX.Float4();
        var x = v.x, y = v.y, z = v.z;
        var m = this._m;

        target.x = m[0] * x + m[4] * y + m[8] * z + m[12];
        target.y = m[1] * x + m[5] * y + m[9] * z + m[13];
        target.z = m[2] * x + m[6] * y + m[10] * z + m[14];
        target.w = 1.0;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation). Slightly faster than transform for vectors.
     */
    transformVector: function (v, target)
    {
        target = target || new HX.Float4();
        var x = v.x, y = v.y, z = v.z;

        target.x = this._m[0] * x + this._m[4] * y + this._m[8] * z;
        target.y = this._m[1] * x + this._m[5] * y + this._m[9] * z;
        target.z = this._m[2] * x + this._m[6] * y + this._m[10] * z;
        target.w = 0.0;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation) containing a size (so always abs)! Slightly faster than transform for vectors.
     */
    transformExtent: function (v, target)
    {
        target = target || new HX.Float4();
        var x = v.x, y = v.y, z = v.z;

        var m00 = this._m[0], m10 = this._m[1], m20 = this._m[2];
        var m01 = this._m[4], m11 = this._m[5], m21 = this._m[6];
        var m02 = this._m[8], m12 = this._m[9], m22 = this._m[10];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;

        target.x = m00 * x + m01 * y + m02 * z;
        target.y = m10 * x + m11 * y + m12 * z;
        target.z = m20 * x + m21 * y + m22 * z;
        target.w = 0.0;

        return target;
    },

    copyFrom: function(m)
    {
        this._m[0] = m._m[0];
        this._m[1] = m._m[1];
        this._m[2] = m._m[2];
        this._m[3] = m._m[3];
        this._m[4] = m._m[4];
        this._m[5] = m._m[5];
        this._m[6] = m._m[6];
        this._m[7] = m._m[7];
        this._m[8] = m._m[8];
        this._m[9] = m._m[9];
        this._m[10] = m._m[10];
        this._m[11] = m._m[11];
        this._m[12] = m._m[12];
        this._m[13] = m._m[13];
        this._m[14] = m._m[14];
        this._m[15] = m._m[15];
    },

    fromQuaternion: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;

        this._m[0] = 1 - 2 * (y * y + z * z);
        this._m[1] = 2 * (x * y + w * z);
        this._m[2] = 2 * (x * z - w * y);
        this._m[3] = 0;
        this._m[4] = 2 * (x * y - w * z);
        this._m[5] = 1 - 2 * (x * x + z * z);
        this._m[6] = 2 * (y * z + w * x);
        this._m[7] = 0;
        this._m[8] = 2 * (x * z + w * y);
        this._m[9] = 2 * (y * z - w * x);
        this._m[10] = 1 - 2 * (x * x + y * y);
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    multiply: function (a, b)
    {
        var a_m00 = a._m[0], a_m10 = a._m[1], a_m20 = a._m[2], a_m30 = a._m[3];
        var a_m01 = a._m[4], a_m11 = a._m[5], a_m21 = a._m[6], a_m31 = a._m[7];
        var a_m02 = a._m[8], a_m12 = a._m[9], a_m22 = a._m[10], a_m32 = a._m[11];
        var a_m03 = a._m[12], a_m13 = a._m[13], a_m23 = a._m[14], a_m33 = a._m[15];
        var b_m00 = b._m[0], b_m10 = b._m[1], b_m20 = b._m[2], b_m30 = b._m[3];
        var b_m01 = b._m[4], b_m11 = b._m[5], b_m21 = b._m[6], b_m31 = b._m[7];
        var b_m02 = b._m[8], b_m12 = b._m[9], b_m22 = b._m[10], b_m32 = b._m[11];
        var b_m03 = b._m[12], b_m13 = b._m[13], b_m23 = b._m[14], b_m33 = b._m[15];

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20 + a_m03 * b_m30;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20 + a_m13 * b_m30;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20 + a_m23 * b_m30;
        this._m[3] = a_m30 * b_m00 + a_m31 * b_m10 + a_m32 * b_m20 + a_m33 * b_m30;
        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21 + a_m03 * b_m31;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21 + a_m13 * b_m31;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21 + a_m23 * b_m31;
        this._m[7] = a_m30 * b_m01 + a_m31 * b_m11 + a_m32 * b_m21 + a_m33 * b_m31;
        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22 + a_m03 * b_m32;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22 + a_m13 * b_m32;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22 + a_m23 * b_m32;
        this._m[11] = a_m30 * b_m02 + a_m31 * b_m12 + a_m32 * b_m22 + a_m33 * b_m32;
        this._m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03 * b_m33;
        this._m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13 * b_m33;
        this._m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23 * b_m33;
        this._m[15] = a_m30 * b_m03 + a_m31 * b_m13 + a_m32 * b_m23 + a_m33 * b_m33;
    },

    multiplyAffine: function (a, b)
    {
        var a_m00 = a._m[0], a_m10 = a._m[1], a_m20 = a._m[2];
        var a_m01 = a._m[4], a_m11 = a._m[5], a_m21 = a._m[6];
        var a_m02 = a._m[8], a_m12 = a._m[9], a_m22 = a._m[10];
        var a_m03 = a._m[12], a_m13 = a._m[13], a_m23 = a._m[14];
        var b_m00 = b._m[0], b_m10 = b._m[1], b_m20 = b._m[2];
        var b_m01 = b._m[4], b_m11 = b._m[5], b_m21 = b._m[6];
        var b_m02 = b._m[8], b_m12 = b._m[9], b_m22 = b._m[10];
        var b_m03 = b._m[12], b_m13 = b._m[13], b_m23 = b._m[14];

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        this._m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03;
        this._m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13;
        this._m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23;

    },

    fromRotationAxisAngle: function (axis, radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;


        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        this._m[0] = oneMinCos * x * x + cos;
        this._m[1] = oneMinCos * x * y + sin * z;
        this._m[2] = oneMinCos * x * z - sin * y;
        this._m[3] = 0;
        this._m[4] = oneMinCos * x * y - sin * z;
        this._m[5] = oneMinCos * y * y + cos;
        this._m[6] = oneMinCos * y * z + sin * x;
        this._m[7] = 0;
        this._m[8] = oneMinCos * x * z + sin * y;
        this._m[9] = oneMinCos * y * z - sin * x;
        this._m[10] = oneMinCos * z * z + cos;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    // this actually doesn't use a vector, because they're three unrelated quantities. A vector just doesn't make sense here, mathematically.
    fromEuler: function (x, y, z)
    {
        var cosX = Math.cos(x);
        var sinX = Math.sin(x);
        var cosY = Math.cos(y);
        var sinY = Math.sin(y);
        var cosZ = Math.cos(z);
        var sinZ = Math.sin(z);

        this._m[0] = cosY * cosZ;
        this._m[1] = cosX * sinZ + sinX * sinY * cosZ;
        this._m[2] = sinX * sinZ - cosX * sinY * cosZ;
        this._m[3] = 0;
        this._m[4] = -cosY * sinZ;
        this._m[5] = cosX * cosZ - sinX * sinY * sinZ;
        this._m[6] = sinX * cosZ + cosX * sinY * sinZ;
        this._m[7] = 0;
        this._m[8] = sinY;
        this._m[9] = -sinX * cosY;
        this._m[10] = cosX * cosY;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    // Tait-Bryan angles, not classic Euler
    fromRotationPitchYawRoll: function (pitch, yaw, roll)
    {
        var cosP = Math.cos(-pitch);
        var cosY = Math.cos(-yaw);
        var cosR = Math.cos(roll);
        var sinP = Math.sin(-pitch);
        var sinY = Math.sin(-yaw);
        var sinR = Math.sin(roll);

        var zAxisX = -sinY * cosP;
        var zAxisY = -sinP;
        var zAxisZ = cosY * cosP;

        var yAxisX = -cosY * sinR - sinY * sinP * cosR;
        var yAxisY = cosP * cosR;
        var yAxisZ = -sinY * sinR + sinP * cosR * cosY;

        var xAxisX = yAxisY * zAxisZ - yAxisZ * zAxisY;
        var xAxisY = yAxisZ * zAxisX - yAxisX * zAxisZ;
        var xAxisZ = yAxisX * zAxisY - yAxisY * zAxisX;

        this._m[0] = xAxisX;
        this._m[1] = xAxisY;
        this._m[2] = xAxisZ;
        this._m[3] = 0;
        this._m[4] = yAxisX;
        this._m[5] = yAxisY;
        this._m[6] = yAxisZ;
        this._m[7] = 0;
        this._m[8] = zAxisX;
        this._m[9] = zAxisY;
        this._m[10] = zAxisZ;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    fromTranslation: function (v)
    {
        this._m[0] = 1;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = 1;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = 1;
        this._m[11] = 0;
        this._m[12] = v.x;
        this._m[13] = v.y;
        this._m[14] = v.z;
        this._m[15] = 1;
    },

    fromScale: function (x, y, z)
    {
        if (y === undefined)
            y = z = x;

        this._m[0] = x;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = y;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = z;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    fromPerspectiveProjection: function (vFOV, aspectRatio, nearDistance, farDistance)
    {
        var yMax = 1.0 / Math.tan(vFOV * .5);
        var xMax = yMax / aspectRatio;
        var rcpFrustumDepth = 1.0 / (nearDistance - farDistance);

        this._m[0] = xMax;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;

        this._m[4] = 0;
        this._m[5] = yMax;
        this._m[6] = 0;
        this._m[7] = 0;

        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = (farDistance + nearDistance) * rcpFrustumDepth;
        this._m[11] = -1;

        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 2 * nearDistance * farDistance * rcpFrustumDepth;
        this._m[15] = 0;
    },

    fromOrthographicOffCenterProjection: function (left, right, top, bottom, nearDistance, farDistance)
    {
        var rcpWidth = 1.0 / (right - left);
        var rcpHeight = 1.0 / (top - bottom);
        var rcpDepth = 1.0 / (nearDistance - farDistance);

        this._m[0] = 2.0 * rcpWidth;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;

        this._m[4] = 0;
        this._m[5] = 2.0 * rcpHeight;
        this._m[6] = 0;
        this._m[7] = 0;

        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = 2.0 * rcpDepth;
        this._m[11] = 0;

        this._m[12] = -(left + right) * rcpWidth;
        this._m[13] = -(top + bottom) * rcpHeight;
        this._m[14] = (farDistance + nearDistance) * rcpDepth;
        this._m[15] = 1;
    },

    fromOrthographicProjection: function (width, height, nearDistance, farDistance)
    {
        var yMax = Math.tan(vFOV * .5);
        var xMax = yMax * aspectRatio;
        var rcpFrustumDepth = 1.0 / (nearDistance - farDistance);

        this._m[0] = 1 / xMax;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = 1 / yMax;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = 2 * rcpFrustumDepth;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = (farDistance + nearDistance) * rcpFrustumDepth;
        this._m[15] = 1;
    },

    clone: function ()
    {
        return new HX.Matrix4x4(this._m);
    },

    transpose: function ()
    {
        var m1 = this._m[1];
        var m2 = this._m[2];
        var m3 = this._m[3];
        var m6 = this._m[6];
        var m7 = this._m[7];
        var m11 = this._m[11];

        this._m[1] = this._m[4];
        this._m[2] = this._m[8];
        this._m[3] = this._m[12];

        this._m[4] = m1;
        this._m[6] = this._m[9];
        this._m[7] = this._m[13];

        this._m[8] = m2;
        this._m[9] = m6;
        this._m[11] = this._m[14];

        this._m[12] = m3;
        this._m[13] = m7;
        this._m[14] = m11;
    },

    /**
     * The determinant of a 3x3 minor matrix (matrix created by removing a given row and column)
     * @private
     */
    determinant3x3: function (row, col)
    {
        // todo: can this be faster?
        // columns are the indices * 4 (to form index for row 0)
        var c1 = col == 0 ? 4 : 0;
        var c2 = col < 2 ? 8 : 4;
        var c3 = col == 3 ? 8 : 12;
        var r1 = row == 0 ? 1 : 0;
        var r2 = row < 2 ? 2 : 1;
        var r3 = row == 3 ? 2 : 3;

        var m21 = this._m[c1 | r2], m22 = this._m[r2 | c2], m23 = this._m[c3 | r2];
        var m31 = this._m[c1 | r3], m32 = this._m[c2 | r3], m33 = this._m[r3 | c3];

        return      this._m[c1 | r1] * (m22 * m33 - m23 * m32)
            - this._m[c2 | r1] * (m21 * m33 - m23 * m31)
            + this._m[c3 | r1] * (m21 * m32 - m22 * m31);
    },

    cofactor: function (row, col)
    {
        // should be able to xor sign bit instead
        var sign = 1 - (((row + col) & 1) << 1);
        return sign * this.determinant3x3(row, col);
    },

    getCofactorMatrix: function (row, col, target)
    {
        target = target || new HX.Matrix4x4();

        for (var i = 0; i < 16; ++i)
            target._m[i] = this.cofactor(i & 3, i >> 2);

        return target;
    },

    getAdjugate: function (row, col, target)
    {
        target = target || new HX.Matrix4x4();

        for (var i = 0; i < 16; ++i)
            target._m[i] = this.cofactor(i >> 2, i & 3);    // transposed!

        return target;
    },

    determinant: function ()
    {
        return this._m[0] * this.determinant3x3(0, 0) - this._m[4] * this.determinant3x3(0, 1) + this._m[8] * this.determinant3x3(0, 2) - this._m[12] * this.determinant3x3(0, 3);
    },

    inverseOf: function (m)
    {
        // this can be much more efficient, but I'd like to keep it readable for now. The full inverse is not required often anyway.
        var rcpDet = 1.0 / m.determinant();

        // needs to be self-assignment-proof
        var m0 = rcpDet * m.cofactor(0, 0);
        var m1 = rcpDet * m.cofactor(0, 1);
        var m2 = rcpDet * m.cofactor(0, 2);
        var m3 = rcpDet * m.cofactor(0, 3);
        var m4 = rcpDet * m.cofactor(1, 0);
        var m5 = rcpDet * m.cofactor(1, 1);
        var m6 = rcpDet * m.cofactor(1, 2);
        var m7 = rcpDet * m.cofactor(1, 3);
        var m8 = rcpDet * m.cofactor(2, 0);
        var m9 = rcpDet * m.cofactor(2, 1);
        var m10 = rcpDet * m.cofactor(2, 2);
        var m11 = rcpDet * m.cofactor(2, 3);
        var m12 = rcpDet * m.cofactor(3, 0);
        var m13 = rcpDet * m.cofactor(3, 1);
        var m14 = rcpDet * m.cofactor(3, 2);
        var m15 = rcpDet * m.cofactor(3, 3);

        this._m[0] = m0;
        this._m[1] = m1;
        this._m[2] = m2;
        this._m[3] = m3;
        this._m[4] = m4;
        this._m[5] = m5;
        this._m[6] = m6;
        this._m[7] = m7;
        this._m[8] = m8;
        this._m[9] = m9;
        this._m[10] = m10;
        this._m[11] = m11;
        this._m[12] = m12;
        this._m[13] = m13;
        this._m[14] = m14;
        this._m[15] = m15;
    },

    /**
     * If you know it's an affine matrix (such as general transforms rather than perspective projection matrices), use this.
     * @param m
     */
    inverseAffineOf: function (m)
    {
        var m0 = m._m[0], m1 = m._m[1], m2 = m._m[2];
        var m4 = m._m[4], m5 = m._m[5], m6 = m._m[6];
        var m8 = m._m[8], m9 = m._m[9], m10 = m._m[10];
        var m12 = m._m[12], m13 = m._m[13], m14 = m._m[14];
        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        var n0 = (m5 * m10 - m9 * m6) * rcpDet;
        var n1 = (m9 * m2 - m1 * m10) * rcpDet;
        var n2 = (m1 * m6 - m5 * m2) * rcpDet;
        var n4 = (m8 * m6 - m4 * m10) * rcpDet;
        var n5 = (m0 * m10 - m8 * m2) * rcpDet;
        var n6 = (m4 * m2 - m0 * m6) * rcpDet;
        var n8 = (m4 * m9 - m8 * m5) * rcpDet;
        var n9 = (m8 * m1 - m0 * m9) * rcpDet;
        var n10 = (m0 * m5 - m4 * m1) * rcpDet;

        this._m[0] = n0;
        this._m[1] = n1;
        this._m[2] = n2;
        this._m[3] = 0;
        this._m[4] = n4;
        this._m[5] = n5;
        this._m[6] = n6;
        this._m[7] = 0;
        this._m[8] = n8;
        this._m[9] = n9;
        this._m[10] = n10;
        this._m[11] = 0;
        this._m[12] = -n0 * m12 - n4 * m13 - n8 * m14;
        this._m[13] = -n1 * m12 - n5 * m13 - n9 * m14;
        this._m[14] = -n2 * m12 - n6 * m13 - n10 * m14;
        this._m[15] = 1;
    },

    /**
     * Writes the inverse transpose into an array for upload (must support 9 elements)
     */
    writeNormalMatrix: function (array, index)
    {
        index = index || 0;
        var m0 = this._m[0], m1 = this._m[1], m2 = this._m[2];
        var m4 = this._m[4], m5 = this._m[5], m6 = this._m[6];
        var m8 = this._m[8], m9 = this._m[9], m10 = this._m[10];

        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        array[index] = (m5 * m10 - m9 * m6) * rcpDet;
        array[index + 1] = (m8 * m6 - m4 * m10) * rcpDet;
        array[index + 2] = (m4 * m9 - m8 * m5) * rcpDet;
        array[index + 3] = (m9 * m2 - m1 * m10) * rcpDet;
        array[index + 4] = (m0 * m10 - m8 * m2) * rcpDet;
        array[index + 5] = (m8 * m1 - m0 * m9) * rcpDet;
        array[index + 6] = (m1 * m6 - m5 * m2) * rcpDet;
        array[index + 7] = (m4 * m2 - m0 * m6) * rcpDet;
        array[index + 8] = (m0 * m5 - m4 * m1) * rcpDet;
    },

    writeData: function(array, index)
    {
        index = index || 0;
        var m = this._m;
        for (var i = 0; i < 16; ++i)
            array[index + i] = m[i];
    },

    invert: function ()
    {
        this.inverseOf(this);
    },

    invertAffine: function ()
    {
        this.inverseAffineOf(this);
    },

    append: function (m)
    {
        this.multiply(m, this);
    },

    prepend: function (m)
    {
        this.multiply(this, m);
    },

    appendAffine: function (m)
    {
        this.multiplyAffine(m, this);
    },

    prependAffine: function (m)
    {
        this.multiplyAffine(this, m);
    },

    add: function (m)
    {
        this._m[0] += m._m[0];
        this._m[1] += m._m[1];
        this._m[2] += m._m[2];
        this._m[3] += m._m[3];
        this._m[4] += m._m[4];
        this._m[5] += m._m[5];
        this._m[6] += m._m[6];
        this._m[7] += m._m[7];
        this._m[8] += m._m[8];
        this._m[9] += m._m[9];
        this._m[10] += m._m[10];
        this._m[11] += m._m[11];
        this._m[12] += m._m[12];
        this._m[13] += m._m[13];
        this._m[14] += m._m[14];
        this._m[15] += m._m[15];
    },

    addAffine: function (m)
    {
        this._m[0] += m._m[0];
        this._m[1] += m._m[1];
        this._m[2] += m._m[2];
        this._m[4] += m._m[4];
        this._m[5] += m._m[5];
        this._m[6] += m._m[6];
        this._m[8] += m._m[8];
        this._m[9] += m._m[9];
        this._m[10] += m._m[10];
    },

    subtract: function (m)
    {
        this._m[0] -= m._m[0];
        this._m[1] -= m._m[1];
        this._m[2] -= m._m[2];
        this._m[3] -= m._m[3];
        this._m[4] -= m._m[4];
        this._m[5] -= m._m[5];
        this._m[6] -= m._m[6];
        this._m[7] -= m._m[7];
        this._m[8] -= m._m[8];
        this._m[9] -= m._m[9];
        this._m[10] -= m._m[10];
        this._m[11] -= m._m[11];
        this._m[12] -= m._m[12];
        this._m[13] -= m._m[13];
        this._m[14] -= m._m[14];
        this._m[15] -= m._m[15];
    },

    subtractAffine: function (m)
    {
        this._m[0] -= m._m[0];
        this._m[1] -= m._m[1];
        this._m[2] -= m._m[2];
        this._m[4] -= m._m[4];
        this._m[5] -= m._m[5];
        this._m[6] -= m._m[6];
        this._m[8] -= m._m[8];
        this._m[9] -= m._m[9];
        this._m[10] -= m._m[10];
    },

    appendScale: function (x, y, z)
    {
        if (y === undefined)
            y = z = x;

        this._m[0] *= x;
        this._m[1] *= y;
        this._m[2] *= z;
        this._m[4] *= x;
        this._m[5] *= y;
        this._m[6] *= z;
        this._m[8] *= x;
        this._m[9] *= y;
        this._m[10] *= z;
        this._m[12] *= x;
        this._m[13] *= y;
        this._m[14] *= z;
    },

    prependScale: function (x, y, z)
    {
        if (y === undefined)
            y = z = x;

        this._m[0] *= x;
        this._m[1] *= x;
        this._m[2] *= x;
        this._m[3] *= x;
        this._m[4] *= y;
        this._m[5] *= y;
        this._m[6] *= y;
        this._m[7] *= y;
        this._m[8] *= z;
        this._m[9] *= z;
        this._m[10] *= z;
        this._m[11] *= z;
    },

    appendTranslation: function (v)
    {
        this._m[12] += v.x;
        this._m[13] += v.y;
        this._m[14] += v.z;
    },

    prependTranslation: function (v)
    {
        var x = v.x, y = v.y, z = v.z;
        this._m[12] += this._m[0] * x + this._m[4] * y + this._m[8] * z;
        this._m[13] += this._m[1] * x + this._m[5] * y + this._m[9] * z;
        this._m[14] += this._m[2] * x + this._m[6] * y + this._m[10] * z;
        this._m[15] += this._m[3] * x + this._m[7] * y + this._m[11] * z;
    },

    appendQuaternion: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = 1 - 2 * (y * y + z * z), a_m10 = 2 * (x * y + w * z), a_m20 = 2 * (x * z - w * y);
        var a_m01 = 2 * (x * y - w * z), a_m11 = 1 - 2 * (x * x + z * z), a_m21 = 2 * (y * z + w * x);
        var a_m02 = 2 * (x * z + w * y), a_m12 = 2 * (y * z - w * x), a_m22 = 1 - 2 * (x * x + y * y);

        var b_m00 = this._m[0], b_m10 = this._m[1], b_m20 = this._m[2];
        var b_m01 = this._m[4], b_m11 = this._m[5], b_m21 = this._m[6];
        var b_m02 = this._m[8], b_m12 = this._m[9], b_m22 = this._m[10];
        var b_m03 = this._m[12], b_m13 = this._m[13], b_m23 = this._m[14];

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        this._m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        this._m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        this._m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
    },

    prependQuaternion: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = this._m[0], a_m10 = this._m[1], a_m20 = this._m[2];
        var a_m01 = this._m[4], a_m11 = this._m[5], a_m21 = this._m[6];
        var a_m02 = this._m[8], a_m12 = this._m[9], a_m22 = this._m[10];

        var b_m00 = 1 - 2 * (y * y + z * z), b_m10 = 2 * (x * y + w * z), b_m20 = 2 * (x * z - w * y);
        var b_m01 = 2 * (x * y - w * z), b_m11 = 1 - 2 * (x * x + z * z), b_m21 = 2 * (y * z + w * x);
        var b_m02 = 2 * (x * z + w * y), b_m12 = 2 * (y * z - w * x), b_m22 = 1 - 2 * (x * x + y * y);

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
    },

    appendRotationAxisAngle: function (axis, radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = oneMinCos * x * x + cos, a_m10 = oneMinCos * x * y + sin * z, a_m20 = oneMinCos * x * z - sin * y;
        var a_m01 = oneMinCos * x * y - sin * z, a_m11 = oneMinCos * y * y + cos, a_m21 = oneMinCos * y * z + sin * x;
        var a_m02 = oneMinCos * x * z + sin * y, a_m12 = oneMinCos * y * z - sin * x, a_m22 = oneMinCos * z * z + cos;

        var b_m00 = this._m[0], b_m10 = this._m[1], b_m20 = this._m[2];
        var b_m01 = this._m[4], b_m11 = this._m[5], b_m21 = this._m[6];
        var b_m02 = this._m[8], b_m12 = this._m[9], b_m22 = this._m[10];
        var b_m03 = this._m[12], b_m13 = this._m[13], b_m23 = this._m[14];

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        this._m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        this._m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        this._m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
    },

    prependRotationAxisAngle: function (axis, radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = this._m[0], a_m10 = this._m[1], a_m20 = this._m[2];
        var a_m01 = this._m[4], a_m11 = this._m[5], a_m21 = this._m[6];
        var a_m02 = this._m[8], a_m12 = this._m[9], a_m22 = this._m[10];

        var b_m00 = oneMinCos * x * x + cos, b_m10 = oneMinCos * x * y + sin * z, b_m20 = oneMinCos * x * z - sin * y;
        var b_m01 = oneMinCos * x * y - sin * z, b_m11 = oneMinCos * y * y + cos, b_m21 = oneMinCos * y * z + sin * x;
        var b_m02 = oneMinCos * x * z + sin * y, b_m12 = oneMinCos * y * z - sin * x, b_m22 = oneMinCos * z * z + cos;

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
    },

    getRow: function (index, target)
    {
        target = target || new HX.Float4();
        target.x = this._m[index];
        target.y = this._m[index | 4];
        target.z = this._m[index | 8];
        target.w = this._m[index | 12];
        return target;
    },

    setRow: function (index, v)
    {
        this._m[index] = v.x;
        this._m[index | 4] = v.y;
        this._m[index | 8] = v.z;
        this._m[index | 12] = v.w;
    },

    getElement: function(row, col)
    {
        return this._m[row | (col << 2)];
    },

    setElement: function(row, col, value)
    {
        this._m[row | (col << 2)] = value;
    },

    getColumn: function (index, target)
    {
        target = target || new HX.Float4();
        index <<= 2;
        target.x = this._m[index];
        target.y = this._m[index | 1];
        target.z = this._m[index | 2];
        target.w = this._m[index | 3];
        return target;
    },

    setColumn: function (index, v)
    {
        index <<= 2;
        this._m[index] = v.x;
        this._m[index | 1] = v.y;
        this._m[index | 2] = v.z;
        this._m[index | 3] = v.w;
    },

    /**
     * @param target
     * @param eye
     * @param up Must be unit length
     */
    lookAt: function (target, eye, up)
    {
        var zAxis = HX.Float4.subtract(eye, target);
        zAxis.normalize();

        var xAxis = new HX.Float4();
        xAxis.cross(up, zAxis);

        if (Math.abs(xAxis.lengthSqr) > .0001) {
            xAxis.normalize();
        }
        else {
            var altUp = new HX.Float4(up.x, up.z, up.y, 0.0);
            xAxis.cross(altUp, zAxis);
            if (Math.abs(xAxis.lengthSqr) <= .0001) {
                altUp.set(up.z, up.y, up.z, 0.0);
                xAxis.cross(altUp, zAxis);
            }
            xAxis.normalize();
        }

        var yAxis = new HX.Float4();
        yAxis.cross(zAxis, xAxis);	// should already be unit length

        this._m[0] = xAxis.x;
        this._m[1] = xAxis.y;
        this._m[2] = xAxis.z;
        this._m[3] = 0.0;
        this._m[4] = yAxis.x;
        this._m[5] = yAxis.y;
        this._m[6] = yAxis.z;
        this._m[7] = 0.0;
        this._m[8] = zAxis.x;
        this._m[9] = zAxis.y;
        this._m[10] = zAxis.z;
        this._m[11] = 0.0;
        this._m[12] = eye.x;
        this._m[13] = eye.y;
        this._m[14] = eye.z;
        this._m[15] = 1.0;
    },

    /**
     * Generates a matrix from a transform object
     */
    compose: function(transform)
    {
        this.fromQuaternion(transform.rotation);
        var scale = transform.scale;
        this.prependScale(scale.x, scale.y, scale.z);
        this.appendTranslation(transform.position);
    },

    /**
     * Decomposes an affine transformation matrix into a Transform object.
     * @param target An optional target object to decompose into. If omitted, a new object will be created and returned.
     */
    decompose: function (targetOrPos, quat, scale)
    {
        targetOrPos = targetOrPos || new HX.Transform();

        var pos;
        if (quat === undefined) {
            quat = targetOrPos.rotation;
            scale = targetOrPos.scale;
            pos = targetOrPos.position;
        }
        else pos = targetOrPos;

        var m0 = this._m[0], m1 = this._m[1], m2 = this._m[2];
        var m4 = this._m[4], m5 = this._m[5], m6 = this._m[6];
        var m8 = this._m[8], m9 = this._m[9], m10 = this._m[10];

        scale.x = Math.sqrt(m0 * m0 + m1 * m1 + m2 * m2);
        scale.y = Math.sqrt(m4 * m4 + m5 * m5 + m6 * m6);
        scale.z = Math.sqrt(m8 * m8 + m9 * m9 + m10 * m10);
        var clone = this.clone();

        var rcpX = 1.0 / scale.x, rcpY = 1.0 / scale.y, rcpZ = 1.0 / scale.z;

        clone._m[0] *= rcpX;
        clone._m[1] *= rcpX;
        clone._m[2] *= rcpX;
        clone._m[4] *= rcpY;
        clone._m[5] *= rcpY;
        clone._m[6] *= rcpY;
        clone._m[8] *= rcpZ;
        clone._m[9] *= rcpZ;
        clone._m[10] *= rcpZ;

        quat.fromMatrix(clone);
        pos.copyFrom(this.getColumn(3));

        return targetOrPos;
    },

    swapColums: function(i, j)
    {
        if (i === j) return;
        i <<= 2;
        j <<= 2;
        var x = this._m[i];
        var y = this._m[i | 1];
        var z = this._m[i | 2];
        var w = this._m[i | 3];
        this._m[i] = this._m[j];
        this._m[i | 1] = this._m[j | 1];
        this._m[i | 2] = this._m[j | 2];
        this._m[i | 3] = this._m[j | 3];
        this._m[j] = x;
        this._m[j | 1] = y;
        this._m[j | 2] = z;
        this._m[j | 3] = w;
    },

    toString: function()
    {
        var str = "";
        for (var i = 0; i < 16; ++i) {
            var mod = i & 0x3;
            if (mod === 0)
                str += "[";

            str += this._m[i];

            if (mod === 3)
                str += "]\n";
            else
                str += "\t , \t";
        }
        return str;
    }
};

HX.Matrix4x4.IDENTITY = new HX.Matrix4x4();
HX.Matrix4x4.ZERO = new HX.Matrix4x4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);