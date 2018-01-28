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
	this.w = w === undefined ? 1 : w;
}

/**
 * Adds 2 vectors.
 *
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The sum of a and b.
 */
Float4.add = function (a, b, target)
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
Float4.subtract = function (a, b, target)
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
Float4.scale = function (a, s, target)
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
Float4.scale4 = function (a, s, target)
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
Float4.cross = function (a, b, target)
{
	target = target || new Float4();
	// safe to use either a and b parameter
	var ax = a.x, ay = a.y, az = a.z;
	var bx = b.x, by = b.y, bz = b.z;

	target.x = ay * bz - az * by;
	target.y = az * bx - ax * bz;
	target.z = ax * by - ay * bx;
	target.w = 0;
	return target;
};

Float4.prototype =
	{
		/**
		 * Sets the components explicitly.
		 */
		set: function (x, y, z, w)
		{
			this.x = x;
			this.y = y;
			this.z = z;
			this.w = w === undefined ? this.w : w;
			return this;
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
		normalize: function ()
		{
			var rcpLength = 1.0 / this.length;
			this.x *= rcpLength;
			this.y *= rcpLength;
			this.z *= rcpLength;
			return this;
		},

		/**
		 * Normalizes the vector as if it were a plane.
		 */
		normalizeAsPlane: function ()
		{
			var rcpLength = 1.0 / this.length;
			this.x *= rcpLength;
			this.y *= rcpLength;
			this.z *= rcpLength;
			this.w *= rcpLength;
			return this;
		},

		/**
		 * Returns a copy of this object.
		 */
		clone: function ()
		{
			return new Float4(this.x, this.y, this.z, this.w);
		},

		/**
		 * Adds a vector to this one in place.
		 */
		add: function (v)
		{
			this.x += v.x;
			this.y += v.y;
			this.z += v.z;
			this.w += v.w;
			return this;
		},

		/**
		 * Adds a scalar multiple of another vector in place.
		 * @param v The vector to scale and add.
		 * @param s The scale to apply to v
		 */
		addScaled: function (v, s)
		{
			this.x += v.x * s;
			this.y += v.y * s;
			this.z += v.z * s;
			this.w += v.w * s;
			return this;
		},

		/**
		 * Subtracts a vector from this one in place.
		 */
		subtract: function (v)
		{
			this.x -= v.x;
			this.y -= v.y;
			this.z -= v.z;
			this.w -= v.w;
			return this;
		},

		/**
		 * Multiplies the components of this vector with a scalar, except the w-component.
		 */
		scale: function (s)
		{
			this.x *= s;
			this.y *= s;
			this.z *= s;
			return this;
		},

		/**
		 * Multiplies the components of this vector with a scalar, including the w-component.
		 */
		scale4: function (s)
		{
			this.x *= s;
			this.y *= s;
			this.z *= s;
			this.w *= s;
			return this;
		},

		/**
		 * Negates the components of this vector.
		 */
		negate: function ()
		{
			this.x = -this.x;
			this.y = -this.y;
			this.z = -this.z;
			this.w = -this.w;
			return this;
		},

		/**
		 * Copies the negative of a vector
		 */
		negativeOf: function (a)
		{
			this.x = -a.x;
			this.y = -a.y;
			this.z = -a.z;
			this.w = -a.w;
			return this;
		},

		/**
		 * Project a point in homogeneous projective space to carthesian 3D space by dividing by w
		 */
		homogeneousProject: function ()
		{
			var rcpW = 1.0 / this.w;
			this.x *= rcpW;
			this.y *= rcpW;
			this.z *= rcpW;
			this.w = 1.0;
			return this;
		},

		/**
		 * Sets the components of this vector to their absolute values.
		 */
		abs: function ()
		{
			this.x = Math.abs(this.x);
			this.y = Math.abs(this.y);
			this.z = Math.abs(this.z);
			this.w = Math.abs(this.w);
			return this;
		},

		/**
		 * Sets the euclidian coordinates based on spherical coordinates.
		 * @param radius The radius coordinate
		 * @param azimuthalAngle The azimuthal coordinate
		 * @param polarAngle The polar coordinate
		 */
		fromSphericalCoordinates: function (radius, azimuthalAngle, polarAngle)
		{
			this.x = radius * Math.sin(polarAngle) * Math.cos(azimuthalAngle);
			this.y = radius * Math.sin(polarAngle) * Math.sin(azimuthalAngle);
			this.z = radius * Math.cos(polarAngle);
			this.w = 1.0;
			return this;
		},

		/**
		 * Copies the values from a different Float4
		 */
		copyFrom: function (b)
		{
			this.x = b.x;
			this.y = b.y;
			this.z = b.z;
			this.w = b.w;
			return this;
		},

		/**
		 * Replaces the components' values if those of the other Float2 are higher, respectively
		 */
		maximize: function (b)
		{
			if (b.x > this.x) this.x = b.x;
			if (b.y > this.y) this.y = b.y;
			if (b.z > this.z) this.z = b.z;
			if (b.w > this.w) this.w = b.w;
			return this;
		},

		/**
		 * Replaces the components' values if those of the other Float2 are higher, respectively. Excludes the w-component.
		 */
		maximize3: function (b)
		{
			if (b.x > this.x) this.x = b.x;
			if (b.y > this.y) this.y = b.y;
			if (b.z > this.z) this.z = b.z;
			return this;
		},

		/**
		 * Replaces the components' values if those of the other Float2 are lower, respectively
		 */
		minimize: function (b)
		{
			if (b.x < this.x) this.x = b.x;
			if (b.y < this.y) this.y = b.y;
			if (b.z < this.z) this.z = b.z;
			if (b.w < this.w) this.w = b.w;
			return this;
		},

		/**
		 * Replaces the components' values if those of the other Float2 are lower, respectively. Excludes the w-component.
		 */
		minimize3: function (b)
		{
			if (b.x < this.x) this.x = b.x;
			if (b.y < this.y) this.y = b.y;
			if (b.z < this.z) this.z = b.z;
			return this;
		},

		/**
		 * Generates a plane representation from the normal vector and a point contained in the plane.
		 * @param normal The vector normal to the plane.
		 * @param point A point contained in the plane.
		 */
		planeFromNormalAndPoint: function (normal, point)
		{
			var nx = normal.x, ny = normal.y, nz = normal.z;
			this.x = nx;
			this.y = ny;
			this.z = nz;
			this.w = -(point.x * nx + point.y * ny + point.z * nz);
			return this;
		},

		/**
		 * Generates a plane representation from two contained vectors and a point contained in the plane.
		 * @param vector1 A vector contained in the plane.
		 * @param vector2 A vector contained in the plane.
		 * @param point A point contained in the plane.
		 */
		planeFromVectorsAndPoint: function (vector1, vector2, point)
		{
			this.cross(vector1, vector2);
			this.normalize();
			this.w = -(point.x * this.x + point.y * this.y + point.z * this.z);
		},

		/**
		 * Calculates the intersection with a ray (if any)
		 */
		planeIntersectRay: function(ray, target)
		{
			target = target || new HX.Float4();

			// assuming vectors are all normalized
			var denom = this.dot3(ray.direction);

			// must be traveling in opposite directions
			if (Math.abs(denom) > 0.00001) {
				var t = -(this.dot3(ray.origin) + this.w) / denom;
				if (t > 0) {
					target.copyFrom(ray.origin);
					target.addScaled(ray.direction, t);
					return target;
				}
			}

			return null;
		},

		/**
		 * Returns the angle between this and another vector.
		 */
		angle: function (a)
		{
			return Math.acos(this.dot3(a) / (this.length * a.length));
		},

		/**
		 * Returns the angle between two vectors, assuming they are normalized
		 */
		angleNormalized: function (a)
		{
			return Math.acos(this.dot3(a));
		},

		/**
		 * Returns the distance to a point.
		 */
		distanceTo: function (a)
		{
			var dx = a.x - this.x;
			var dy = a.y - this.y;
			var dz = a.z - this.z;
			return Math.sqrt(dx * dx + dy * dy + dz * dz);
		},

		/**
		 * Returns the squared distance to a point.
		 */
		squareDistanceTo: function (a)
		{
			var dx = a.x - this.x;
			var dy = a.y - this.y;
			var dz = a.z - this.z;
			return dx * dx + dy * dy + dz * dz;
		},

		/**
		 * Returns the 3-component dot product of 2 vectors.
		 */
		dot3: function (a)
		{
			return a.x * this.x + a.y * this.y + a.z * this.z;
		},

		/**
		 * Returns the 3-component dot product of 2 vectors.
		 */
		dot: function (a)
		{
			return a.x * this.x + a.y * this.y + a.z * this.z;
		},

		/**
		 * Returns the 4-component dot product of 2 vectors. This can be useful for signed distances to a plane.
		 */
		dot4: function (a)
		{
			return a.x * this.x + a.y * this.y + a.z * this.z + a.w * this.w;
		},

		/**
		 * Linearly interpolates two vectors.
		 * @param {Float4} a The first vector to interpolate from.
		 * @param {Float4} b The second vector to interpolate to.
		 * @param {Number} t The interpolation factor.
		 * @returns {Float4} The interpolated value.
		 */
		lerp: function (a, b, factor)
		{
			var ax = a.x, ay = a.y, az = a.z, aw = a.w;

			this.x = ax + (b.x - ax) * factor;
			this.y = ay + (b.y - ay) * factor;
			this.z = az + (b.z - az) * factor;
			this.w = aw + (b.w - aw) * factor;
			return this;
		},

		/**
		 * Store the cross product of two vectors.
		 */
		cross: function (a, b)
		{
			// safe to use either a and b parameter
			var ax = a.x, ay = a.y, az = a.z;
			var bx = b.x, by = b.y, bz = b.z;

			this.x = ay * bz - az * by;
			this.y = az * bx - ax * bz;
			this.z = ax * by - ay * bx;
			this.w = 0.0;
			return this;
		},

		/**
		 * @ignore
		 */
		toString: function ()
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

export {Float4};