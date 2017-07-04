import {Signal} from "../../core/Signal";


/**
 * MorphPose defines a certain configuration for blending several morph targets.
 * TODO: If we'd ever have a morphing blend tree, these poses could be used to blend between different poses
 * (even if they have different targets, they could be considered to have weight 0 if absent from eachother)
 * @constructor
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
     * Gets the morph targets as sorted by weight in update()
     * @param index
     * @returns {*}
     */
    getMorphTarget: function(index)
    {
        return this._targets[index];
    },

    get numMorphTargets()
    {
        return this._targets.length;
    },

    addMorphTarget: function(morphTarget)
    {
        this._targets.push(morphTarget);
        this._weights[morphTarget.name] = 0.0;
        this._stateInvalid = true;
    },

    getWeight: function(id)
    {
        return this._weights[id];
    },

    setWeight: function(id, value)
    {
        if (this._weights[id] !== value)
            this._stateInvalid = true;

        this._weights[id] = value;
    },

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