function AudioTrigger()
{
    HX.Component.call(this);
}

AudioTrigger.prototype = Object.create(HX.Component.prototype);

AudioTrigger.prototype.onAdded = function()
{
    this.bindListener(HX_PHYS.RigidBody.COLLISION_MESSAGE, this.onCollision, this);
};

AudioTrigger.prototype.onRemoved = function()
{
    this.unbindListener(HX_PHYS.RigidBody.COLLISION_MESSAGE, this.onCollision);
};

AudioTrigger.prototype.onCollision = function(message, collision)
{
    var gain = collision.relativeVelocity.length * .5;
    if (gain < .001) return;
    this.broadcast(HX.AudioEmitter.PLAY_MESSAGE, "collision", gain);
};

HX.Component.register("audioTrigger", AudioTrigger);