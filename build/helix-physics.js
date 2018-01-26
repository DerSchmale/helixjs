(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('cannon'), require('helix')) :
	typeof define === 'function' && define.amd ? define('HX', ['exports', 'cannon', 'helix'], factory) :
	(factory((global.HX = global.HX || {}),global.CANNON,global.HX));
}(this, (function (exports,CANNON$1,HX$1) { 'use strict';

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Collider()
{
    // these can be set by subclasses
    this._center = null;
    this._orientation = null;
}

Collider.prototype = {

    /**
     * @ignore
     */
    createRigidBody: function(sceneBounds)
    {
        var shape = this.createShape(sceneBounds);
        var body = new CANNON$1.Body({
            mass: 50 * this.volume()
        });

        if (!this._center) this._center = sceneBounds.center;

        body.addShape(shape, this._center, this._orientation);

        return body;
    },

    /**
     * @ignore
     */
    createShape: function(sceneBounds)
    {
        throw new Error("Abstract method called!");
    },

    /**
     * @ignore
     */
    volume: function()
    {
        throw new Error("Abstract method called!");
    }

};

/**
 * @classdesc
 *
 * A box-shaped collider.
 *
 * @constructor
 *
 * @param {Float4} [min] The minimum coordinates of the box in local object space. If omitted, will use the object bounds.
 * @param {Float4} [max] The maximum coordinates of the box in local object space. If omitted, will use the object bounds.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BoxCollider(min, max)
{
    Collider.call(this);
    if (min && max) {
        this._halfExtents = HX.Float.subtract(max, min).scale(.5);
        this._center = HX.Float.add(max, min).scale(.5);
    }
}

BoxCollider.prototype = Object.create(Collider.prototype);

BoxCollider.prototype.volume = function()
{
    return 8 * (this._halfExtents.x * this._halfExtents.y * this._halfExtents.z);
};

BoxCollider.prototype.createShape = function(sceneBounds)
{
    if (!this._halfExtents)
        this._halfExtents = sceneBounds.getHalfExtents();

    var vec3 = new CANNON$1.Vec3();
    vec3.copy(this._halfExtents);
    return new CANNON$1.Box(vec3);
};

/**
 * @classdesc
 *
 * A sphere-shaped collider.
 *
 * @constructor
 *
 * @param {number} [radius] The radius of the sphere. If omitted, will use the object bounds.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SphereCollider(radius, center)
{
    Collider.call(this);
    this._radius = radius;
    this._center = center;
    if (radius !== undefined && center === undefined) {
        this._center = new HX.Float4();
    }
}

SphereCollider.prototype = Object.create(Collider.prototype);

SphereCollider.prototype.volume = function()
{
    var radius = this._radius;
    return .75 * Math.PI * radius * radius * radius;
};

SphereCollider.prototype.createShape = function(sceneBounds)
{
    this._radius = this._radius || sceneBounds.getRadius();
    return new CANNON$1.Sphere(this._radius);
};

/**
 * @classdesc
 * RigidBody is a component allowing a scene graph object to have physics simulations applied to it. Requires
 * {@linkcode PhysicsSystem}. At this point, entities using RigidBody need to be added to the root of the scenegraph (or
 * have parents without transformations)!
 *
 * @constructor
 * @param collider The Collider type describing the shape of how to object interacts with the world. If omitted, it will
 * take a shape based on the type of bounds assigned to the target object.
 * @param mass The mass of the target object. If omitted, it will venture a guess based on the bounding volume.*
 *
 * @author derschmale <http://www.derschmale.com>
 */
function RigidBody(collider, mass)
{
    HX$1.Component.call(this);
    this._collider = collider;
    this._body = null;

    this._mass = mass;

    this._linearDamping = 0.01;
    this._angularDamping = 0.01;
}


HX$1.Component.create(RigidBody, {
    body: {
        get: function() {
            return this._body;
        }
    },

    mass: {
        get: function()
        {
            return this._mass;
        },

        set: function(value)
        {
            this._mass = value;
            if (this._body)
                this._body.mass = value;
        }
    },

    linearDamping: {
        get: function()
        {
            return this._linearDamping;
        },

        set: function(value)
        {
            this._linearDamping = value;
            if (this._body) this._body.linearDamping = value;
        }
    },

    angularDamping: {
        get: function()
        {
            return this._angularDamping;
        },

        set: function(value)
        {
            this._angularDamping = value;
            if (this._body) this._body.angularDamping = value;
        }
    }
});

RigidBody.prototype.onAdded = function()
{
    this._createBody();
};

RigidBody.prototype.onRemoved = function()
{
};

RigidBody.prototype.applyTransform = function()
{
    if (this._mass === 0.0)
        return;

    var entity = this._entity;
    var body = this._body;

    entity.position = body.position;
    entity.rotation = body.quaternion;
};

RigidBody.prototype._createBody = function()
{
    var entity = this._entity;

    var bounds;
    if (entity instanceof HX$1.ModelInstance) {
        bounds = entity.localBounds;
    }
    else {
        var matrix = new HX$1.Matrix4x4();
        matrix.inverseAffineOf(entity.worldMatrix);
        bounds = new HX$1.BoundingAABB();
        bounds.transformFrom(entity.worldBounds, matrix);
    }

    if (!this._collider)
        this._collider = bounds instanceof HX$1.BoundingAABB? new BoxCollider() : new SphereCollider();

    this._body = this._collider.createRigidBody(bounds);

    if (this._mass !== undefined)
        this._body.mass = this._mass;

    this._body.linearDamping = this._linearDamping;
    this._body.angularDamping = this._angularDamping;

    this._body.position.copy(entity.position);
    this._body.quaternion.copy(entity.rotation);
};

/**
 * PhysicsSystem is an {@linkcode EntitySystem} allowing physics simulations (based on cannonjs).
 *
 * @property fixedTimeStep If 0, it uses the frame delta times which is not recommended for stability reasons.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PhysicsSystem()
{
    HX$1.EntitySystem.call(this);

    this._world = new CANNON$1.World();
    this._gravity = -9.81; // m/s²
    this._world.gravity.set(0, 0, this._gravity);
    this._world.solver.tolerance = .001;
    this._world.solver.iterations = 10;
    this._fixedTimeStep = 1000/60;
    this._friction = 0.0;
    this._world.broadphase = new CANNON$1.SAPBroadphase(this._world);

    // this._world.quatNormalizeFast = true;
    // this._world.quatNormalizeSkip = 8;

    this._components = [];
}

PhysicsSystem.prototype = Object.create(HX$1.EntitySystem.prototype, {
    gravity: {
        get: function() {
            return this._gravity;
        },

        set: function(value) {
            this._gravity = value;

            if (value instanceof HX$1.Float4)
                this._world.gravity.set(value.x, value.y, value.z);
            else
                this._world.gravity.set(0, value, 0);
        }
    },

    fixedTimeStep: {
        get: function() {
            return this._fixedTimeStep;
        },

        set: function(value) {
            this._fixedTimeStep = value;
        }
    }
});

PhysicsSystem.prototype.onStarted = function()
{
    this._colliders = this.getEntitySet([RigidBody]);
    this._colliders.onEntityAdded.bind(this._onEntityAdded, this);
    this._colliders.onEntityRemoved.bind(this._onEntityRemoved, this);

    var len = this._colliders.numEntities;
    for (var i = 0; i < len; ++i) {
        var entity = this._colliders.getEntity(i);
        this._onEntityAdded(entity);
    }
};

PhysicsSystem.prototype.onStopped = function()
{
    this._colliders.onEntityAdded.unbind(this._onEntityAdded);
    this._colliders.onEntityRemoved.unbind(this._onEntityRemoved);
};

PhysicsSystem.prototype._onEntityAdded = function(entity)
{
    var component = entity.getFirstComponentByType(RigidBody);
    // for faster access
    this._components.push(component);

    this._world.addBody(component.body);
};

PhysicsSystem.prototype._onEntityRemoved = function()
{
    var component = entity.getFirstComponentByType(RigidBody);
    this._world.removeBody(component.body);
    var index = this._components.indexOf(component);
    this._components.splice(index, 1);
};

// we're updating here to enforce order of updates
PhysicsSystem.prototype.onUpdate = function(dt)
{
    this._world.step(this._fixedTimeStep * .001);

    var len = this._components.length;
    for (var i = 0; i < len; ++i) {
        this._components[i].applyTransform();
    }
};

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
function Float4$1(x, y, z, w)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w === undefined? 1 : w;
}

/**
 * Adds 2 vectors.
 *
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The sum of a and b.
 */
Float4$1.add = function(a, b, target)
{
    target = target || new Float4$1();
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
Float4$1.subtract = function(a, b, target)
{
    target = target || new Float4$1();
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
Float4$1.scale = function(a, s, target)
{
    target = target || new Float4$1();
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
Float4$1.scale4 = function(a, s, target)
{
    target = target || new Float4$1();
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
Float4$1.cross = function(a, b, target)
{
    target = target || new Float4$1();
    // safe to use either a and b parameter
    var ax = a.x, ay = a.y, az = a.z;
    var bx = b.x, by = b.y, bz = b.z;

    target.x = ay*bz - az*by;
    target.y = az*bx - ax*bz;
    target.z = ax*by - ay*bx;
    target.w = 0;
    return target;
};

Float4$1.prototype =
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
    normalize: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
        return this;
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
        return this;
    },

    /**
     * Returns a copy of this object.
     */
    clone: function()
    {
        return new Float4$1(this.x, this.y, this.z, this.w);
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
        return this;
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
        return this;
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
        return this;
    },

    /**
     * Multiplies the components of this vector with a scalar, except the w-component.
     */
    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
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
        return this;
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
        return this;
    },

    /**
     * Copies the negative of a vector
     */
    negativeOf: function(a)
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
    homogeneousProject: function()
    {
        var rcpW = 1.0/this.w;
        this.x *= rcpW;
        this.y *= rcpW;
        this.z *= rcpW;
        this.w = 1.0;
        return this;
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
        return this;
    },

    /**
     * Sets the euclidian coordinates based on spherical coordinates.
     * @param radius The radius coordinate
     * @param azimuthalAngle The azimuthal coordinate
     * @param polarAngle The polar coordinate
     */
    fromSphericalCoordinates: function(radius, azimuthalAngle, polarAngle)
    {
        this.x = radius*Math.sin(polarAngle)*Math.cos(azimuthalAngle);
        this.y = radius*Math.sin(polarAngle)*Math.sin(azimuthalAngle);
        this.z = radius*Math.cos(polarAngle);
        this.w = 1.0;
        return this;
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
        return this;
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
        return this;
    },

    /**
     * Replaces the components' values if those of the other Float2 are higher, respectively. Excludes the w-component.
     */
    maximize3: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
        return this;
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
        return this;
    },

    /**
     * Replaces the components' values if those of the other Float2 are lower, respectively. Excludes the w-component.
     */
    minimize3: function(b)
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
    planeFromNormalAndPoint: function(normal, point)
    {
        var nx = normal.x, ny = normal.y, nz = normal.z;
        this.x = nx;
        this.y = ny;
        this.z = nz;
        this.w = -(point.x * nx + point.y * ny + point.z * nz);
        return this;
    },

    /**
     * Returns the angle between this and another vector.
     */
    angle: function(a)
    {
        return Math.acos(this.dot3(a) / (this.length * a.length));
    },

    /**
     * Returns the angle between two vectors, assuming they are normalized
     */
    angleNormalized: function(a)
    {
        return Math.acos(this.dot3(a));
    },

    /**
     * Returns the distance to a point.
     */
    distanceTo: function(a)
    {
        var dx = a.x - this.x;
        var dy = a.y - this.y;
        var dz = a.z - this.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    /**
     * Returns the squared distance to a point.
     */
    squareDistanceTo: function(a)
    {
        var dx = a.x - this.x;
        var dy = a.y - this.y;
        var dz = a.z - this.z;
        return dx * dx + dy * dy + dz * dz;
    },

    /**
     * Returns the 3-component dot product of 2 vectors.
     */
    dot3: function(a)
    {
        return a.x * this.x + a.y * this.y + a.z * this.z;
    },

    /**
     * Returns the 3-component dot product of 2 vectors.
     */
    dot: function(a)
    {
        return a.x * this.x + a.y * this.y + a.z * this.z;
    },

    /**
     * Returns the 4-component dot product of 2 vectors. This can be useful for signed distances to a plane.
     */
    dot4: function(a)
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
    lerp: function(a, b, factor)
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
    cross: function(a, b)
    {
        // safe to use either a and b parameter
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;

        this.x = ay*bz - az*by;
        this.y = az*bx - ax*bz;
        this.z = ax*by - ay*bx;
        this.w = 0.0;
        return this;
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
Float4$1.ORIGIN_POINT = new Float4$1(0, 0, 0, 1);

/**
 * A preset for the zero vector (w = 0)
 */
Float4$1.ZERO = new Float4$1(0, 0, 0, 0);

/**
 * A preset for the X-axis
 */
Float4$1.X_AXIS = new Float4$1(1, 0, 0, 0);

/**
 * A preset for the Y-axis
 */
Float4$1.Y_AXIS = new Float4$1(0, 1, 0, 0);

/**
 * A preset for the Z-axis
 */
Float4$1.Z_AXIS = new Float4$1(0, 0, 1, 0);

var RCP_LOG_OF_2 = 1.0 / Math.log(2);

/**
 * Some extra Math functionality for your enjoyment.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var MathX = {
    /**
     * The factor to convert degrees to radians.
     */
    DEG_TO_RAD: Math.PI / 180.0,

    /**
     * The factor to convert radians to degrees.
     */
    RAD_TO_DEG: 180.0 / Math.PI,

    /**
     * Returns the sign of a given value.
     * @returns {number} -1 if v < 0, 0 if v == 0, 1 if v > 1
     */
    sign: function(v)
    {
        return  v === 0.0? 0.0 :
            v > 0.0? 1.0 : -1.0;
    },

    /**
     * Verifies whether the value is a power of 2.
     */
    isPowerOfTwo: function(value)
    {
        return value? ((value & -value) === value) : false;
    },

    /**
     * Return the base-2 logarithm.
     */
    log2: function(value)
    {
        return Math.log(value) * RCP_LOG_OF_2;
    },

    /**
     * Clamps a value to a minimum and maximum.
     */
    clamp: function(value, min, max)
    {
        return  value < min?    min :
            value > max?    max :
                value;
    },

    /**
     * Clamps a value to 0 and 1
     */
    saturate: function(value)
    {
        return MathX.clamp(value, 0.0, 1.0);
    },

    /**
     * Linearly interpolates a number.
     */
    lerp: function(a, b, factor)
    {
        return a + (b - a) * factor;
    },

    /**
     * Returns 0 if x < lower, 1 if x > lower, and linearly interpolates in between.
     */
    linearStep: function(lower, upper, x)
    {
        return MathX.saturate((x - lower) / (upper - lower));
    },

    /**
     * Estimates the radius of a gaussian curve.
     * @param variance The variance of the gaussian curve.
     * @param epsilon The minimum value of the curve to still be considered within the radius.
     */
    estimateGaussianRadius: function (variance, epsilon)
    {
        return Math.sqrt(-2.0 * variance * Math.log(epsilon));
    },

    fract: function(value)
    {
        return value - Math.floor(value);
    }
};

/**
 * @classdesc
 * <p>Signal provides an implementation of the Observer pattern. Functions can be bound to the Signal, and they will be
 * called when the Signal is dispatched. This implementation allows for keeping scope.</p>
 * <p>When dispatch has an object passed to it, this is called the "payload" and will be passed as a parameter to the
 * listener functions</p>
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Signal()
{
    this._listeners = [];
    this._lookUp = {};
}

/**
 * Signals keep "this" of the caller, because having this refer to the signal itself would be silly
 */
Signal.prototype =
{
    /**
     * Binds a function as a listener to the Signal
     * @param {function(*):void} listener A function to be called when the function is dispatched.
     * @param {Object} [thisRef] If provided, the object that will become "this" in the function. Used in a class as such:
     *
     * @example
     * signal.bind(this.methodFunction, this);
     */
    bind: function(listener, thisRef)
    {
        this._lookUp[listener] = this._listeners.length;
        var callback = thisRef? listener.bind(thisRef) : listener;
        this._listeners.push(callback);
    },

    /**
     * Removes a function as a listener.
     */
    unbind: function(listener)
    {
        var index = this._lookUp[listener];
        if (index !== undefined) {
			this._listeners.splice(index, 1);
			delete this._lookUp[listener];
		}
    },

    /**
     * Unbinds all bound functions.
     */
    unbindAll: function()
    {
        this._listeners = [];
        this._lookUp = {};
    },

    /**
     * Dispatches the signal, causing all the listening functions to be called.
     * @param [payload] An optional object to be passed in as a parameter to the listening functions. Can be used to provide data.
     */
    dispatch: function(payload)
    {
        var len = this._listeners.length;
        for (var i = 0; i < len; ++i)
            this._listeners[i].apply(null, arguments);
    },

    /**
     * Returns whether there are any functions bound to the Signal or not.
     */
    get hasListeners()
    {
        return this._listeners.length > 0;
    }
};

/**
 *
 * PropertyListener allows listening to changes to other objects' properties. When a change occurs, the onChange signal will be dispatched.
 * It's a bit hackish, but it prevents having to dispatch signals in performance-critical classes such as Float4.
 *
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PropertyListener()
{
    this._enabled = true;
    this.onChange = new Signal();
    this._targets = [];
}

PropertyListener.prototype =
{
    /**
     * If false, prevents the PropertyListener from dispatching change events.
     */
    get enabled()
    {
        return this._enabled;
    },

    set enabled(value)
    {
        this._enabled = value;
    },

    /**
     * Starts listening to changes for an object's property for changes.
     * @param targetObj The target object to monitor.
     * @param propertyName The name of the property for which we'll be listening.
     */
    add: function(targetObj, propertyName)
    {
        var index = this._targets.length;
        this._targets.push(
            {
                object: targetObj,
                propertyName: propertyName,
                value: targetObj[propertyName]
            }
        );

        var wrapper = this;
        var target = wrapper._targets[index];
        Object.defineProperty(targetObj, propertyName, {
            get: function() {
                return target.value;
            },
            set: function(val) {
                if (val !== target.value) {
                    target.value = val;
                    if (wrapper._enabled)
                        wrapper.onChange.dispatch();
                }
            }
        });
    },

    /**
     * Stops listening to a property for changes.
     * @param targetObj The object to stop monitoring.
     * @param propertyName The name of the property for which we'll be listening.
     */
    remove: function(targetObj, propertyName)
    {
        for (var i = 0; i < this._targets.length; ++i) {
            var target = this._targets[i];
            if (target.object === targetObj && target.propertyName === propertyName) {
                delete target.object[target.propertyName];
                target.object[target.propertyName] = target.value;
                this._targets.splice(i--, 1);
            }
        }
    }
};

/**
 * @classdesc
 * Transform is a class to describe an object's transformation through position, rotation (as a quaternion) and scale.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Transform()
{
    this._position = new Float4$1(0.0, 0.0, 0.0, 1.0);
    this._rotation = new Quaternion();
    this._scale = new Float4$1(1.0, 1.0, 1.0, 1.0);
    this._matrix = new Matrix4x4$1();

    this._changeListener = new PropertyListener();
    this._changeListener.add(this._position, "x");
    this._changeListener.add(this._position, "y");
    this._changeListener.add(this._position, "z");
    this._changeListener.add(this._rotation, "x");
    this._changeListener.add(this._rotation, "y");
    this._changeListener.add(this._rotation, "z");
    this._changeListener.add(this._rotation, "w");
    this._changeListener.add(this._scale, "x");
    this._changeListener.add(this._scale, "y");
    this._changeListener.add(this._scale, "z");
    this._changeListener.onChange.bind(this._invalidateMatrix, this);
}

Transform.prototype =
{
    /**
     * The position of the object.
     */
    get position() {
        return this._position;
    },


    set position(value) {
        // make sure position object never changes
        this._position.copyFrom(value);
    },

    /**
     * The rotation of the object.
     */
    get rotation() {
        return this._rotation;
    },

    set rotation(value) {
        // make sure position object never changes
        this._rotation.copyFrom(value);
    },

    /**
     * The scale of the object.
     */
    get scale() {
        return this._scale;
    },

    set scale(value) {
        // make sure position object never changes
        this._scale.copyFrom(value);
    },

    /**
     * Orients the object in such a way as to face the target point.
     */
    lookAt: function(target)
    {
        this._matrix.lookAt(target, this._position);
        this._matrix.appendScale(this._scale);
        this._applyMatrix();
    },

    /**
     * Copies the state of another Transform object
     */
    copyTransform: function(transform)
    {
        this._changeListener.enabled = false;
        this._position.copyFrom(transform.position);
        this._rotation.copyFrom(transform.rotation);
        this._scale.copyFrom(transform.scale);
        this._changeListener.enabled = true;
        this._invalidateMatrix();
    },

    /**
     * The matrix representing the transform.
     */
    get matrix()
    {
        if (this._matrixInvalid)
            this._updateMatrix();

        return this._matrix;
    },

    set matrix(value)
    {
        this._matrix.copyFrom(value);
        this._applyMatrix();
    },

    /**
     * @ignore
     */
    _invalidateMatrix: function ()
    {
        this._matrixInvalid = true;
    },

    /**
     * @ignore
     */
    _updateMatrix: function()
    {
        this._matrix.compose(this);
        this._matrixInvalid = false;
    },

    /**
     * @ignore
     */
    _applyMatrix: function()
    {
        this._matrixInvalid = false;
        // matrix decompose will trigger property updates, so disable this
        this._changeListener.enabled = false;
        this._matrix.decompose(this);
        this._changeListener.enabled = true;
    }
};

/**
 * @classdec
 * Matrix4x4 object represents a 4D matrix (generally an affine transformation or a projection). The elements are stored
 * in column-major order. Vector multiplication is in column format (ie v' = M x v)
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 *
 */
function Matrix4x4$1(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33)
{
    if (m00 !== undefined && isNaN(m00)) {
        this._m = new Float32Array(m00);
    }
    else {
        var m = this._m = new Float32Array(16);

        m[0] = m00 === undefined ? 1 : 0;
        m[1] = m10 || 0;
        m[2] = m20 || 0;
        m[3] = m30 || 0;
        m[4] = m01 || 0;
        m[5] = m11 === undefined ? 1 : 0;
        m[6] = m21 || 0;
        m[7] = m31 || 0;
        m[8] = m02 || 0;
        m[9] = m12 || 0;
        m[10] = m22 === undefined ? 1 : 0;
        m[11] = m32 || 0;
        m[12] = m03 || 0;
        m[13] = m13 || 0;
        m[14] = m23 || 0;
        m[15] = m33 === undefined ? 1 : 0;
    }
}

Matrix4x4$1.prototype =
{
    /**
     * Transforms a Float4 object (use for homogeneous general case of Float4, perspective or when "type" (w) of Float4 is unknown)
     *
     * @param v The Float4 object to transform.
     * @param [target] An optional target. If not provided, a new object will be created and returned.
     */
    transform: function (v, target)
    {
        target = target || new Float4$1();
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
     *
     * @param v The Float4 object to transform.
     * @param [target] An optional target. If not provided, a new object will be created and returned.
     */
    transformPoint: function (v, target)
    {
        target = target || new Float4$1();
        var x = v.x, y = v.y, z = v.z;
        var m = this._m;

        target.x = m[0] * x + m[4] * y + m[8] * z + m[12];
        target.y = m[1] * x + m[5] * y + m[9] * z + m[13];
        target.z = m[2] * x + m[6] * y + m[10] * z + m[14];
        target.w = 1.0;

        return target;
    },

	/**
	 * Transforms a Float4 object, treating it as a normal vector.
	 *
	 * @param v The Float4 object to transform.
	 * @param [target] An optional target. If not provided, a new object will be created and returned.
	 */
	transformNormal: function (v, target)
	{
	    // calculate inverse
	    var m = this._m;
		var m0 = m[0], m1 = m[1], m2 = m[2];
		var m4 = m[4], m5 = m[5], m6 = m[6];
		var m8 = m[8], m9 = m[9], m10 = m[10];
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

		target = target || new Float4$1();
		var x = v.x, y = v.y, z = v.z;

		// multiply with transpose of that inverse
		target.x = n0 * x + n1 * y + n2 * z;
		target.y = n4 * x + n5 * y + n6 * z;
		target.z = n8 * x + n9 * y + n10 * z;
		target.w = 0.0;

		return target;
	},

	/**
	 * Transforms a Float4 object, treating it as a vector (ie: disregarding translation). Slightly faster than transform for vectors.
     *
     * @param v The Float4 object to transform.
     * @param [target] An optional target. If not provided, a new object will be created and returned.
     */
    transformVector: function (v, target)
    {
        target = target || new Float4$1();
        var x = v.x, y = v.y, z = v.z;

        var m = this._m;
        target.x = m[0] * x + m[4] * y + m[8] * z;
        target.y = m[1] * x + m[5] * y + m[9] * z;
        target.z = m[2] * x + m[6] * y + m[10] * z;
        target.w = 0.0;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation) containing a size (so always abs)! Slightly faster than transform for vectors.
     *
     * @param v The Float4 object to transform.
     * @param [target] An optional target. If not provided, a new object will be created and returned.
     */
    transformExtent: function (v, target)
    {
        target = target || new Float4$1();
        var x = v.x, y = v.y, z = v.z;

        var m = this._m;
        var m00 = m[0], m10 = m[1], m20 = m[2];
        var m01 = m[4], m11 = m[5], m21 = m[6];
        var m02 = m[8], m12 = m[9], m22 = m[10];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;

        target.x = m00 * x + m01 * y + m02 * z;
        target.y = m10 * x + m11 * y + m12 * z;
        target.z = m20 * x + m21 * y + m22 * z;
        target.w = 0.0;

        return target;
    },

    /**
     * Copies its elements from another matrix.
     */
    copyFrom: function(a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] = mm[0];
        m[1] = mm[1];
        m[2] = mm[2];
        m[3] = mm[3];
        m[4] = mm[4];
        m[5] = mm[5];
        m[6] = mm[6];
        m[7] = mm[7];
        m[8] = mm[8];
        m[9] = mm[9];
        m[10] = mm[10];
        m[11] = mm[11];
        m[12] = mm[12];
        m[13] = mm[13];
        m[14] = mm[14];
        m[15] = mm[15];

        return this;
    },

    /**
     * Initializes the matrix as a rotation matrix based on a quaternion.
     */
    fromQuaternion: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;

        var m = this._m;
        m[0] = 1 - 2 * (y * y + z * z);
        m[1] = 2 * (x * y + w * z);
        m[2] = 2 * (x * z - w * y);
        m[3] = 0;
        m[4] = 2 * (x * y - w * z);
        m[5] = 1 - 2 * (x * x + z * z);
        m[6] = 2 * (y * z + w * x);
        m[7] = 0;
        m[8] = 2 * (x * z + w * y);
        m[9] = 2 * (y * z - w * x);
        m[10] = 1 - 2 * (x * x + y * y);
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return this;
    },

    /**
     * Multiplies two matrix objects and stores the result in this one
     *
     * @param a
     * @param b
     */
    multiply: function (a, b)
    {
        var am = a._m, bm = b._m;
        var a_m00 = am[0], a_m10 = am[1], a_m20 = am[2], a_m30 = am[3];
        var a_m01 = am[4], a_m11 = am[5], a_m21 = am[6], a_m31 = am[7];
        var a_m02 = am[8], a_m12 = am[9], a_m22 = am[10], a_m32 = am[11];
        var a_m03 = am[12], a_m13 = am[13], a_m23 = am[14], a_m33 = am[15];
        var b_m00 = bm[0], b_m10 = bm[1], b_m20 = bm[2], b_m30 = bm[3];
        var b_m01 = bm[4], b_m11 = bm[5], b_m21 = bm[6], b_m31 = bm[7];
        var b_m02 = bm[8], b_m12 = bm[9], b_m22 = bm[10], b_m32 = bm[11];
        var b_m03 = bm[12], b_m13 = bm[13], b_m23 = bm[14], b_m33 = bm[15];

        var m = this._m;
        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20 + a_m03 * b_m30;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20 + a_m13 * b_m30;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20 + a_m23 * b_m30;
        m[3] = a_m30 * b_m00 + a_m31 * b_m10 + a_m32 * b_m20 + a_m33 * b_m30;
        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21 + a_m03 * b_m31;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21 + a_m13 * b_m31;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21 + a_m23 * b_m31;
        m[7] = a_m30 * b_m01 + a_m31 * b_m11 + a_m32 * b_m21 + a_m33 * b_m31;
        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22 + a_m03 * b_m32;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22 + a_m13 * b_m32;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22 + a_m23 * b_m32;
        m[11] = a_m30 * b_m02 + a_m31 * b_m12 + a_m32 * b_m22 + a_m33 * b_m32;
        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03 * b_m33;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13 * b_m33;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23 * b_m33;
        m[15] = a_m30 * b_m03 + a_m31 * b_m13 + a_m32 * b_m23 + a_m33 * b_m33;
        return this;
    },

    /**
     * Multiplies two matrix objects, assuming they're affine transformations, and stores the result in this one
     *
     * @param a
     * @param b
     */
    multiplyAffine: function (a, b)
    {
        var am = a._m, bm = b._m;
        var a_m00 = am[0], a_m10 = am[1], a_m20 = am[2];
        var a_m01 = am[4], a_m11 = am[5], a_m21 = am[6];
        var a_m02 = am[8], a_m12 = am[9], a_m22 = am[10];
        var a_m03 = am[12], a_m13 = am[13], a_m23 = am[14];
        var b_m00 = bm[0], b_m10 = bm[1], b_m20 = bm[2];
        var b_m01 = bm[4], b_m11 = bm[5], b_m21 = bm[6];
        var b_m02 = bm[8], b_m12 = bm[9], b_m22 = bm[10];
        var b_m03 = bm[12], b_m13 = bm[13], b_m23 = bm[14];

        var m = this._m;
        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23;
        return this;

    },

    /**
     * Initializes the matrix as a rotation matrix around a given axis
     *
     * @param axis The axis around which the rotation takes place.
     * @param radians The angle of rotation
     */
    fromRotationAxisAngle: function (axis, radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;


        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var m = this._m;
        m[0] = oneMinCos * x * x + cos;
        m[1] = oneMinCos * x * y + sin * z;
        m[2] = oneMinCos * x * z - sin * y;
        m[3] = 0;
        m[4] = oneMinCos * x * y - sin * z;
        m[5] = oneMinCos * y * y + cos;
        m[6] = oneMinCos * y * z + sin * x;
        m[7] = 0;
        m[8] = oneMinCos * x * z + sin * y;
        m[9] = oneMinCos * y * z - sin * x;
        m[10] = oneMinCos * z * z + cos;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return this;
    },


    /**
     * Initializes the matrix as a rotation matrix from 3 Euler angles
     */
    // this actually doesn't use a vector, because they're three unrelated quantities. A vector just doesn't make sense here, mathematically.
    fromEuler: function (x, y, z)
    {
        var cosX = Math.cos(x);
        var sinX = Math.sin(x);
        var cosY = Math.cos(y);
        var sinY = Math.sin(y);
        var cosZ = Math.cos(z);
        var sinZ = Math.sin(z);

        var m = this._m;
        m[0] = cosY * cosZ;
        m[1] = cosX * sinZ + sinX * sinY * cosZ;
        m[2] = sinX * sinZ - cosX * sinY * cosZ;
        m[3] = 0;
        m[4] = -cosY * sinZ;
        m[5] = cosX * cosZ - sinX * sinY * sinZ;
        m[6] = sinX * cosZ + cosX * sinY * sinZ;
        m[7] = 0;
        m[8] = sinY;
        m[9] = -sinX * cosY;
        m[10] = cosX * cosY;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return this;
    },

    /**
     * Initializes the matrix as a rotation matrix from Tait-Bryan angles (pitch, yaw, roll).
     */
    fromRotationPitchYawRoll: function (pitch, yaw, roll)
    {
        var cosP = Math.cos(-pitch);
        var cosY = Math.cos(-yaw);
        var cosR = Math.cos(roll);
        var sinP = Math.sin(-pitch);
        var sinY = Math.sin(-yaw);
        var sinR = Math.sin(roll);

        var yAxisX = -sinY * cosP;
        var yAxisY = cosY * cosP;
        var yAxisZ = -sinP;

        var zAxisX = -cosY * sinR - sinY * sinP * cosR;
        var zAxisY = -sinY * sinR + sinP * cosR * cosY;
        var zAxisZ = cosP * cosR;

        var xAxisX = yAxisY * zAxisZ - yAxisZ * zAxisY;
        var xAxisY = yAxisZ * zAxisX - yAxisX * zAxisZ;
        var xAxisZ = yAxisX * zAxisY - yAxisY * zAxisX;

        var m = this._m;
        m[0] = xAxisX;
        m[1] = xAxisY;
        m[2] = xAxisZ;
        m[3] = 0;
        m[4] = yAxisX;
        m[5] = yAxisY;
        m[6] = yAxisZ;
        m[7] = 0;
        m[8] = zAxisX;
        m[9] = zAxisY;
        m[10] = zAxisZ;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return this;
    },

    /**
     * Initializes as a translation matrix.
     * @param xOrV A Float4 or a Number as x-coordinate
     * @param y The y-translation. Omitted if xOrV is a Float4.
     * @param z The z-translation. Omitted if xOrV is a Float4.
     */
    fromTranslation: function (xOrV, y, z)
    {
        if (y === undefined) {
            xOrV = xOrV.x;
            y = xOrV.y;
            z = xOrV.z;
        }
        var m = this._m;
        m[0] = 1;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = 1;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = 1;
        m[11] = 0;
        m[12] = xOrV;
        m[13] = y;
        m[14] = z;
        m[15] = 1;
        return this;
    },

    /**
     * Initializes as a scale matrix.
     * @param x
     * @param y
     * @param z
     */
    fromScale: function (x, y, z)
    {
        if (x instanceof Float4$1) {
            y = x.y;
            z = x.z;
            x = x.x;
        }
        else if (y === undefined)
            y = z = x;

        var m = this._m;
        m[0] = x;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = y;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = z;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
        return this;
    },

    /**
     * Initializes as a perspective projection matrix (from right-handed Y-up to left-handed NDC!).
     * @param vFOV The vertical field of view in radians.
     * @param aspectRatio The aspect ratio
     * @param nearDistance The near plane distance
     * @param farDistance The far plane distance
     */
    fromPerspectiveProjection: function (vFOV, aspectRatio, nearDistance, farDistance)
    {
        var vMax = 1.0 / Math.tan(vFOV * .5);
        var hMax = vMax / aspectRatio;
        var rcpFrustumDepth = 1.0 / (nearDistance - farDistance);

        var m = this._m;
        m[0] = hMax;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;

        m[4] = 0;
        m[5] = 0;
        m[6] = -(farDistance + nearDistance) * rcpFrustumDepth;
        m[7] = 1;

        m[8] = 0;
        m[9] = vMax;
        m[10] = 0;
        m[11] = 0;

        m[12] = 0;
        m[13] = 0;
        m[14] = 2 * nearDistance * farDistance * rcpFrustumDepth;
        m[15] = 0;
        return this;
    },

    /**
     * Initializes as an off-center orthographic projection matrix.
     * @param left The distance to the left plane
     * @param right The distance to the right plane
     * @param top The distance to the top plane
     * @param bottom The distance to the bottom plane
     * @param nearDistance The near plane distance
     * @param farDistance The far plane distance
     */
    fromOrthographicOffCenterProjection: function (left, right, top, bottom, nearDistance, farDistance)
    {
        var rcpWidth = 1.0 / (right - left);
        var rcpHeight = 1.0 / (top - bottom);
        var rcpDepth = 1.0 / (nearDistance - farDistance);

        var m = this._m;
        m[0] = 2.0 * rcpWidth;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;

        m[4] = 0;
        m[5] = 0;
        m[6] = -2.0 * rcpDepth;
        m[7] = 0;

        m[8] = 0;
        m[9] = 2.0 * rcpHeight;
        m[10] = 0;
        m[11] = 0;

        m[12] = -(left + right) * rcpWidth;
        m[13] = -(top + bottom) * rcpHeight;
        m[14] = (farDistance + nearDistance) * rcpDepth;
        m[15] = 1;
        return this;
    },

    /**
     * Initializes as a symmetrical orthographic projection matrix.
     * @param width The width of the projection
     * @param top The height of the projection
     * @param nearDistance The near plane distance
     * @param farDistance The far plane distance
     */
    fromOrthographicProjection: function (width, height, nearDistance, farDistance)
    {
        var rcpWidth = 1.0 / width;
        var rcpHeight = 1.0 / height;
        var rcpDepth = 1.0 / (nearDistance - farDistance);

        var m = this._m;
        m[0] = 2.0 * rcpWidth;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;

        m[4] = 0;
        m[5] = 0;
        m[6] = 2.0 * rcpDepth;
        m[7] = 0;

        m[8] = 0;
        m[9] = 2.0 * rcpHeight;
        m[10] = 0;
        m[11] = 0;

        m[12] = 0.0;
        m[13] = 0.0;
        m[14] = (farDistance + nearDistance) * rcpDepth;
        m[15] = 1;
        return this;
    },

    /**
     * Returns a copy of this object.
     */
    clone: function ()
    {
        return new Matrix4x4$1(this._m);
    },

    /**
     * Transposes the matrix.
     */
    transpose: function ()
    {
        var m = this._m;
        var m1 = m[1];
        var m2 = m[2];
        var m3 = m[3];
        var m6 = m[6];
        var m7 = m[7];
        var m11 = m[11];

        m[1] = m[4];
        m[2] = m[8];
        m[3] = m[12];

        m[4] = m1;
        m[6] = m[9];
        m[7] = m[13];

        m[8] = m2;
        m[9] = m6;
        m[11] = m[14];

        m[12] = m3;
        m[13] = m7;
        m[14] = m11;
        return this;
    },

    /**
     * The determinant of a 3x3 minor matrix (matrix created by removing a given row and column)
     * @private
     * @ignore
     */
    determinant3x3: function (row, col)
    {
        // columns are the indices * 4 (to form index for row 0)
        var c1 = col === 0 ? 4 : 0;
        var c2 = col < 2 ? 8 : 4;
        var c3 = col === 3 ? 8 : 12;
        var r1 = row === 0 ? 1 : 0;
        var r2 = row < 2 ? 2 : 1;
        var r3 = row === 3 ? 2 : 3;

        var m = this._m;
        var m21 = m[c1 | r2], m22 = m[r2 | c2], m23 = m[c3 | r2];
        var m31 = m[c1 | r3], m32 = m[c2 | r3], m33 = m[r3 | c3];

        return      m[c1 | r1] * (m22 * m33 - m23 * m32)
            - m[c2 | r1] * (m21 * m33 - m23 * m31)
            + m[c3 | r1] * (m21 * m32 - m22 * m31);

        return this;
    },

    /**
     * Calculates the cofactor for the given row and column
     */
    cofactor: function (row, col)
    {
        // should be able to xor sign bit instead
        var sign = 1 - (((row + col) & 1) << 1);
        return sign * this.determinant3x3(row, col);
    },

    /**
     * Creates a matrix containing all the cofactors.
     */
    getCofactorMatrix: function (row, col, target)
    {
        target = target || new Matrix4x4$1();

        var tm = target._m;
        for (var i = 0; i < 16; ++i)
            tm[i] = this.cofactor(i & 3, i >> 2);

        return target;
    },

    /**
     * Calculates teh adjugate matrix.
     */
    getAdjugate: function (row, col, target)
    {
        target = target || new Matrix4x4$1();

        var tm = target._m;
        for (var i = 0; i < 16; ++i)
            tm[i] = this.cofactor(i >> 2, i & 3);    // transposed!

        return target;
    },

    /**
     * Calculates the determinant of the matrix.
     */
    determinant: function ()
    {
        var m = this._m;
        return m[0] * this.determinant3x3(0, 0) - m[4] * this.determinant3x3(0, 1) + m[8] * this.determinant3x3(0, 2) - m[12] * this.determinant3x3(0, 3);
    },

    /**
     * Initializes as the inverse of the given matrix.
     */
    inverseOf: function (matrix)
    {
        // this can be much more efficient, but I'd like to keep it readable for now. The full inverse is not required often anyway.
        var rcpDet = 1.0 / matrix.determinant();

        // needs to be self-assignment-proof
        var m0 = rcpDet * matrix.cofactor(0, 0);
        var m1 = rcpDet * matrix.cofactor(0, 1);
        var m2 = rcpDet * matrix.cofactor(0, 2);
        var m3 = rcpDet * matrix.cofactor(0, 3);
        var m4 = rcpDet * matrix.cofactor(1, 0);
        var m5 = rcpDet * matrix.cofactor(1, 1);
        var m6 = rcpDet * matrix.cofactor(1, 2);
        var m7 = rcpDet * matrix.cofactor(1, 3);
        var m8 = rcpDet * matrix.cofactor(2, 0);
        var m9 = rcpDet * matrix.cofactor(2, 1);
        var m10 = rcpDet * matrix.cofactor(2, 2);
        var m11 = rcpDet * matrix.cofactor(2, 3);
        var m12 = rcpDet * matrix.cofactor(3, 0);
        var m13 = rcpDet * matrix.cofactor(3, 1);
        var m14 = rcpDet * matrix.cofactor(3, 2);
        var m15 = rcpDet * matrix.cofactor(3, 3);

        var m = this._m;
        m[0] = m0;
        m[1] = m1;
        m[2] = m2;
        m[3] = m3;
        m[4] = m4;
        m[5] = m5;
        m[6] = m6;
        m[7] = m7;
        m[8] = m8;
        m[9] = m9;
        m[10] = m10;
        m[11] = m11;
        m[12] = m12;
        m[13] = m13;
        m[14] = m14;
        m[15] = m15;
        return this;
    },

    /**
     * Initializes as the inverse of the given matrix, assuming it is affine. It's faster than regular inverse.
     */
    inverseAffineOf: function (a)
    {
        var mm = a._m;
        var m0 = mm[0], m1 = mm[1], m2 = mm[2];
        var m4 = mm[4], m5 = mm[5], m6 = mm[6];
        var m8 = mm[8], m9 = mm[9], m10 = mm[10];
        var m12 = mm[12], m13 = mm[13], m14 = mm[14];
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

        var m = this._m;
        m[0] = n0;
        m[1] = n1;
        m[2] = n2;
        m[3] = 0;
        m[4] = n4;
        m[5] = n5;
        m[6] = n6;
        m[7] = 0;
        m[8] = n8;
        m[9] = n9;
        m[10] = n10;
        m[11] = 0;
        m[12] = -n0 * m12 - n4 * m13 - n8 * m14;
        m[13] = -n1 * m12 - n5 * m13 - n9 * m14;
        m[14] = -n2 * m12 - n6 * m13 - n10 * m14;
        m[15] = 1;
        return this;
    },

    /**
     * Writes the inverse transpose into an array for upload (must support 9 elements)
     */
    writeNormalMatrix: function (array, index)
    {
        index = index || 0;
        var m = this._m;
        var m0 = m[0], m1 = m[1], m2 = m[2];
        var m4 = m[4], m5 = m[5], m6 = m[6];
        var m8 = m[8], m9 = m[9], m10 = m[10];

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

    /**
     * Writes the matrix into an array for upload
     */
    writeData: function(array, index)
    {
        index = index || 0;
        var m = this._m;
        for (var i = 0; i < 16; ++i)
            array[index + i] = m[i];
    },

    /**
     * Writes the matrix into an array for upload, ignoring the bottom row (for affine matrices)
     */
    writeData4x3: function(array, index)
    {
        var m = this._m;
        index = index || 0;
        array[index] = m[0];
        array[index + 1] = m[4];
        array[index + 2] = m[8];
        array[index + 3] = m[12];
        array[index + 4] = m[1];
        array[index + 5] = m[5];
        array[index + 6] = m[9];
        array[index + 7] = m[13];
        array[index + 8] = m[2];
        array[index + 9] = m[6];
        array[index + 10] = m[10];
        array[index + 11] = m[14];
    },

    /**
     * Inverts the matrix.
     */
    invert: function ()
    {
        return this.inverseOf(this);
    },

    /**
     * Inverts the matrix, assuming it's affine (faster than regular inverse)
     */
    invertAffine: function ()
    {
        return this.inverseAffineOf(this);
    },

    /**
     * Post-multiplication (M x this)
     */
    append: function (m)
    {
        return this.multiply(m, this);
    },

    /**
     * Pre-multiplication (this x M)
     */
    prepend: function (m)
    {
        return this.multiply(this, m);
    },

    /**
     * Post-multiplication (M x this) assuming affine matrices
     */
    appendAffine: function (m)
    {
        return this.multiplyAffine(m, this);
    },

    /**
     * Pre-multiplication (M x this) assuming affine matrices
     */
    prependAffine: function (m)
    {
        return this.multiplyAffine(this, m);
    },

    /**
     * Adds the elements of another matrix to this one.
     */
    add: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] += mm[0];
        m[1] += mm[1];
        m[2] += mm[2];
        m[3] += mm[3];
        m[4] += mm[4];
        m[5] += mm[5];
        m[6] += mm[6];
        m[7] += mm[7];
        m[8] += mm[8];
        m[9] += mm[9];
        m[10] += mm[10];
        m[11] += mm[11];
        m[12] += mm[12];
        m[13] += mm[13];
        m[14] += mm[14];
        m[15] += mm[15];
        return this;
    },

    /**
     * Adds the elements of another matrix to this one, assuming both are affine.
     */
    addAffine: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] += mm[0];
        m[1] += mm[1];
        m[2] += mm[2];
        m[4] += mm[4];
        m[5] += mm[5];
        m[6] += mm[6];
        m[8] += mm[8];
        m[9] += mm[9];
        m[10] += mm[10];
        return this;
    },

    /**
     * Subtracts the elements of another matrix from this one.
     */
    subtract: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] -= mm[0];
        m[1] -= mm[1];
        m[2] -= mm[2];
        m[3] -= mm[3];
        m[4] -= mm[4];
        m[5] -= mm[5];
        m[6] -= mm[6];
        m[7] -= mm[7];
        m[8] -= mm[8];
        m[9] -= mm[9];
        m[10] -= mm[10];
        m[11] -= mm[11];
        m[12] -= mm[12];
        m[13] -= mm[13];
        m[14] -= mm[14];
        m[15] -= mm[15];
        return this;
    },

    /**
     * Subtracts the elements of another matrix from this one, assuming both are affine.
     */
    subtractAffine: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] -= mm[0];
        m[1] -= mm[1];
        m[2] -= mm[2];
        m[4] -= mm[4];
        m[5] -= mm[5];
        m[6] -= mm[6];
        m[8] -= mm[8];
        m[9] -= mm[9];
        m[10] -= mm[10];
        return this;
    },

    /**
     * Post-multiplies a scale
     */
    appendScale: function (x, y, z)
    {
        if (x instanceof Float4$1) {
            y = x.y;
            z = x.z;
            x = x.x;
        }
        else if (y === undefined)
            y = z = x;

        var m = this._m;
        m[0] *= x;
        m[1] *= y;
        m[2] *= z;
        m[4] *= x;
        m[5] *= y;
        m[6] *= z;
        m[8] *= x;
        m[9] *= y;
        m[10] *= z;
        m[12] *= x;
        m[13] *= y;
        m[14] *= z;
        return this;
    },

    /**
     * Pre-multiplies a scale
     */
    prependScale: function (x, y, z)
    {
        if (x instanceof Float4$1) {
            y = x.y;
            z = x.z;
            x = x.x;
        }
        else if (y === undefined)
            y = z = x;

        var m = this._m;
        m[0] *= x;
        m[1] *= x;
        m[2] *= x;
        m[3] *= x;
        m[4] *= y;
        m[5] *= y;
        m[6] *= y;
        m[7] *= y;
        m[8] *= z;
        m[9] *= z;
        m[10] *= z;
        m[11] *= z;
        return this;
    },

    /**
     * Post-multiplies a translation
     */
    appendTranslation: function (v)
    {
        var m = this._m;
        m[12] += v.x;
        m[13] += v.y;
        m[14] += v.z;
        return this;
    },

    /**
     * Pre-multiplies a translation
     */
    prependTranslation: function (v)
    {
        var m = this._m;
        var x = v.x, y = v.y, z = v.z;
        m[12] += m[0] * x + m[4] * y + m[8] * z;
        m[13] += m[1] * x + m[5] * y + m[9] * z;
        m[14] += m[2] * x + m[6] * y + m[10] * z;
        m[15] += m[3] * x + m[7] * y + m[11] * z;
        return this;
    },

    /**
     * Post-multiplies a quaternion rotation
     */
    appendQuaternion: function (q)
    {
        var m = this._m;
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = 1 - 2 * (y * y + z * z), a_m10 = 2 * (x * y + w * z), a_m20 = 2 * (x * z - w * y);
        var a_m01 = 2 * (x * y - w * z), a_m11 = 1 - 2 * (x * x + z * z), a_m21 = 2 * (y * z + w * x);
        var a_m02 = 2 * (x * z + w * y), a_m12 = 2 * (y * z - w * x), a_m22 = 1 - 2 * (x * x + y * y);

        var b_m00 = m[0], b_m10 = m[1], b_m20 = m[2];
        var b_m01 = m[4], b_m11 = m[5], b_m21 = m[6];
        var b_m02 = m[8], b_m12 = m[9], b_m22 = m[10];
        var b_m03 = m[12], b_m13 = m[13], b_m23 = m[14];

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
        return this;
    },

    /**
     * Pre-multiplies a quaternion rotation
     */
    prependQuaternion: function (q)
    {
        var m = this._m;
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = m[0], a_m10 = m[1], a_m20 = m[2];
        var a_m01 = m[4], a_m11 = m[5], a_m21 = m[6];
        var a_m02 = m[8], a_m12 = m[9], a_m22 = m[10];

        var b_m00 = 1 - 2 * (y * y + z * z), b_m10 = 2 * (x * y + w * z), b_m20 = 2 * (x * z - w * y);
        var b_m01 = 2 * (x * y - w * z), b_m11 = 1 - 2 * (x * x + z * z), b_m21 = 2 * (y * z + w * x);
        var b_m02 = 2 * (x * z + w * y), b_m12 = 2 * (y * z - w * x), b_m22 = 1 - 2 * (x * x + y * y);

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
        return this;
    },

    /**
     * Post-multiplies an axis/angle rotation
     */
    appendRotationAxisAngle: function (axis, radians)
    {
        var m = this._m;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = oneMinCos * x * x + cos, a_m10 = oneMinCos * x * y + sin * z, a_m20 = oneMinCos * x * z - sin * y;
        var a_m01 = oneMinCos * x * y - sin * z, a_m11 = oneMinCos * y * y + cos, a_m21 = oneMinCos * y * z + sin * x;
        var a_m02 = oneMinCos * x * z + sin * y, a_m12 = oneMinCos * y * z - sin * x, a_m22 = oneMinCos * z * z + cos;

        var b_m00 = m[0], b_m10 = m[1], b_m20 = m[2];
        var b_m01 = m[4], b_m11 = m[5], b_m21 = m[6];
        var b_m02 = m[8], b_m12 = m[9], b_m22 = m[10];
        var b_m03 = m[12], b_m13 = m[13], b_m23 = m[14];

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
        return this;
    },

    /**
     * Pre-multiplies an axis/angle rotation
     */
    prependRotationAxisAngle: function (axis, radians)
    {
        var m = this._m;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = m[0], a_m10 = m[1], a_m20 = m[2];
        var a_m01 = m[4], a_m11 = m[5], a_m21 = m[6];
        var a_m02 = m[8], a_m12 = m[9], a_m22 = m[10];

        var b_m00 = oneMinCos * x * x + cos, b_m10 = oneMinCos * x * y + sin * z, b_m20 = oneMinCos * x * z - sin * y;
        var b_m01 = oneMinCos * x * y - sin * z, b_m11 = oneMinCos * y * y + cos, b_m21 = oneMinCos * y * z + sin * x;
        var b_m02 = oneMinCos * x * z + sin * y, b_m12 = oneMinCos * y * z - sin * x, b_m22 = oneMinCos * z * z + cos;

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
        return this;
    },

    /**
     * Gets the given row from the matrix.
     * @param {Number} index The index of the row
     * @param {Float4} [target] An optional target. If omitted, a new object will be created.
     */
    getRow: function (index, target)
    {
        var m = this._m;
        target = target || new Float4$1();
        target.x = m[index];
        target.y = m[index | 4];
        target.z = m[index | 8];
        target.w = m[index | 12];
        return target;
    },

    /**
     * Sets a row in the matrix.
     * @param {Number} index The index of the row.
     * @param {Float4} v The vector to assign to the row
     */
    setRow: function (index, v)
    {
        var m = this._m;
        m[index] = v.x;
        m[index | 4] = v.y;
        m[index | 8] = v.z;
        m[index | 12] = v.w;
        return this;
    },

    /**
     * Gets the value of a single element.
     * @param row The row index
     * @param col The column index
     */
    getElement: function(row, col)
    {
        return this._m[row | (col << 2)];
    },

    /**
     * Sets the value of a single element.
     * @param row The row index
     * @param col The column index
     * @param value The value to assign to the element
     */
    setElement: function(row, col, value)
    {
        this._m[row | (col << 2)] = value;
        return this;
    },

    /**
     * Gets the given column from the matrix.
     * @param {Number} index The index of the column
     * @param {Float4} [target] An optional target. If omitted, a new object will be created.
     */
    getColumn: function (index, target)
    {
        var m = this._m;
        target = target || new Float4$1();
        index <<= 2;
        target.x = m[index];
        target.y = m[index | 1];
        target.z = m[index | 2];
        target.w = m[index | 3];
        return target;
    },

    /**
     * Sets a column in the matrix.
     * @param {Number} index The index of the column.
     * @param {Float4} v The vector to assign to the column
     */
    setColumn: function (index, v)
    {
        var m = this._m;
        index <<= 2;
        m[index] = v.x;
        m[index | 1] = v.y;
        m[index | 2] = v.z;
        m[index | 3] = v.w;
        return this;
    },

    /**
     * Copies a column from another matrix.
     * @param {Number} index The index of the column.
     * @param {Matrix4x4} m The matrix from which to copy.
     */
    copyColumn: function(index, m)
    {
        var m1 = this._m;
        var m2 = m._m;
        index <<= 2;
        m1[index] = m2[index];
        m1[index | 1] = m2[index | 1];
        m1[index | 2] = m2[index | 2];
        m1[index | 3] = m2[index | 3];
        return this;
    },

    /**
     * Initializes as a "lookAt" matrix at the given eye position oriented toward a target
     * @param {Float4} target The target position to look at.
     * @param {Float4} eye The target position the matrix should "be" at
     * @param {Float4} up The world-up vector. Must be unit length (usually Float4.Z_AXIS)
     */
    lookAt: function (target, eye, up)
    {
        var xAxis = new Float4$1();
        var yAxis = new Float4$1();
        var zAxis = new Float4$1();

        return function(target, eye, up)
        {
            up = up || Float4$1.Z_AXIS;
            // Y axis is forward
            Float4$1.subtract(target, eye, yAxis);
            yAxis.normalize();

            Float4$1.cross(yAxis, up, xAxis);

            if (Math.abs(xAxis.lengthSqr) < .0001) {
                var altUp = new Float4$1(up.x, up.z, up.y, 0.0);
                Float4$1.cross(yAxis, altUp, xAxis);
                if (Math.abs(xAxis.lengthSqr) <= .0001) {
                    altUp.set(up.z, up.y, up.z, 0.0);
                    Float4$1.cross(yAxis, altUp, xAxis);
                }
            }

			xAxis.normalize();

			Float4$1.cross(xAxis, yAxis, zAxis);

            var m = this._m;
            m[0] = xAxis.x;
            m[1] = xAxis.y;
            m[2] = xAxis.z;
            m[3] = 0.0;
            m[4] = yAxis.x;
            m[5] = yAxis.y;
            m[6] = yAxis.z;
            m[7] = 0.0;
            m[8] = zAxis.x;
            m[9] = zAxis.y;
            m[10] = zAxis.z;
            m[11] = 0.0;
            m[12] = eye.x;
            m[13] = eye.y;
            m[14] = eye.z;
            m[15] = 1.0;

            return this;
        }
    }(),

    /**
     * Initializes as an affine transformation based on a transform object
     */
    compose: function(transform)
    {
        this.fromScale(transform.scale);
        this.appendQuaternion(transform.rotation);
        this.appendTranslation(transform.position);
        return this;
    },

    /**
     * Decomposes an affine transformation matrix into a Transform object, or a triplet position, quaternion, scale.
     * @param targetOrPos An optional target object to store the values. If this is a Float4, quat and scale need to be provided. If omitted, a new Transform object will be created and returned.
     * @param quat An optional quaternion to store rotation. Unused if targetOrPos is a Transform object.
     * @param quat An optional Float4 to store scale. Unused if targetOrPos is a Transform object.
     */
    decompose: function (targetOrPos, quat, scale)
    {
        targetOrPos = targetOrPos || new Transform();

        var pos;
        if (quat === undefined) {
            quat = targetOrPos.rotation;
            scale = targetOrPos.scale;
            pos = targetOrPos.position;
        }
        else pos = targetOrPos;

        var m = this._m;
        var m0 = m[0], m1 = m[1], m2 = m[2];
        var m4 = m[4], m5 = m[5], m6 = m[6];
        var m8 = m[8], m9 = m[9], m10 = m[10];

        // check for negative scale by calculating cross X x Y (positive scale should yield the same Z)
        var cx = m1*m6 - m2*m5;
        var cy = m2*m4 - m0*m6;
        var cz = m0*m5 - m1*m4;

        // dot cross product X x Y with Z < 0? Lefthanded flip.
        var flipSign = MathX.sign(cx * m8 + cy * m9 + cz * m10);

        // we assign the flipSign to all three instead of just 1, so that if a uniform negative scale was used, this will
        // be preserved
        scale.x = flipSign * Math.sqrt(m0 * m0 + m1 * m1 + m2 * m2);
        scale.y = flipSign * Math.sqrt(m4 * m4 + m5 * m5 + m6 * m6);
        scale.z = flipSign * Math.sqrt(m8 * m8 + m9 * m9 + m10 * m10);
        var clone = this.clone();

        var rcpX = 1.0 / scale.x, rcpY = 1.0 / scale.y, rcpZ = 1.0 / scale.z;

        var cm = clone._m;
        cm[0] *= rcpX;
        cm[1] *= rcpX;
        cm[2] *= rcpX;
        cm[4] *= rcpY;
        cm[5] *= rcpY;
        cm[6] *= rcpY;
        cm[8] *= rcpZ;
        cm[9] *= rcpZ;
        cm[10] *= rcpZ;

        quat.fromMatrix(clone);
        this.getColumn(3, pos);

        return targetOrPos;
    },

    /**
     * Swaps two columns
     */
    swapColums: function(i, j)
    {
        var m = this._m;
        if (i === j) return;
        i <<= 2;
        j <<= 2;
        var x = m[i];
        var y = m[i | 1];
        var z = m[i | 2];
        var w = m[i | 3];
        m[i] = m[j];
        m[i | 1] = m[j | 1];
        m[i | 2] = m[j | 2];
        m[i | 3] = m[j | 3];
        m[j] = x;
        m[j | 1] = y;
        m[j | 2] = z;
        m[j | 3] = w;
        return this;
    },

    /**
     * @ignore
     */
    toString: function()
    {
        var m = this._m;
        var str = "";
        for (var i = 0; i < 16; ++i) {
            var mod = i & 0x3;
            if (mod === 0)
                str += "[";

            str += m[i];

            if (mod === 3)
                str += "]\n";
            else
                str += "\t , \t";
        }
        return str;
    }
};

