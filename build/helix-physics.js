(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('helix'), require('cannon')) :
	typeof define === 'function' && define.amd ? define('HX_PHYS', ['exports', 'helix', 'cannon'], factory) :
	(factory((global.HX_PHYS = {}),global.HX,global.CANNON));
}(this, (function (exports,HX,CANNON$1) { 'use strict';

	function SubShape(shape, offset, orientation)
	{
		this.shape = shape;
		this.offset = offset || new HX.Float4();
		this.orientation = orientation;
	}

	function CompoundShape()
	{
		this._shapes = [];
	}

	CompoundShape.prototype = {
		get shapes() { return this._shapes; },

		addShape: function(shape, offset, orientation)
		{
			this._shapes.push(new SubShape(shape, offset, orientation));
		}
	};

	/**
	 * @ignore
	 *
	 * @author derschmale <http://www.derschmale.com>
	 */
	function Collider()
	{
	    // these can optionally be set by subclasses
	    // center is the local object space center of mass (ie: an offset of the entity's origin). When allowed to auto-calculate, it uses the bounding box center
	    // orientation allows
	    this._center = null;
	    this._orientation = null;
	}

	Collider.prototype = {

	    /**
	     * @ignore
	     */
	    createRigidBody: function(bounds)
	    {
	        if (!this._center)
	            this._center = bounds.center;

	        var shape = this.createShape(bounds);
	        var body = new CANNON$1.Body({
	            mass: 50 * this.volume()
	        });

	        if (shape instanceof CompoundShape) {
	            var shapes = shape.shapes;
	            for (var i = 0; i < shapes.length; ++i) {
	                var subShape = shapes[i];
	                var c = HX.Float4.add(this._center, subShape.offset);
	                var q = undefined;
	                if (this._orientation) {
	                    q = this._orientation.clone();
	                }
	                if (subShape.orientation) {
	                    if (q)
	                        q.append(subShape.orientation);
	                    else
	                        q = subShape.orientation.clone();
	                }

				    body.addShape(subShape.shape, c, q);
				}
	        }
	        else
	            body.addShape(shape, this._center, this._orientation);

	        return body;
	    },

		/**
		 * @ignore
	     */
	    createShape: function(bounds)
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
	        this._halfExtents = HX.Float4.subtract(max, min).scale(.5);
	        this._center = HX.Float4.add(max, min).scale(.5);
	    }
	}

	BoxCollider.prototype = Object.create(Collider.prototype);

	BoxCollider.prototype.volume = function()
	{
	    return 8 * (this._halfExtents.x * this._halfExtents.y * this._halfExtents.z);
	};

	BoxCollider.prototype.createShape = function(bounds)
	{
	    if (!this._halfExtents)
	        this._halfExtents = bounds.getHalfExtents();

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
	}

	SphereCollider.prototype = Object.create(Collider.prototype);

	SphereCollider.prototype.volume = function()
	{
	    var radius = this._radius;
	    return .75 * Math.PI * radius * radius * radius;
	};

	SphereCollider.prototype.createShape = function(bounds)
	{
	    this._radius = this._radius || bounds.getRadius();
	    return new CANNON$1.Sphere(this._radius);
	};

	/**
	 * @classdesc
	 *
	 * Collision contains all data to describe a collision of 2 RigidBody components.
	 *
	 * @property rigidBody The RigidBody that collided with the collision message emitter.
	 * @property entity The Entity that collided with the collision message emitter.
	 * @propety contactPoints An Array of {@linkcode Contact} objects, describing the contacts in detail.
	 *
	 * @constructor
	 */
	function Collision()
	{
	    /**
	     * The RigidBody that collided with the rigid body broadcasting the collision message.
	     */
	    this.rigidBody = null;

	    /**
	     * The entity that collided with the rigid body broadcasting the collision message.
	     */
	    this.entity = null;

	    /**
	     * The world-space contact point of the collision for the rigid body broadcasting the collision message.
	     */
	    this.contactPoint = new HX.Float4(0, 0, 0, 1);

	    /**
	     * The contact normal of the collision, pointing out of the rigid body broadcasting the collision message.
	     */
	    this.contactNormal = new HX.Float4(0, 0, 0, 0);

	    /**
	     * The relative velocity between the two collisions (broadcaster.velocity - other.velocity)
	     */
	    this.relativeVelocity = new HX.Float4(0, 0, 0, 0);
	}

	var invMatrix = new HX.Matrix4x4();
	var worldQuat = new HX.Quaternion();

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
	 * @property {Float4} angularVelocity The current angular velocity of the rigid body.
	 * @property {Float4} linearVelocity The current linear velocity of the rigid body.
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

	    this._linearVelocity = new HX.Float4();
	    this._angularVelocity = new HX.Float4();

	    this._collision = new Collision();

	    this._onCollision = this._onCollision.bind(this);
	}

	/**
	 * The name of the message broadcast by this component
	 */
	RigidBody.COLLISION_MESSAGE = "collision";

	HX.Component.create(RigidBody, {
	    linearVelocity: {
	        get: function()
	        {
	            // change to Float4
	            this._linearVelocity.copyFrom(this._body.velocity);
	            return this._linearVelocity;
	        },

	        set: function(value)
	        {
	            this._body.velocity.set(value.x, value.y, value.z);
	        }
	    },

	    angularVelocity: {
	        get: function()
	        {
	            // change to Float4
	            this._angularVelocity.copyFrom(this._body.angularVelocity);
	            return this._angularVelocity;
	        },

	        set: function(value)
	        {
	            this._body.angularVelocity.set(value.x, value.y, value.z);
	        }
	    },

		isKinematic: {
			get: function()
			{
				return this._isKinematic;
			},

			set: function(value)
			{
				this._isKinematic = value;

				if (this._body) {
	                this._body.type = CANNON.Body.KINEMATIC;
	                this._body.allowSleep = false;
	                this._body.wakeUp();
	            }
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
	    this._body.addEventListener("collide", this._onCollision);
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
		var bodyPos = body.position;
	    var bodyQuat = body.quaternion;
	    var worldMatrix = entity.worldMatrix;

	    worldMatrix.getColumn(3, bodyPos);

		if (this._ignoreRotation)
	        bodyQuat.set(0, 0, 0, 1);
		else {
	        var q;
	        if (entity._isOnRoot)
	            q = entity.rotation;
	        else {
	            q = worldQuat;
	            q.fromMatrix(worldMatrix);
	        }
	        bodyQuat.copy(q);
		}
	};

	RigidBody.prototype.applyTransform = function()
	{
	    var body = this._body;

	    // no need to update static and kinematic objects, since they don't get moved by the physics engine
	    // also not required to update objects if they're not "awake" (means they haven't moved)
	    if (this._mass === 0.0 || this._isKinematic || body.sleepState !== CANNON.Body.AWAKE)
	        return;

	    var entity = this._entity;

	    // let's not invalidate the whole time
	    entity.disableMatrixUpdates();

	    if (entity._isOnRoot) {
	        entity.position = body.position;

	        if (!this._ignoreRotation)
	            entity.rotation = body.quaternion;
	    }
	    else {
	        invMatrix.inverseAffineOf(entity._parent.worldMatrix);
	        invMatrix.transformPoint(body.position, entity.position);

	        // if (!this._ignoreRotation)
	            invMatrix.transformQuaternion(body.quaternion, entity.rotation);
	    }

	    entity.enableMatrixUpdates();
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

	    if (this._isKinematic) {
	        this._body.type = CANNON.Body.KINEMATIC;
	        this._body.allowSleep = false;
	    }

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
	        b = contact.bi.position;
	        r = contact.ri;
	        collision.contactNormal.set(n.x, n.y, n.z);
	    }
	    else {
	        v1 = contact.bj.velocity;
	        v2 = contact.bi.velocity;
	        b = contact.bj.position;
	        r = contact.rj;
	        collision.contactNormal.set(-n.x, -n.y, -n.z);
	    }

	    collision.relativeVelocity.set(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z, 0.0);
	    collision.contactPoint.set(b.x + r.x, b.y + r.y, b.z + r.z, 1.0);

	    this.broadcast(RigidBody.COLLISION_MESSAGE, collision);
	};

	/**
	 * @classdesc
	 * PhysicsSystem is an {@linkcode EntitySystem} allowing physics simulations (based on cannonjs).
	 *
	 * @property fixedTimeStep If 0, it uses the frame delta times which is not recommended for stability reasons.
	 * @constructor
	 *
	 * @author derschmale <http://www.derschmale.com>
	 */
	function PhysicsSystem()
	{
	    HX.EntitySystem.call(this);

	    this._world = new CANNON$1.World();
	    this._gravity = -9.81; // m/s²
	    this._world.gravity.set(0, 0, this._gravity);
	    this._world.solver.tolerance = .0001;
	    this._world.solver.iterations = 10;
	    this._fixedTimeStep = 1000/60;
	    this._world.broadphase = new CANNON$1.SAPBroadphase(this._world);
	    this._world.allowSleep = true;
	    // this._world.broadphase = new CANNON.NaiveBroadphase(this._world);

	    // this._world.quatNormalizeFast = true;
	    // this._world.quatNormalizeSkip = 2;

	    // this._world.addEventListener("collide", this._onCollision.bind(this));

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
	    },

	    allowSleep: {
	        get: function() {
	            return this._world.allowSleep;
	        },

	        set: function(value) {
	            this._world.allowSleep = value;
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
		this._colliders.free();
		this._colliders = null;
	};

	PhysicsSystem.prototype._onEntityAdded = function(entity)
	{
	    var component = entity.getFirstComponentByType(RigidBody);
	    // for faster access
	    this._components.push(component);

	    this._world.addBody(component.body);
	};

	PhysicsSystem.prototype._onEntityRemoved = function(entity)
	{
	    var component = entity.getFirstComponentByType(RigidBody);
	    this._world.removeBody(component.body);
	    var index = this._components.indexOf(component);
	    this._components.splice(index, 1);
	};

	// we're updating here to enforce order of updates
	PhysicsSystem.prototype.onUpdate = function(dt)
	{
		var len = this._components.length;

		for (var i = 0; i < len; ++i) {
			this._components[i].prepTransform();
		}

	    this._world.step(this._fixedTimeStep * .001);

	    for (i = 0; i < len; ++i) {
	        this._components[i].applyTransform();
	    }
	};

	/**
	 * @classdesc
	 *
	 * A capsule-shaped collider.
	 *
	 * @constructor
	 *
	 * @param {number} [radius] The radius of the capsule. If omitted, will use the object bounds.
	 * @param {number} [height] The height of the capsule. If omitted, will use the object bounds.
	 *
	 * @author derschmale <http://www.derschmale.com>
	 */
	function CapsuleCollider(radius, height, center)
	{
	    Collider.call(this);
	    this._radius = radius;
	    this._height = height;
	    this._center = center;
	    if (this._height < 2.0 * this._radius) this._height = 2.0 * this._radius;
	}

	CapsuleCollider.prototype = Object.create(Collider.prototype);

	CapsuleCollider.prototype.volume = function()
	{
	    var radius = this._radius;
	    var cylHeight = this._height - 2 * this._radius;
	    var sphereVol = .75 * Math.PI * radius * radius * radius;
	    var cylVol = Math.PI * radius * radius * cylHeight;
	    return cylVol + sphereVol;
	};

	CapsuleCollider.prototype.createShape = function(bounds)
	{
	    if (!this._height)
	        this._height = bounds.halfExtents.y * 2.0;

		var cylHeight = this._height - 2 * this._radius;

	    if (!this._radius) {
	        var f = new HX.Float2();
	        f.set(bounds.halfExtents); // copy X and Y
	        this._radius = f.length;
	    }

	    var shape = new CompoundShape();
	    var sphere = new CANNON$1.Sphere(this._radius);
		shape.addShape(sphere, new HX.Float4(0, 0, -cylHeight * .5));
		shape.addShape(sphere, new HX.Float4(0, 0, cylHeight * .5));
		shape.addShape(new CANNON$1.Cylinder(this._radius, this._radius, cylHeight, 10));
	    return shape;
	};

	/**
	 * @classdesc
	 *
	 * A capsule-shaped collider.
	 *
	 * @constructor
	 *
	 * @param {number} [radius] The radius of the cylinder. If omitted, will use the object bounds.
	 * @param {number} [height] The height of the cylinder. If omitted, will use the object bounds.
	 *
	 * @author derschmale <http://www.derschmale.com>
	 */
	function CylinderCollider(radius, height, mainAxis, center)
	{
	    Collider.call(this);
	    this._radius = radius;
	    this._height = height;
	    this._center = center;

	    if (mainAxis) {
	        mainAxis.normalize();
	        this._orientation = HX.Quaternion.fromVectors(HX.Float4.Z_AXIS, mainAxis);
	    }
	}

	CylinderCollider.prototype = Object.create(Collider.prototype);

	CylinderCollider.prototype.volume = function()
	{
	    return Math.PI * this._radius * this._radius * this._height;
	};

	CylinderCollider.prototype.createShape = function(bounds)
	{
	    if (!this._radius) {
	        var f = new HX.Float2();

	        f.set(bounds.halfExtent); // copy X and Y
	        this._radius = f.length;
	    }

	    if (!this._height)
	        this._height = bounds.halfExtent.z * 2.0;

	    return new CANNON$1.Cylinder(this._radius, this._radius, this._height, 10);
	};

	/**
	 * @classdesc
	 *
	 * A box-shaped collider with the "walls" pointing to the inside
	 *
	 * @constructor
	 *
	 * @param {Float4} [thickness] The thickness of the box walls. Defaults to .1
	 * @param {Float4} [min] The minimum coordinates of the box in local object space. If omitted, will use the object bounds.
	 * @param {Float4} [max] The maximum coordinates of the box in local object space. If omitted, will use the object bounds.
	 *
	 * @author derschmale <http://www.derschmale.com>
	 */
	function InvertedBoxCollider(thickness, min, max)
	{
	    Collider.call(this);

	    this._thickness = thickness || .1;

	    if (min && max) {
	        this._halfExtents = HX.Float4.subtract(max, min).scale(.5);
	        this._center = HX.Float4.add(max, min).scale(.5);
	    }
	}

	InvertedBoxCollider.prototype = Object.create(Collider.prototype);

	InvertedBoxCollider.prototype.volume = function()
	{
	    return 8 * (this._halfExtents.x * this._halfExtents.y * this._halfExtents.z);
	};

	InvertedBoxCollider.prototype.createShape = function(bounds)
	{
	    if (!this._halfExtents)
	        this._halfExtents = bounds.getHalfExtents();

	    var shape = new CompoundShape();
	    var t = this._thickness;
	    var th = t * .5;
	    var he = this._halfExtents;

	    shape.addShape(new CANNON$1.Box(new CANNON$1.Vec3(th, he.y + t, he.z)), new CANNON$1.Vec3(he.x + th, 0, 0));         // posX
	    shape.addShape(new CANNON$1.Box(new CANNON$1.Vec3(th, he.y + t, he.z)), new CANNON$1.Vec3(-(he.x + th), 0, 0));      // negX
	    shape.addShape(new CANNON$1.Box(new CANNON$1.Vec3(he.x + t, th, he.z)), new CANNON$1.Vec3(0, he.y + th, 0));         // posY
	    shape.addShape(new CANNON$1.Box(new CANNON$1.Vec3(he.x + t, th, he.z)), new CANNON$1.Vec3(0, -(he.y + th), 0));      // negY
	    shape.addShape(new CANNON$1.Box(new CANNON$1.Vec3(he.x, he.y, th)), new CANNON$1.Vec3(0, 0, he.z + th));         // posZ
	    shape.addShape(new CANNON$1.Box(new CANNON$1.Vec3(he.x, he.y, th)), new CANNON$1.Vec3(0, 0, -(he.z + th)));      // negZ

	    return shape;
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
	    if (height) this._center = new HX.Float4(0, 0, height);
	}

	InfinitePlaneCollider.prototype = Object.create(Collider.prototype);

	InfinitePlaneCollider.prototype.volume = function()
	{
	    return 0;
	};

	InfinitePlaneCollider.prototype.createShape = function(bounds)
	{
	    return new CANNON$1.Plane();
	};

	/**
	 *
	 * @param {Array|Texture2D} heightData An Array containing numbers, or a Texture2D containing texture data (this can be slow because of the data that needs to be read back).
	 * @param {number} worldSize The size of the height map width in world coordinates
	 * @param {number} minHeight The minimum height in the heightmap (only used if heightData is a texture)
	 * @param {number} maxHeight The maximum height in the heightmap (only used if heightData is a texture)
	 * @param {boolean} rgbaEnc Indicates the data in the texture are [0 - 1] numbers encoded over the RGBA channels (only used if heightData is a texture)
	 * @constructor
	 */
	function HeightfieldCollider(heightData, worldSize, minHeight, maxHeight, rgbaEnc)
	{
		Collider.call(this);

		if (heightData instanceof HX.Texture2D) {
			if (maxHeight === undefined) maxHeight = 1;
			if (minHeight === undefined) minHeight = 0;

			this._heightData = this._convertHeightMap(heightData, maxHeight - minHeight, rgbaEnc);
		}
		else {
			this._heightData = heightData;
			minHeight = this._shiftHeightData();
		}

		this._heightMapWidth = this._heightData.length;
		this._heightMapHeight = this._heightData[0].length;
		this._worldSize = worldSize;
		this._elementSize = this._worldSize / (this._heightMapWidth - 1);
		this._center = new HX.Float4(-this._elementSize * this._heightMapWidth * .5, -this._elementSize * this._heightMapHeight * .5, minHeight, 0);
	}

	HeightfieldCollider.prototype = Object.create(Collider.prototype);

	HeightfieldCollider.prototype.volume = function ()
	{
		return 0;
	};

	HeightfieldCollider.prototype.createShape = function (bounds)
	{
		return new CANNON$1.Heightfield(this._heightData, {
			elementSize: this._elementSize
		});
	};

	/**
	 * @private
	 * @ignore
	 */
	HeightfieldCollider.prototype._convertHeightMap = function (map, scale, rgbaEnc)
	{
		var w = map.width;
		var h = map.height;
		var tex = new HX.Texture2D();
		tex.initEmpty(w, h, HX.TextureFormat.RGBA, map.dataType);
		var fbo = new HX.FrameBuffer(tex);
		fbo.init();
		HX.GL.setRenderTarget(fbo);
		HX.GL.clear();
		HX.BlitTexture.execute(map);

		var len = w * h * 4;

		var data;
		if (map.dataType === HX.DataType.FLOAT)
			data = new Float32Array(len);
		else if (map.dataType === HX.DataType.UNSIGNED_BYTE)
			data = new Uint8Array(len);
		else
			throw new Error("Invalid dataType!");

		HX.GL.gl.readPixels(0, 0, w, h, HX.TextureFormat.RGBA, map.dataType, data);

		var arr = [];

		if (rgbaEnc) scale /= 255.0;

		for (var x = 0; x < w; ++x) {
			arr[x] = [];
			for (var y = 0; y < h; ++y) {
				// var y2 = h - y - 1;
				// var x2 = w - x - 1;
				var i = (x + y * w) << 2;
				var val = data[i];

				if (rgbaEnc)
					val += data[i + 1] / 255.0 + data[i + 2] / 65025.0 + data[i + 3] / 16581375.0;

				arr[x][y] = val * scale;
			}
		}

		return arr;
	};

	HeightfieldCollider.prototype._shiftHeightData = function()
	{
		var data = this._heightData;
		var w = data.width;
		var h = data.height;

		var minZ = 0.0;

		for (var x = 0; x < w; ++x) {
			for (var y = 0; y < h; ++y) {
				if (data[x][y] < minZ) {
					minZ = data[x][y];
				}
			}
		}

		if (minZ === 0.0) return;

		for (x = 0; x < w; ++x) {
			for (y = 0; y < h; ++y) {
				data[x][y] += minZ;
			}
		}

		return minZ;
	};

	/**
	 * PhysicsMaterial represents the physical "material" a RigidBody is made of, defining friction and restitution ("bounciness").
	 * @param friction Defines how hard it is to move an object resting on this material.
	 * @param restitution Defines how much an object that hits the material bounces.
	 * @constructor
	 */
	function PhysicsMaterial(friction, restitution)
	{
		this._cannonMaterial = new CANNON$1.Material({
			friction: friction,
			restitution: restitution
		});
	}

	PhysicsMaterial.prototype = {
		/**
		 * Defines how hard it is to move an object resting on this material.
		 */
		get friction()
		{
			return this._cannonMaterial.friction;
		},

		set friction(value)
		{
			this._cannonMaterial.friction = value;
		},

		/**
		 * The "bounciness" of this material.
		 */
		get restitution()
		{
			return this._cannonMaterial.restitution;
		},

		set restitution(value)
		{
			this._cannonMaterial.restitution = value;
		}
	};

	exports.PhysicsSystem = PhysicsSystem;
	exports.RigidBody = RigidBody;
	exports.BoxCollider = BoxCollider;
	exports.CapsuleCollider = CapsuleCollider;
	exports.CylinderCollider = CylinderCollider;
	exports.InvertedBoxCollider = InvertedBoxCollider;
	exports.SphereCollider = SphereCollider;
	exports.InfinitePlaneCollider = InfinitePlaneCollider;
	exports.HeightfieldCollider = HeightfieldCollider;
	exports.PhysicsMaterial = PhysicsMaterial;
	exports.Collision = Collision;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
