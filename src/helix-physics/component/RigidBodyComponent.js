import * as CANNON from "cannon";
import * as HX from "helix";

// TODO: Rename to RigidBodyComponent?

function RigidBodyComponent(colliderType, mass)
{
    HX.Component.call(this);
    this._type = colliderType || RigidBodyComponent.TYPE_AUTO;
    this._body = null;

    if (colliderType === RigidBodyComponent.TYPE_INFINITE_PLANE)
        this._mass = 0;

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
    // rotate around COM:
    matrix.prependTranslation(this._COMOffset);
    matrix.appendTranslation(this._COMOffset);
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
        shape: shape
    });

    this._body.position.copy(centerOfMass);

    if (type === RigidBodyComponent.TYPE_INFINITE_PLANE) {
        this._body.quaternion.setFromAxisAngle(HX.Float4.X_AXIS, -Math.PI * .5);
    }

    HX.Float4.subtract(entity.position, centerOfMass, this._COMOffset);
};

export {RigidBodyComponent};