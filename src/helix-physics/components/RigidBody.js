import * as HX from "helix";
import {BoxCollider} from "../collider/BoxCollider";
import {SphereCollider} from "../collider/SphereCollider";

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
    HX.Component.call(this);
    this._collider = collider;
    this._body = null;

    this._mass = mass;

    this._linearDamping = 0.01;
    this._angularDamping = 0.01;
}


HX.Component.create(RigidBody, {
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

RigidBody.prototype.addImpulse = function(v, pos)
{
    this._body.applyImpulse(v, pos || this._body.position);
};

RigidBody.prototype.addForce = function(v, pos)
{
    this._body.applyForce(v, pos || this._body.position);
};

RigidBody.prototype.onAdded = function()
{
    this._createBody();
};

RigidBody.prototype.onRemoved = function()
{
};

RigidBody.prototype.prepTransform = function()
{
	var entity = this._entity;
	var body = this._body;

	var p = entity.position;
	var q = entity.rotation;

	var offs = this._collider._positionOffset;
	if (offs)
		body.position.set(p.x + offs.x, p.y + offs.y, p.z + offs.z);
	else
		body.position.set(p.x, p.y, p.z);

	body.quaternion.set(q.x, q.y, q.z, q.w);


};

RigidBody.prototype.applyTransform = function()
{
    if (this._mass === 0.0)
        return;

    var entity = this._entity;
    var body = this._body;

	if (this._collider._positionOffset)
		HX.Float4.subtract(body.position, this._collider._positionOffset, entity.position);
    else
        entity.position = body.position;

    entity.rotation = body.quaternion;


};

RigidBody.prototype._createBody = function()
{
    var entity = this._entity;

    var bounds;
    if (entity instanceof HX.ModelInstance) {
        bounds = entity.localBounds;
    }
    else {
        var matrix = new HX.Matrix4x4();
        matrix.inverseAffineOf(entity.worldMatrix);
        bounds = new HX.BoundingAABB();
        bounds.transformFrom(entity.worldBounds, matrix);
    }

    if (!this._collider)
        this._collider = bounds instanceof HX.BoundingAABB? new BoxCollider() : new SphereCollider();

    this._body = this._collider.createRigidBody(bounds);

    if (this._mass !== undefined)
        this._body.mass = this._mass;

    this._body.linearDamping = this._linearDamping;
    this._body.angularDamping = this._angularDamping;

    this._body.position.copy(entity.position);
    this._body.quaternion.copy(entity.rotation);
};

export {RigidBody};