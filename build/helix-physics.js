(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('cannon'), require('helix')) :
	typeof define === 'function' && define.amd ? define('HX', ['exports', 'cannon', 'helix'], factory) :
	(factory((global.HX = global.HX || {}),global.CANNON,global.HX));
}(this, (function (exports,CANNON,HX) { 'use strict';

// TODO: Rename to RigidBodyComponent?

function RigidBodyComponent(colliderType, mass)
{
    HX.Component.call(this);
    this._type = colliderType || RigidBodyComponent.TYPE_AUTO;
    this._body = null;

    if (colliderType === RigidBodyComponent.TYPE_INFINITE_PLANE)
        this._mass = 0;

    this._linearDamping = 0.5;
    this._angularDamping = 0.5;

    this._mass = mass;
    // the offset of the scene graph position to the center of mass
    this._COMOffset = new HX.Float4();
}

RigidBodyComponent.TYPE_BOX = 1;
RigidBodyComponent.TYPE_SPHERE = 2;
RigidBodyComponent.TYPE_INFINITE_PLANE = 3;
RigidBodyComponent.TYPE_AUTO = 4;

HX.Component.create(RigidBodyComponent, {
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

RigidBodyComponent.prototype.onAdded = function()
{
    this._createBody();
};

RigidBodyComponent.prototype.onRemoved = function()
{
};

RigidBodyComponent.prototype.applyTransform = function()
{
    if (this._type === RigidBodyComponent.TYPE_INFINITE_PLANE)
        return;

    var entity = this._entity;
    var body = this._body;
    var matrix = entity.matrix;

    // TODO: These should be transformed to local space instead of world space
    matrix.fromQuaternion(body.quaternion);
    matrix.appendTranslation(body.position);
    entity.matrix = matrix;
};

RigidBodyComponent.prototype._createBody = function()
{
    var entity = this._entity;

    // TODO: Should probably use local bounds if available, and then set the world transform properties
    var bounds = entity.worldBounds;

    var shape;
    var type = this._type;


    if (type === RigidBodyComponent.TYPE_AUTO)
        type = bounds instanceof HX.BoundingAABB? RigidBodyComponent.TYPE_BOX : RigidBodyComponent.TYPE_SPHERE;

    switch(type) {
        case RigidBodyComponent.TYPE_BOX:
            var halfExt = bounds.getHalfExtents();
            var volume = 8 * (halfExt.x * halfExt.y * halfExt.z);
            var vec3 = new CANNON.Vec3(halfExt);
            vec3.copy(halfExt);
            shape = new CANNON.Box(vec3);
            if (this._mass === undefined)
                this._mass = 10 * volume;
            break;
        case RigidBodyComponent.TYPE_SPHERE:
            var radius = bounds.getRadius();
            var volume = .75 * Math.PI * radius * radius * radius;
            shape = new CANNON.Sphere(radius);
            if (this._mass === undefined)
                this._mass = 10 * volume;
            break;
        case RigidBodyComponent.TYPE_INFINITE_PLANE:
            shape = new CANNON.Plane();
            break;
        default:
            throw new Error("Invalid enum!");
    }

    var centerOfMass = bounds.center;
    this._body = new CANNON.Body({
        mass: this._mass,
        linearDamping: this._linearDamping,
        angularDamping: this._angularDamping,
    });

    var COMOffset = HX.Float4.subtract(centerOfMass, entity.position);
    this._body.addShape(shape, COMOffset);

    this._body.position.copy(entity.position);

    if (type === RigidBodyComponent.TYPE_INFINITE_PLANE)
        this._body.quaternion.setFromAxisAngle(HX.Float4.X_AXIS, -Math.PI * .5);
    else
        this._body.quaternion.copy(entity.rotation);
};

/**
 *
 * @property fixedTimeStep If 0, it uses the frame delta times which is not recommended for stability reasons.
 * @constructor
 */
function PhysicsSystem()
{
    HX.EntitySystem.call(this);

    this._world = new CANNON.World();
    this._gravity = -9.81; // m/s²
    this._world.gravity.set(0, this._gravity, 0);
    this._world.solver.tolerance = .001;
    this._world.solver.iterations = 10;
    this._fixedTimeStep = 1000/60;
    this._friction = 0.0;
    this._world.broadphase = new CANNON.SAPBroadphase(this._world);

    this._world.quatNormalizeFast = true;
    this._world.quatNormalizeSkip = 8;

    this._components = [];
}

PhysicsSystem.prototype = Object.create(HX.EntitySystem.prototype, {
    gravity: {
        get: function() {
            return this._gravity;
        },

        set: function(value) {
            this._gravity = value;

            if (value instanceof HX.Float4)
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
    this._colliders = this.getEntitySet([RigidBodyComponent]);
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
    var component = entity.getFirstComponentByType(RigidBodyComponent);
    // for faster access
    this._components.push(component);

    this._world.addBody(component.body);
};

PhysicsSystem.prototype._onEntityRemoved = function()
{
    var component = entity.getFirstComponentByType(RigidBodyComponent);
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

exports.PhysicsSystem = PhysicsSystem;
exports.RigidBodyComponent = RigidBodyComponent;

Object.defineProperty(exports, '__esModule', { value: true });

})));
