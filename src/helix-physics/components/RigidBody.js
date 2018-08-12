import * as HX from "helix";
import {BoxCollider} from "../collider/BoxCollider";
import {SphereCollider} from "../collider/SphereCollider";

/**
 * @classdesc
 * RigidBody is a component allowing a scene graph object to have physics simulations applied to it. Requires
 * {@linkcode PhysicsSystem}. At this point, entities using RigidBody need to be added to the root of the scenegraph (or
 * have parents without transformations)!
 *
 * @property {boolean} ignoreRotation When set to true, the rigid body does not take on the rotation of its entity. This is useful
 * for a player controller camera.
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

    this._mass = mass;

    this._linearDamping = 0.01;
    this._angularDamping = 0.01;
	this._material = material;
}


HX.Component.create(RigidBody, {
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
    // if no position is set, just
	if (pos) {
		this._body.applyImpulse(v, pos);
		this._body.wakeUp();
	}
	else {
		var vel = this._body.velocity;
		vel.x += v.x;
		vel.y += v.y;
		vel.z += v.z;
	}
};

RigidBody.prototype.addForce = function(v, pos)
{
    if (pos) {
		this._body.applyForce(v, pos);
		this._body.wakeUp();
	}
	else {
        var f = this._body.force;
        f.x += v.x;
        f.y += v.y;
        f.z += v.z;
    }
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

export {RigidBody};