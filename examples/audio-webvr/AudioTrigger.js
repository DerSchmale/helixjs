function AudioTrigger()
{
    HX.Component.call(this);
}

HX.Component.create(AudioTrigger);

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
    var gain = collision.relativeVelocity.length * .006;
    if (gain < .001) return;
    this.broadcast(HX.AudioEmitter.PLAY_MESSAGE, "collision");
};