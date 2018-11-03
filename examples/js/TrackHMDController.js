/**
 * @classdesc
 *
 * TrackedController is a Component that allows entities to track a gamepad's orientation, usually used for VR controllers.
 *
 * @param gamepad The gamepad
 * @constructor
 */
function TrackHMDController(vrCamera)
{
    HX.Component.call(this);
    this._vrCamera = vrCamera;
}

TrackHMDController.prototype = Object.create(HX.Component.prototype);

TrackHMDController.prototype.onUpdate = function(dt)
{
    var m1 = this._vrCamera.worldMatrixLeft;
    var m2 = this._vrCamera.worldMatrixRight;

    var entity = this.entity;

    entity.disableMatrixUpdates();
    m1.getColumn(3, entity.position);
    var p = m2.getColumn(3);
    entity.position.add(p);
    entity.position.scale(.5);
    entity.enableMatrixUpdates();
};

HX.Component.register("trackHMDController", TrackHMDController);