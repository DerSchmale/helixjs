/**
 * This is generally the node you probably want to be using for simple crossfading between animations.
 * @constructor
 */
HX.SkeletonXFadeNode = function()
{
    HX.SkeletonBlendNode.call(this);
    this._children = [];
    this._numJoints = 0;

    // TODO: Add the possibility to sync times!
    // in this case, the clips should have their timesteps recalculated
};

HX.SkeletonXFadeNode.prototype = Object.create(HX.SkeletonBlendNode.prototype, {
    numJoints: {
        get: function() {return this._numJoints; }
    }
});

HX.SkeletonXFadeNode.prototype.update = function(dt, transferRootJoint)
{
    // TODO: Also updates when the time changes the crossfade factor

    var len = this._children.length;

    // still fading if len > 1
    var updated = len > 1 && dt > 0;

    // update weights and remove any node that's become unused
    // do not interpolate the nodes into the pose yet, because if no updates occur, this is unnecessary
    for (var i = 0; i < len; ++i) {
        var child = this._children[i];

        updated = child.node.update(dt) || updated;

        var w = child.weight + dt * child.fadeSpeed;

        if (w > .999) {
            child.weight = 1.0;
            // we can safely remove any of the following child nodes, because their values will be lerped away
            this._children.splice(i + 1);
            break;
        }

        child.weight = w;
    }


    if (!updated) return false;

    var last = this._children.length - 1;

    // work backwards, so we can just override each old state progressively
    this._pose.copyFrom(this._children[last].node._pose);

    for (i = last - 1; i >= 0; --i) {
        child = this._children[i];
        this._pose.interpolate(this._pose, child.node._pose, child.weight);
    }

    return true;
};

/**
 * @param node A SkeletonBlendTreeNode or a clip.
 * @param time In milliseconds
 */
HX.SkeletonXFadeNode.prototype.fadeTo = function(node, time)
{
    if (node instanceof HX.SkeletonClip) node = new HX.SkeletonClipNode(node);

    this._numJoints = node.numJoints;
    // put the new one in front, it makes the update loop more efficient
    this._children.unshift({
        node: node,
        weight: 0.0,
        fadeSpeed: 1 / time
    });
};