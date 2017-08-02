import {Component} from "../../entity/Component";
import {MorphPose} from "./MorphPose";

/**
 * @classdesc
 * MorphAnimation is a {@linkcode Component} that can be added to ModelInstances to control morph target animations. The Mesh objects
 * used by the ModelInstance's Model must contain morph data generated with {@linkcode Mesh#generateMorphData}.
 * Up to 8 morph targets can be active at a time. If more morph targets have a weight assigned to them, only those with
 * the highest weight are used.
 *
 * @property {number} numMorphTargets The amount of morph targets in total (active and non-active).
 *
 *
 * @param {Array} [targets] An Array of {@linkcode MorphTarget} objects. If omitted, it will use the morph pose already
 * assigned to the entity (if any).
 * @constructor
 *
 * @see {@linkcode MorphPose}
 * @see {@linkcode MorphTarget}
 * @see {@linkcode Mesh#generateMorphData}
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MorphAnimation(targets)
{
    Component.call(this);

    // TODO: some day, morph pose could also become a tree using and generating poses?
    // for now, it's really just a Component-shaped wrapper for ModelInstance.morphPose
    if (targets) {
        this._hasOwn = true;
        this._morphPose = new MorphPose();
        for (var i = 0; i < targets.length; ++i) {
            this._morphPose.addMorphTarget(targets[i]);
        }
    }
    else
        this._hasOwn = false;
}

Component.create(MorphAnimation,
    {
        numMorphTargets: {
            get: function() { return this._morphPose.numMorphTargets; }
        }
    }
);

/**
 * Retrieves the morph target at the given index, as sorted by weight.
 * @param {Number} index The index of the morph target.
 * @returns {MorphTarget}
 */
MorphAnimation.prototype.getMorphTarget = function(index)
{
    return this._morphPose.getMorphTarget(index);
};


/**
 * Sets the weight of the morph target with the given name.
 * @param {string} name The name of the morph target to influence.
 * @param {number} value The new weight of the morph target.
 */
MorphAnimation.prototype.setWeight = function(name, value)
{
    this._morphPose.setWeight(name, value);
};

/**
 * @ignore
 */
MorphAnimation.prototype.onAdded = function()
{
    if (this._hasOwn)
        this.entity.morphPose = this._morphPose;
    else
        this._morphPose = this.entity.morphPose;
};

/**
 * @ignore
 */
MorphAnimation.prototype.onRemoved = function()
{
    if (this._hasOwn)
        this.entity.morphPose = null;
};

/**
 * @ignore
 */
MorphAnimation.prototype.onUpdate = function(dt)
{
    this._morphPose.update(dt);
};

export { MorphAnimation };