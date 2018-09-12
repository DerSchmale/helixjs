/**
 * @classdesc
 * A SkeletonBlendTree is used by {@linkcode SkeletonAnimation} internally to blend complex animation setups. Using this,
 * we can crossfade between animation clips (such as walking/running) while additionally having extra modifiers applied,
 * such as gun aiming, head turning, etc.
 *
 * @constructor
 * @param {SkeletonBlendNode} rootNode The root node of the tree.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonBlendTree(rootNode)
{
	this.transferRootJoint = false;
	this.rootNode = rootNode;
}

SkeletonBlendTree.prototype =
{
    get targetSkeletonPose() { return this.rootNode.pose; },
    set targetSkeletonPose(value) { this.rootNode.pose = value; },

    get rootJointDeltaPosition() { return this.rootNode.rootJointDeltaPosition; },

    update: function(dt)
    {
        var updated = this.rootNode.update(dt, this.transferRootJoint);
        if (updated)
            this.rootNode.pose.invalidateGlobalPose();

        return updated;
    },

    /**
     * Gets a node in the tree with the given name.
     */
    getNode: function(name)
    {
        return this.rootNode.findNode(name);
    }
};


export { SkeletonBlendTree };