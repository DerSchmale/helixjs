/**
 * @classdesc
 * Skeleton defines the collection of joints used by the model to handle skinned animations.
 *
 * @see {@linkcode SkeletonJoint}
 *
 * @property name The name of this Skeleton.
 * @property applyInverseBindPose Defines whether or not the inverse bind pose should be applied for this skeleton.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Skeleton()
{
	this.name = "";
	this.applyInverseBindPose = true;
	this.joints = [];
}

Skeleton.prototype =
{
    /**
     * @ignore
     */
    toString: function()
    {
        return "[Skeleton(name=" + this.name + ")";
    }
};

export { Skeleton };