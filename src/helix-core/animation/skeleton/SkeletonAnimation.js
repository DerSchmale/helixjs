import {Component} from "../../entity/Component";
import {AnimationClip} from "./../AnimationClip";
import {SkeletonClipNode} from "./SkeletonClipNode";
import {SkeletonBlendTree} from "./SkeletonBlendTree";
import {META} from "../../Helix";


/**
 * @param {*} rootNode Either a {@linkcode SkeletonBlendNode} for more complex animations, or an {@linkcode AnimationClip} for single-clip start/stop animations.
 *
 * @classdesc
 *
 * SkeletonAnimation is a {@linkcode Component} that allows skinned animations on a Model. Internally, it uses a
 * {@linkcode SkeletonBlendTree} for blending.
 *
 * @property {Boolean} transferRootJoint Defines whether the root joint's movement will be applied to the target Model's scene position. This way, scene movement can be synchronized to the animation.
 * @property {Boolean} applyInverseBindPose Defines whether or not the inverse bind pose should be applied to the skeleton's pose.
 * @property {SkeletonBlendNode} animationNode The root animation node of the blend tree.
 *
 * @constructor
 *
 * @see {@linkcode AnimationClip}
 * @see {@linkcode SkeletonBlendNode}
 * @see {@linkcode SkeletonXFadeNode}
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonAnimation(rootNode)
{
    Component.call(this);
    if (rootNode instanceof AnimationClip)
        rootNode = new SkeletonClipNode(rootNode);
    this._blendTree = new SkeletonBlendTree(rootNode);
};

Component.create(SkeletonAnimation,
    {
        transferRootJoint: {
            get: function()
            {
                return this._blendTree.transferRootJoint;
            },

            set: function(value)
            {
                this._blendTree.transferRootJoint = value;
            }
        },

        applyInverseBindPose: {
            get: function()
            {
                return this._blendTree.applyInverseBindPose;
            },

            set: function(value)
            {
                this._blendTree.applyInverseBindPose = value;
            }
        },

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

/**
 * If a node somewhere in the tree has registered with a given ID, it's "value" (node-dependent) can be changed through here.
 *
 * @deprecated
 *
 * @param id
 * @param value
 */
SkeletonAnimation.prototype.setValue = function(id, value)
{
    // if any of the nodes in the animation blend tree has a value id assigned, it can be controlled here from the root.
    this._blendTree.setValue(id, value);
};

/**
 * @ignore
 */
SkeletonAnimation.prototype.onAdded = function()
{
    this._blendTree.skeleton = this._entity.skeleton;
    this._entity.skeletonPose = this._blendTree.skeletonPose;
};

/**
 * @ignore
 */
SkeletonAnimation.prototype.onUpdate = function(dt)
{
    if (this._blendTree.update(dt)) {
        var matrix = this._entity.matrix;
        var d = this._blendTree.rootJointDeltaPosition;
        matrix.prependTranslation(d);
        this._entity.matrix = matrix;
        this._entity.skeletonPose = this._blendTree.skeletonPose;
    }
};

export { SkeletonAnimation };