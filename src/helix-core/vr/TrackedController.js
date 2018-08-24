import {Component} from "../entity/Component";

/**
 * @classdesc
 *
 * TrackedController is a Component that allows entities to track a gamepad's orientation, usually used for VR controllers.
 *
 * @param gamepad The gamepad
 * @constructor
 */
function TrackedController(gamepad)
{
    Component.call(this);
    this._gamepad = gamepad;
}

Component.create(TrackedController);

TrackedController.prototype.onUpdate = function(dt)
{
    var entity = this._entity;
    var gamepad = this._gamepad;

    if (!(gamepad.hasPosition && gamepad.hasRotation)) {
        entity.visible = false;
        return;
    }

    entity.visible = true;
    entity.position = gamepad.position;
    entity.rotation = gamepad.rotation;

    // TODO: Provide a HX_PHYS.TrackedController version of this: if there's a RigidBody attached, set the velocities and accelerations
    // onAdded, should set kinetic = true
};

export { TrackedController };