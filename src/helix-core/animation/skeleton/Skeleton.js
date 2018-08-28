/**
 * @classdesc
 * Skeleton defines the collection of joints used by the model to handle skinned animations.
 *
 * @see {@linkcode SkeletonJoint}
 *
 * @property name The name of this Skeleton.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Skeleton()
{
    this._applyInverseBindPose = true;
    this._joints = [];
    this.name = "";
}

Skeleton.prototype =
{
    /**
     * Defines whether or not the inverse bind pose should be applied for this skeleton.
     */
    get applyInverseBindPose()
    {
        return this._applyInverseBindPose;
    },

    set applyInverseBindPose(value)
    {
        this._applyInverseBindPose = value;
    },

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
     * @ignore
     */
    toString: function()
    {
        return "[Skeleton(name=" + this.name + ")";
    }
};

export { Skeleton };