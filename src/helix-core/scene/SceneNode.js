// basic version is non-hierarchical, for use with lights etc
import {Matrix4x4} from "../math/Matrix4x4";
import {Transform} from "../math/Transform";
import {SkeletonPose} from "../animation/skeleton/SkeletonPose";


var nameCounter = 0;

/**
 * @classdesc
 * <p>SceneNode is an empty hierarchical container for the scene graph. It can be attached to other SceneNode objects and
 * have SceneNode objects attached to itself.</p>
 *
 * <p>SceneNode also functions as the base class for other scene graph objects, such as {@linkcode Entity}</p>
 *
 * @property {string} name The name of the scene node.
 * @property {SceneNode} parent The parent of this node in the scene hierarchy.
 * @property {number} numChildren The amount of children attached to this node.
 * @property {boolean} isOnRoot Indicates whether this node is added directly to the scene root.
 * @property {boolean} visible Defines whether or not this and any children attached to this node should be rendered or not.
 * @property {boolean} raycast Defines whether or not this and any children attached to this node should be tested when raycasting.
 * @property {Matrix4x4} worldMatrix The matrix transforming from the node's local space to world space.
 * @property {MorphPose} morphPose The {@linkcode MorphPose} assigning weights to morph targets. If assigned, all MeshInstances
 * in the hierarchy must have the correct morph targets. Otherwise, assign the morph pose to the MeshInstance.
 * @property {Skeleton} skeleton The {@linkcode Skeleton} defining the rigging for any MeshInstance children in the hierarchy.
 *
 * @see {@linkcode Scene}
 *
 * @constructor
 *
 * @extends Transform
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SceneNode()
{
    Transform.call(this);
    this.meta = {};
    this.name = "hx_scenenode_" + (nameCounter++);
    this._matrixInvalid = true;
	this._worldMatrix = new Matrix4x4();
    this._worldMatrixInvalid = true;
    this._parent = null;
    this._scene = null;
    this._visible = true;
    this._ancestorsVisible = true;
    this.raycast = true;
    this._children = [];
    this._isOnRoot = false;
	this._skeleton = null;
	this._skeletonPose = null;
	this._morphPose = null;
	this._skeletonRoot = null;

    // used to determine sorting index for the render loop
    // models can use this to store distance to camera for more efficient rendering, lights use this to sort based on
    // intersection with near plane, etc
    this._renderOrderHint = 0.0;

	this._Transform_applyMatrix = Transform.prototype._applyMatrix;
	this._Transform_invalidateMatrix = Transform.prototype._invalidateMatrix;;
}

SceneNode.prototype = Object.create(Transform.prototype, {
    parent: {
        get: function()
        {
            return this._parent;
        }
    },

    isOnRoot: {
        get: function()
        {
            return this._isOnRoot;
        }
    },

    numChildren: {
        get: function() { return this._children.length; }
    },

    visible: {
        get: function()
        {
            return this._visible;
        },
        set: function(value)
        {
            this._visible = value;

            for (var i = 0, len = this._children.length; i < len; ++i) {
                this._children[i]._updateAncestorsVisible(value && this._ancestorsVisible);
            }
        }
    },

    hierarchyVisible: {
        get: function()
        {
            return this._visible && this._ancestorsVisible
        }
    },

    worldMatrix: {
        get: function()
        {
            if (this._worldMatrixInvalid)
                this._updateWorldMatrix();

            return this._worldMatrix;
        }
    },

    skeleton: {
		get: function()
		{
			return this._skeleton;
		},

        set: function(value)
        {
        	if (value) {
				var pose = new SkeletonPose();
				pose.copyBindPose(value);
			}

			this._bindSkeleton(value, pose, this);
        }
    },

	skeletonPose: {
    	get: function()
		{
			return this._skeletonPose;
		}
	},

	morphPose: {
    	get: function()
		{
			return this._morphPose;
		},

		set: function(value)
		{
			this._assignMorphPose(value);

			for (var i = 0, len = this._children.length; i < len; ++i) {
				var child = this._children[i];

				if (!child.morphPose)
					child.morphPose = value;
			}
		}
	}
});

/**
 * Attaches a child SceneNode to this node.
 */
SceneNode.prototype.attach = function(child)
{
    if (child instanceof Array) {
        var len = child.length;
        for (var i = 0; i < len; ++i) {
            this.attach(child[i]);
        }
        return;
    }
    else {
        this._updateChildAdded(child);
        this._children.push(child);
    }
};

/**
 * @ignore
 */
SceneNode.prototype._updateChildAdded = function(child)
{
	// remove child from existing parent
	if (child._parent)
		child._parent.detach(child);

	child._isOnRoot = this._scene && this._parent === this._scene._rootNode;
	child._parent = this;
	child._setScene(this._scene);
	child._updateAncestorsVisible(this._visible && this._ancestorsVisible);

	if (this._skeleton)
		child._bindSkeleton(this._skeleton, this._skeletonPose, this._skeletonRoot);

	if (this._morphPose && !child._morphPose)
		child.morphPose = this._morphPose;
};

/**
 * Attaches a child SceneNode to this node.
 *
 * @param {SceneNode} child The child to be attached.
 * @param {SceneNode} refChild The scene node after which to add the new child.
 */
SceneNode.prototype.attachAfter = function(child, refChild)
{
    if (refChild._parent !== this)
        throw new Error("Reference child not a child of the scene node");

	this._updateChildAdded(child);

	var index = this._children.indexOf(refChild);
	this._children.splice(index + 1, 0, child);
};

