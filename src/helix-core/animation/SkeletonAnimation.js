/**
 *
 * @constructor
 */
HX.SkeletonAnimation = function(rootNode)
{
    HX.Component.call(this);
    if (rootNode instanceof HX.SkeletonClip)
        rootNode = new HX.SkeletonClipNode(rootNode);
    this._blendTree = new HX.SkeletonBlendTree(rootNode);
};

HX.SkeletonAnimation.prototype = Object.create(HX.Component.prototype,
    {
        animationNode: {
            get: function ()
            {
                return this._blendTree.rootNode;
            },
            set function(value)
            {
                this._blendTree.rootNode = value;
                if (this._entity) this._blendTree.skeleton = this._entity.skeleton;
            }
        }
    }
);

HX.SkeletonAnimation.prototype.onAdded = function()
{
    this._blendTree.skeleton = this._entity.skeleton;
};

HX.SkeletonAnimation.prototype.onUpdate = function(dt)
{
    if (this._blendTree.update(dt)) {
        var matrix = this._entity.matrix;
        var d = this._blendTree.rootJointDeltaPosition;
        matrix.prependTranslation(d);
        this._entity.matrix = matrix;
    }
    this._entity.skeletonMatrices = this._blendTree.matrices;
};