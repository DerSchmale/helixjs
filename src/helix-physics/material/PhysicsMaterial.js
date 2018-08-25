import * as CANNON from "cannon";

/**
 * PhysicsMaterial represents the physical "material" a RigidBody is made of, defining friction and restitution ("bounciness").
 * @param friction Defines how hard it is to move an object resting on this material.
 * @param restitution Defines how much an object that hits the material bounces.
 * @constructor
 */
function PhysicsMaterial(friction, restitution)
{
	this._cannonMaterial = new CANNON.Material({
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

export {PhysicsMaterial};