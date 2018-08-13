import {Signal} from "../../core/Signal";


/**
 * @classdesc
 * MorphPose defines a certain configuration for blending several morph targets. While this can be used to directly
 * assign to a {@linkcode MeshInstance}, it's usually controlled through a component such as {@MorphAnimation}. Other
 * components could use several MorphPose objects in keyframes and tween between them over a timeline.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MorphPose()
{
    this._weights = {};
    this._stateInvalid = true;
    this._knownTargets = [];
    this.onChange = new Signal();
}

MorphPose.prototype =
{
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
     * Gets the morph target name at the given index. The targets are sorted by importance.
	 */
	getMorphTargetName: function(index)
    {
        return this._knownTargets[index];
    },

	/**
	 * Sets the weight of a morph target with the given name.
     * @param {string} name The name of the morph target.
     * @param {number} value The new weight.
     */
    setWeight: function(id, value)
    {
        var v = this._weights[id];

        if (v === value) return;

        if (v === undefined)
            this._knownTargets.push(id);

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
		this._knownTargets.sort(function(a, b) {
            return w[b.name] - w[a.name];
        });

        this._stateInvalid = false;
        this.onChange.dispatch();
    },

	/**
     * Creates a copy of this MorphPose object
	 */
	clone: function()
    {
        var clone = new MorphPose();

        for (var name in this._weights) {
            clone.setWeight(name, this._weights[name]);
        }

        return clone;
    }
};

export  { MorphPose };