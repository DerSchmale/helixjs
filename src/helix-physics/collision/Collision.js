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
export function Collision()
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