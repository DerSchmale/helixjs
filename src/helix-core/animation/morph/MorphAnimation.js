/**
 *
 * @constructor
 */
import {Component} from "../../entity/Component";
import {MorphPose} from "./MorphPose";

function MorphAnimation(targets)
{
    Component.call(this);

    // some day, morph pose could also become a tree using and generating poses?
    this._morphPose = new MorphPose();
    for (var i = 0; i < targets.length; ++i) {
        this._morphPose.addMorphTarget(targets[i]);
    }
};

MorphAnimation.prototype = Object.create(Component.prototype,
    {
        numMorphTargets: {
            get: function() { return this._morphPose.numMorphTargets; }
        }
    }
);

MorphAnimation.prototype.getMorphTarget = function(index)
{
    return this._morphPose.getMorphTarget(index);
};

MorphAnimation.prototype.setWeight = function(id, value)
{
    this._morphPose.setWeight(id, value);
};

MorphAnimation.prototype.onAdded = function()
{
    this.entity.morphPose = this._morphPose;
};

MorphAnimation.prototype.onRemoved = function()
{
    this.entity.morphPose = null;
};

MorphAnimation.prototype.onUpdate = function(dt)
{
    this._morphPose.update(dt);
};

export { MorphAnimation };