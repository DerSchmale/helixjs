import * as HX from "helix";
import {BoxCollider} from "../collider/BoxCollider";
import {SphereCollider} from "../collider/SphereCollider";
import {Collision} from "../collision/Collision";

/**
 * @classdesc
 * RigidBody is a component allowing a scene graph object to have physics simulations applied to it. Requires
 * {@linkcode PhysicsSystem}. At this point, entities using RigidBody need to be added to the root of the scenegraph (or
 * have parents without transformations)! Broadcasts a "collision" message on the Entity when a collision occurs with a
 * Collision object as parameter. This Collision object is shared across collisions and therefor is only valid in the
 * callback method.
 *
 * @property {boolean} isKinematic When set to true, the user indicates the position of the object will be updated
 * manually as opposed to by the physics engine.
 * @property {boolean} ignoreRotation When set to true, the rigid body does not take on the rotation of its entity. This
 * is useful for a player controller camera.
 * @property {Number} ignoreRotation The mass of the target object.
 * @property {Number} linearDamping How much an object linear movement slows down over time
 * @property {Number} angularDamping How much an object rotational movement slows down over time
 * @property {PhysicsMaterial} material The PhysicsMaterial defining friction and restitution.
 *
 * @constructor
 * @param collider The Collider type describing the shape of how to object interacts with the world. If omitted, it will
 * take a shape based on the type of bounds assigned to the target object.
 * @param mass The mass of the target object. If omitted, it will venture a guess based on the bounding volume.*
 * @param material An optional PhysicsMaterial defining the friction and restitution parameters of the surface
 *
 * @author derschmale <http://www.derschmale.com>
 */
function RigidBody(collider, mass, material)
{
    HX.Component.call(this);

    this._collider = collider;
    this._body = null;
    this._ignoreRotation = false;
    this._isKinematic = false;

    this._mass = mass;

    this._linearDamping = 0.01;
    this._angularDamping = 0.01;
	this._material = material;

    this._collision = new Collision();

    this._onCollision = this._onCollision.bind(this);
}

/**
 * The name of the message broadcast by this component
 */
RigidBody.COLLISION_MESSAGE = "collision";

HX.Component.create(RigidBody, {
	isKinematic: {
		get: function()
		{
			return this._isKinematic;
		},

		set: function(value)
		{
			this._isKinematic = value;

			if (this._body)
				this._body.type = CANNON.Body.KINEMATIC;
		}
	},
	ignoreRotation: {
        get: function()
        {
            return this._ignoreRotation;
        },

        set: function(value)
        {
			this._ignoreRotation = value;

			// disable rotational physics altogether
			if (this._body)
				this._body.fixedRotation = value;
			// 	this._body.angularDamping = value? 1.0 : this._angularDamping;
        }
    },

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
            if (this._body) {
				this._body.mass = value;
				this._body.updateMassProperties();
			}
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

			// disable rotational physics altogether if ignoreRotation is set
			// if (this._body)
            	// this._body.angularDamping = this._ignoreRotation? 1.0 : value;
        }
    },

    material: {
	    get: function()
        {
            return this._material;
        },

        set: function(value)
        {
            this._material = value;

            if (this._body)
            	this._body.material = value? value._cannonMaterial : null;
        }
    }
});

RigidBody.prototype.addImpulse = function(v, pos)
{
	if (pos) {
		this._body.applyImpulse(v, pos);
	}
	else {
		var vel = this._body.velocity;
		vel.x += v.x;
		vel.y += v.y;
		vel.z += v.z;
	}

	this._body.wakeUp();
};

RigidBody.prototype.addForce = function(v, pos)
{
    if (pos) {
		this._body.applyForce(v, pos);
	}
	else {
        var f = this._body.force;
        f.x += v.x;
        f.y += v.y;
        f.z += v.z;
    }

	this._body.wakeUp();
};

RigidBody.prototype.onAdded = function()
{
    this._createBody();
};

RigidBody.prototype.onRemoved = function()
{
    this._body.removeEventListener("collide", this._onCollision);
    this._body = null;
};

RigidBody.prototype.prepTransform = function()
{
	var entity = this._entity;
	var body = this._body;

	var p = entity.position;

	var offs = this._collider._positionOffset;
	if (offs)
		body.position.set(p.x + offs.x, p.y + offs.y, p.z + offs.z);
	else
		body.position.set(p.x, p.y, p.z);

	if (this._ignoreRotation) {
		body.quaternion.set(0, 0, 0, 1);
	}
	else {
		var q = entity.rotation;
		body.quaternion.set(q.x, q.y, q.z, q.w);
	}
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

    if (!this._ignoreRotation)
        entity.rotation = body.quaternion;
};

RigidBody.prototype._createBody = function()
{
    var entity = this._entity;

    var meshInstances = entity.getComponentsByType(HX.MeshInstance);
    var numMeshes = meshInstances.length;

    // use the same bounding type if it's the only mesh
	var bounds = numMeshes === 1? meshInstances[0].mesh.bounds : entity.bounds;

    if (!this._collider)
        this._collider = bounds instanceof HX.BoundingAABB? new BoxCollider() : new SphereCollider();

    this._body = this._collider.createRigidBody(bounds);
    this._body._hx_rigidBody = this;
    this._body.addEventListener("collide", this._onCollision);

    if (this._isKinematic)
		this._body.type = CANNON.Body.KINEMATIC;

    if (this._mass !== undefined)
        this._body.mass = this._mass;

    if (this._material !== undefined)
		this._body.material = this._material._cannonMaterial;

    this._body.linearDamping = this._linearDamping;
    this._body.angularDamping = this._angularDamping;

    this._body.position.copy(entity.position);

	this._body.fixedRotation = this._ignoreRotation;
    if (!this._ignoreRotation)
        this._body.quaternion.copy(entity.rotation);

	this._body.updateMassProperties();
};

RigidBody.prototype.clone = function()
{
	var clone = new RigidBody(this._collider, this._mass, this._material);
	clone.linearDamping = this.linearDamping;
	clone.angularDamping = this.angularDamping;
	clone.isKinematic = this._isKinematic;
	return clone;
};

RigidBody.prototype._onCollision = function(event)
{
    // no use notifying about collisions
    if (!this.hasListeners(RigidBody.COLLISION_MESSAGE)) return;

    var collision = this._collision;
    var other = event.body._hx_rigidBody;
    var contact = event.contact;

    collision.rigidBody = other;
    collision.entity = other._entity;

    var b, r, v1, v2;
    var n = contact.ni;

    if (contact.bi === this._body) {
        v1 = contact.bi.velocity;
        v2 = contact.bj.velocity;
        b = contact.bi;
        r = contact.ri;
        collision.contactNormal.set(n.x, n.y, n.z);
    }
    else {
        v1 = contact.bj.velocity;
        v2 = contact.bi.velocity;
        b = contact.bj;
        r = contact.rj;
        collision.contactNormal.set(-n.x, -n.y, -n.z);
    }

    collision.relativeVelocity.set(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z, 0.0);
    collision.contactPoint.set(b.x + r.x, b.y + r.y, b.z + r.z, 1.0);

    this.broadcast(RigidBody.COLLISION_MESSAGE, collision);
};

export {RigidBody};