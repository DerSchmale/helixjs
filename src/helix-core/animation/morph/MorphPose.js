import {Signal} from "../../core/Signal";


/**
 * @classdesc
 * MorphPose defines a certain configuration for blending several morph targets. While this can be used to directly
 * assign to a {@linkcode ModelInstance}, it's usually controlled through a component such as {@MorphAnimation}. Other
 * components could use several MorphPose objects in keyframes and tween between them over a timeline.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MorphPose()
{
    this._targets = [];
    this._weights = {};
    this._stateInvalid = true;
    this.onChange = new Signal();
}

MorphPose.prototype =
{
    /**
     * Gets the morph target as sorted by weight in update()
     * @param {number} index The index of the {@linkcode MorphTarget}
     * @returns {MorphTarget}
     */
    getMorphTarget: function(index)
    {
        return this._targets[index];
    },

    /**
     * The amount of morph targets used in this pose.
     * @returns {Number}
     */
    get numMorphTargets()
    {
        return this._targets.length;
    },

    /**
     * Adds a MorphTarget object to the pose.
     * @param {MorphTarget} morphTarget
     */
    addMorphTarget: function(morphTarget)
    {
        this._targets.push(morphTarget);
        this._weights[morphTarget.name] = 0.0;
        this._stateInvalid = true;
    },

    /**
     * Gets the weight of a morph target with the given name.
     * @param {string} name The name of the morph target.
     * @returns {number}
     */
    getWeight: function(name)
    {
        return this._weights[name];
    },

    /**
     * Sets the weight of a morph target with the given name.
     * @param {string} name The name of the morph target.
     * @param {number} value The new weight.
     */
    setWeight: function(id, value)
    {
        if (this._weights[id] !== value)
            this._stateInvalid = true;

        this._weights[id] = value;
    },

    /**
     * Updates the morph pose given the current weights. Usually called by a wrapping component. If no component is used,
     * update needs to be called manually.
     */
    update: function()
    {
        if (!this._stateInvalid) return;

        var w = this._weights;
        // sort by weights
        this._targets.sort(function(a, b) {
            return w[b.name] - w[a.name];
        });

        this._stateInvalid = false;

        this.onChange.dispatch();
    }
};

export  { MorphPose };