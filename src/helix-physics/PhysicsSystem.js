import * as CANNON from "cannon";
import * as HX from "helix";

import {RigidBody} from "./components/RigidBody";

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
    HX.EntitySystem.call(this)

    this._world = new CANNON.World();
    this._gravity = -9.81; // m/s²
    this._world.gravity.set(0, this._gravity, 0);
    this._world.solver.tolerance = .001;
    this._world.solver.iterations = 10;
    this._fixedTimeStep = 1000/60;
    this._friction = 0.0;
    this._world.broadphase = new CANNON.SAPBroadphase(this._world);

    // this._world.quatNormalizeFast = true;
    // this._world.quatNormalizeSkip = 8;

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

export {PhysicsSystem};