/**
 * Returns whether or not this scene node is contained by a parent. This works recursively.
 */
SceneNode.prototype.isContainedIn = function(parent)
{
    var p = this._parent;

    while (p) {
		if (p === parent) return true;
		p = p._parent;
    }

    return false;
};

/**
 * Returns whether or not a child is contained in a parent. This works recursively!
 */
SceneNode.prototype.contains = function(child)
{
    var index = this._children.indexOf(child);
    if (index >= 0) return true;

    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        if (this._children[i].contains(child))
            return true;
    }

    return false;
};


/**
 * Removes a child SceneNode from this node.
 */
SceneNode.prototype.detach = function(child)
{
    var index = this._children.indexOf(child);

    if (index < 0)
        throw new Error("Trying to remove a scene object that is not a child");

    child._parent = null;
    child._isOnRoot = false;
    child._updateAncestorsVisible(true);
    child._setScene(null);

    if (child.skeleton === this._skeleton)
		child.skeleton = null;

	if (child.morphPose === this._morphPose)
		child.morphPose = null;

    this._children.splice(index, 1);
};

/**
 * Retrieves a child SceneNode with the given index.
 */
SceneNode.prototype.getChild = function(index) { return this._children[index]; };

/**
 * Returns the index of a child SceneNode.
 * @param child
 * @returns {*}
 */
SceneNode.prototype.getChildIndex = function(child) { return this._children.indexOf(child); };

/**
 * Removes the scene node from the scene and destroys it and all of its children.
 */
SceneNode.prototype.destroy = function()
{
    if (this._parent)
	    this._parent.detach(this);

    while(this._children.length)
		this._children[0].destroy();
};


/**
 * @ignore
 * @private
 */
SceneNode.prototype._applyMatrix = function()
{
    this._Transform_applyMatrix();
    this._invalidateWorldMatrix();
};

/**
 * Finds a scene node with the given name somewhere in this node's children.
 */
SceneNode.prototype.findNodeByName = function(name)
{
    if (this.name === name) return this;

    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        var node = this._children[i].findNodeByName(name);
        if (node) return node;
    }
};


/**
 * Queries the scene graph for a material with the given name
 * @param name The name of the Material
 */
SceneNode.prototype.findMaterialByName = function(name)
{
	for (var i = 0, len = this._children.length; i < len; ++i) {
		var material = this._children[i].findMaterialByName(name);
		if (material) return material;
	}
};

/**
 * @ignore
 */
SceneNode.prototype._setScene = function(scene)
{
    this._scene = scene;

    var len = this._children.length;

    for (var i = 0; i < len; ++i)
        this._children[i]._setScene(scene);

    this._isOnRoot = !!scene && this._parent === this._scene._rootNode;
};

/**
 * @ignore
 */
SceneNode.prototype._invalidateMatrix = function ()
{
    this._Transform_invalidateMatrix();
    this._invalidateWorldMatrix();
};

/**
 * @ignore
 */
SceneNode.prototype._invalidateWorldMatrix = function ()
{
    this._worldMatrixInvalid = true;

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldMatrix();
};

/**
 * @ignore
 */
SceneNode.prototype._updateWorldMatrix = function()
{
    if (this._parent)
        this._worldMatrix.multiply(this._parent.worldMatrix, this.matrix);
    else
        this._worldMatrix.copyFrom(this.matrix);

    this._worldMatrixInvalid = false;
};

/**
 * @ignore
 */
SceneNode.prototype.toString = function()
{
    return "[SceneNode(name=" + this.name + ")]";
};

/**
 * Applies a function recursively to all child nodes.
 * @param func The function to call (using the traversed node as argument)
 */
SceneNode.prototype.applyFunction = function(func)
{
    // Heehee, this line amuses me:
    func(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i].applyFunction(func);
};

/**
 * Applies a function recursively to all child nodes while the passed function returns true
 * @param func The function to call (using the traversed node as argument)
 */
SceneNode.prototype.applyFunctionConditional = function(func)
{
    if (!func(this)) return;

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i].applyFunctionConditional(func);
};

/**
 * @private
 * @ignore
 */
SceneNode.prototype._updateAncestorsVisible = function(value)
{
    this._ancestorsVisible = value;

    for (var i = 0, len = this._children.length; i < len; ++i) {
		this._children[i]._updateAncestorsVisible(this._visible && value);
    }
};

/**
 * @ignore
 */
SceneNode.prototype.copyFrom = function(src)
{
    Transform.prototype.copyFrom.call(this, src);

	this.name = src.name;
	this.visible = src.visible;
	this.raycast = src.raycast;

	for (var i = 0, len = src._children.length; i < len; ++i) {
		this.attach(src._children[i].clone());
	}
};

/**
 * @inheritDoc
 */
SceneNode.prototype.clone = function()
{
    var clone = new SceneNode();
	clone.copyFrom(this);
    return clone;
};

/**
 * @ignore
 */
SceneNode.prototype._bindSkeleton = function(skeleton, pose, root)
{
	this._skeleton = skeleton;
	this._skeletonPose = pose;
	this._skeletonRoot = root;

	for (var i = 0, len = this._children.length; i < len; ++i)
	    this._children[i]._bindSkeleton(skeleton, pose, root);
};

/**
 * @ignore
 */
SceneNode.prototype._assignMorphPose = function(value)
{
	this._morphPose = value;
};


export { SceneNode };