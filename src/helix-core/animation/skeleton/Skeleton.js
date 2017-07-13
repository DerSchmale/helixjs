/**
 * @classdesc
 * Skeleton defines the collection of joints used by the model to handle skinned animations.
 *
 * @see {@linkcode SkeletonJoint}
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Skeleton()
{
    this._joints = [];
    this._name = "";
}

Skeleton.prototype =
{
    /**
     * The amount of joints in the Skeleton.
     * @returns {Number}
     */
    get numJoints()
    {
        return this._joints.length;
    },

    /**
     * Adds a joint to the Skeleton.
     * @param {SkeletonJoint} joint
     */
    addJoint: function(joint)
    {
        this._joints.push(joint);
    },

    /**
     * Gets a joint at the specified index.
     * @param {number} index
     */
    getJoint: function(index)
    {
        return this._joints[index];
    },

    /**
     * The name of this Skeleton.
     */
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[Skeleton(name=" + this.name + ")";
    }
};

export { Skeleton };