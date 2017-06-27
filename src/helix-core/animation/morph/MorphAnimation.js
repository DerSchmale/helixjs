/**
 *
 * @constructor
 */
HX.MorphAnimation = function(targets)
{
    HX.Component.call(this);

    // some day, morph pose could also become a tree using and generating poses?
    this._morphPose = new HX.MorphPose();
    for (var i = 0; i < targets.length; ++i) {
        this._morphPose.addMorphTarget(targets[i]);
    }
};

HX.MorphAnimation.prototype = Object.create(HX.Component.prototype,
    {
        numMorphTargets: {
            get: function() { return this._morphPose.numMorphTargets; }
        }
    }
);

HX.MorphAnimation.prototype.getMorphTarget = function(index)
{
    return this._morphPose.getMorphTarget(index);
};

HX.MorphAnimation.prototype.setWeight = function(id, value)
{
    this._morphPose.setWeight(id, value);
};

HX.MorphAnimation.prototype.onAdded = function()
{
    this.entity.morphPose = this._morphPose;
};

HX.MorphAnimation.prototype.onRemoved = function()
{
    this.entity.morphPose = null;
};

HX.MorphAnimation.prototype.onUpdate = function(dt)
{
    this._morphPose.update(dt);
};