/**
 * Preset for the identity matrix
 */
Matrix4x4$1.IDENTITY = new Matrix4x4$1();

/**
 * Preset for the all-zero matrix
 */
Matrix4x4$1.ZERO = new Matrix4x4$1(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

/**
 * @classdesc
 * Quaternion is a class to represent (in our case) rotations.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Quaternion(x, y, z, w)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w === undefined? 1 : w;
}

Quaternion.prototype =
{
    /**
     * Initializes as an axis/angle rotation
     */
    fromAxisAngle: function (axis, radians)
    {
        var halfAngle = radians * .5;
        var factor = Math.sin(halfAngle) / axis.length;
        this.x = axis.x * factor;
        this.y = axis.y * factor;
        this.z = axis.z * factor;
        this.w = Math.cos(halfAngle);
        return this;
    },

    /**
     * Initializes from Tait-Bryan angles
     */
    fromPitchYawRoll: function(pitch, yaw, roll)
    {
        var mtx = new Matrix4x4$1();
        // wasteful. improve.
        mtx.fromRotationPitchYawRoll(pitch, yaw, roll);
        this.fromMatrix(mtx);
        return this;
    },

    /**
     * Initializes from Euler angles
     */
    fromEuler: function(x, y, z)
    {
        var cx = Math.cos(x * 0.5), cy = Math.cos(y * 0.5), cz = Math.cos(z * 0.5);
        var sx = Math.sin(x * 0.5), sy = Math.sin(y * 0.5), sz = Math.sin(z * 0.5);

        this.x = sx*cy*cz + cx*sy*sz;
        this.y = cx*sy*cz - sx*cy*sz;
        this.z = cx*cy*sz + sx*sy*cz;
        this.w = cx*cy*cz - sx*sy*sz;
        return this;
    },

    /**
     * Stores the rotation as Euler angles in a Float4 object
     */
    toEuler: function(target)
    {
        target = target || new Float4$1();

        var x = this.x, y = this.y, z = this.z, w = this.w;
        var xx = x * x, yy = y * y, zz = z * z, ww = w * w;

        target.x = Math.atan2( -2*(y*z - w*x), ww - xx - yy + zz );
        target.y = Math.asin ( 2*(x*z + w*y) );
        target.z = Math.atan2( -2*(x*y - w*z), ww + xx - yy - zz );

        return target;
    },

    /**
     * Initializes from a rotation matrix
     */
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
        return this;
    },

    /**
     * Rotates a Float4 point.
     *
     * @param {Float4} [target] An optional target object. If not provided, a new object will be created and returned.
     */
    rotate: function(v, target)
    {
        target = target || new Float4$1();

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

    /**
     * Negates all the components. This results in the same net rotation, but with different orientation
     */
    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
        return this;
    },

    /**
     * Sets all components explicitly
     */
    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    },

    /**
     * Copies all components from another quaternion
     */
    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.w = b.w;
        return this;
    },

    /**
     * Gets the quaternion's squared norm
     */
    get normSquared()
    {
        return this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w;
    },

    /**
     * Gets the quaternion's norm
     */
    get norm()
    {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
    },

    /**
     * Normalizes the quaternion.
     */
    normalize : function()
    {
        var rcpNorm = 1.0/Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
        this.x *= rcpNorm;
        this.y *= rcpNorm;
        this.z *= rcpNorm;
        this.w *= rcpNorm;
        return this;
    },

    /**
     * Converts to the conjugate.
     */
    conjugate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    },

    /**
     * inverts the quaternion.
     */
    invert: function ()
    {
        var x = this.x, y = this.y, z = this.z, w = this.w;
        var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
        this.x = -x*rcpSqrNorm;
        this.y = -y*rcpSqrNorm;
        this.z = -z*rcpSqrNorm;
        this.w = w*rcpSqrNorm;
        return this;
    },

    /**
     * Multiplies two quaternions and stores it in the current.
     */
    multiply: function(a, b)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

        this.x = w1*x2 + x1*w2 + y1*z2 - z1*y2;
        this.y = w1*y2 - x1*z2 + y1*w2 + z1*x2;
        this.z = w1*z2 + x1*y2 - y1*x2 + z1*w2;
        this.w = w1*w2 - x1*x2 - y1*y2 - z1*z2;
        return this;
    },

    /**
     * Post-multiplies another quaternion to this one.
     */
    append: function(q)
    {
        return this.multiply(q, this);
    },

    /**
     * Pre-multiplies another quaternion to this one.
     */
    prepend: function(q)
    {
        return this.multiply(this, q);
    },

    /**
     * Linearly interpolates two quaternions.
     * @param {Quaternion} a The first vector to interpolate from.
     * @param {Quaternion} b The second vector to interpolate to.
     * @param {Number} t The interpolation factor.
     */
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
        return this;
    },

    /**
     * Spherical-linearly interpolates two quaternions.
     * @param {Quaternion} a The first vector to interpolate from.
     * @param {Quaternion} b The second vector to interpolate to.
     * @param {Number} t The interpolation factor.
     */
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

            var x = x2 - x1*dot;
            var y = y2 - y1*dot;
            var z = z2 - z1*dot;
            var w = w2 - w1*dot;
            var rcpNorm = 1.0/Math.sqrt(x*x + y*y + z*z + w*w);
            x *= rcpNorm;
            y *= rcpNorm;
            z *= rcpNorm;
            w *= rcpNorm;

            var cos = Math.cos(interpolatedAngle);
            var sin = Math.sin(interpolatedAngle);
            this.x = x1 * cos + x * sin;
            this.y = y1 * cos + y * sin;
            this.z = z1 * cos + z * sin;
            this.w = w1 * cos + w * sin;
        }
        else {
            // nearly identical angle, interpolate linearly
            this.x = x1 + factor * (x2 - x1);
            this.y = y1 + factor * (y2 - y1);
            this.z = z1 + factor * (z2 - z1);
            this.w = w1 + factor * (w2 - w1);
            this.normalize();
        }

        return this;
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "Quaternion(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
    }
};

/**
 * @classdesc
 *
 * A collider along an infinite plane.
 *
 * @constructor
 *
 * @param {number} [height] The height of the sphere. If omitted, will use the object bounds.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function InfinitePlaneCollider(height)
{
    Collider.call(this);
    if (height) this._center = new HX.Float4(0, height, 0);
    // this._orientation = new Quaternion();
    // this._orientation.fromAxisAngle(HX.Float4.X_AXIS, -Math.PI * .5);
}

InfinitePlaneCollider.prototype = Object.create(Collider.prototype);

InfinitePlaneCollider.prototype.volume = function()
{
    return 0;
};

InfinitePlaneCollider.prototype.createShape = function(sceneBounds)
{
    return new CANNON.Plane();
};

exports.PhysicsSystem = PhysicsSystem;
exports.RigidBody = RigidBody;
exports.BoxCollider = BoxCollider;
exports.SphereCollider = SphereCollider;
exports.InfinitePlaneCollider = InfinitePlaneCollider;

Object.defineProperty(exports, '__esModule', { value: true });

})));
