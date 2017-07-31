import * as CANNON from "cannon";
import * as HX from "helix";

// TODO: should replace colliderType with custom bounds
// so we could pass in SphereBounds

function RigidBodyComponent(colliderType, mass)
{
    HX.Component.call(this);
    this._type = colliderType || RigidBodyComponent.TYPE_AUTO;
    this._body = null;

    if (colliderType === RigidBodyComponent.TYPE_INFINITE_PLANE)
        this._mass = 0;

    this._linearDamping = 0.01;
    this._angularDamping = 0.01;

    this._mass = mass;
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

    entity.position = body.position;
    entity.rotation = body.quaternion;
};

RigidBodyComponent.prototype._createBody = function()
{
    var entity = this._entity;

    var bounds = entity.localBounds;

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

    this._body = new CANNON.Body({
        mass: this._mass
    });

    this._body.linearDamping = this._linearDamping;
    this._body.angularDamping = this._angularDamping;

    this._body.addShape(shape, bounds.center);

    this._body.position.copy(entity.position);

    if (type === RigidBodyComponent.TYPE_INFINITE_PLANE)
        this._body.quaternion.setFromAxisAngle(HX.Float4.X_AXIS, -Math.PI * .5);
    else
        this._body.quaternion.copy(entity.rotation);
};

export {RigidBodyComponent};