// basic version is non-hierarchical, for use with lights etc
import {Matrix4x4} from "../math/Matrix4x4";
import {MaterialQueryVisitor} from "./MaterialQueryVisitor";
import {Transform} from "../math/Transform";
import {BoundingAABB} from "./BoundingAABB";

/**
 * @classdesc
 * <p>SceneNode is an empty hierarchical container for the scene graph. It can be attached to other SceneNode objects and
 * have SceneNode objects attached to itself.</p>
 *
 * <p>SceneNode also functions as the base class for other scene graph objects, such as entities ({@linkcode ModelInstance},
 * lights, camera, ...).
 *
 * @property {string} name The name of te scene node.
 * @property {SceneNode} parent The parent of this node in the scene hierarchy.
 * @property {number} numChildren The amount of children attached to this node.
 * @property {boolean} visible Defines whether or not this and any children attached to this node should be rendered or not.
 * @property {boolean} raycast Defines whether or not this and any children attached to this node should be tested when raycasting.
 * @property {BoundingVolume} worldBounds The bounding volume for this node and its children in world coordinates.
 * @property {Matrix4x4} worldMatrix The matrix transforming from the node's local space to world space.
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
    this._name = null;
    this._worldMatrix = new Matrix4x4();
    this._worldBoundsInvalid = true;
    this._matrixInvalid = true;
    this._worldMatrixInvalid = true;
    this._parent = null;
    this._scene = null;
    this._worldBounds = this._createBoundingVolume();
    this._debugBounds = null;
    this._visible = true;
    this._raycast = true;
    this._children = [];

    // used to determine sorting index for the render loop
    // models can use this to store distance to camera for more efficient rendering, lights use this to sort based on
    // intersection with near plane, etc
    this._renderOrderHint = 0.0;
}

SceneNode.prototype = Object.create(Transform.prototype, {
    name: {
        get: function()
        {
            return this._name;
        },
        set: function(value)
        {
            this._name = value;
        }
    },

    parent: {
        get: function()
        {
            return this._parent;
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
        }
    },

    raycast: {
        get: function()
        {
            return this._raycast;
        },
        set: function(value)
        {
            this._raycast = value;
        }
    },

    worldBounds: {
        get: function()
        {
            if (this._worldBoundsInvalid) {
                this._updateWorldBounds();
                this._worldBoundsInvalid = false;
            }

            return this._worldBounds;
        }
    },

    worldMatrix: {
        get: function()
        {
            if (this._worldMatrixInvalid)
                this._updateWorldMatrix();

            return this._worldMatrix;
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

    if (child._parent) {
        // remove child from existing parent
        child._parent.detach(child);
	}

    child._parent = this;
    child._setScene(this._scene);

    this._children.push(child);
    this._invalidateWorldBounds();
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

	if (child._parent) {
		// remove child from existing parent
		child._parent.detach(child);
	}

	child._parent = this;
	child._setScene(this._scene);

	var index = this._children.indexOf(refChild);
	this._children.splice(index + 1, 0, child);
	this._invalidateWorldBounds();
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

    this._children.splice(index, 1);
    this._invalidateWorldBounds();
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
    Transform.prototype._applyMatrix.call(this);
    this._invalidateWorldMatrix();
};

/**
 * Finds a material with the given name somewhere in this node's children.
 */
SceneNode.prototype.findMaterialByName = function(name)
{
    var visitor = new MaterialQueryVisitor(name);
    this.acceptVisitor(visitor);
    return visitor.foundMaterial;
};

/**
 * Finds a scene node with the given name somewhere in this node's children.
 */
SceneNode.prototype.findNodeByName = function(name)
{
    if (this._name === name) return this;

    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        var node = this._children[i].findNodeByName(name);
        if (node) return node;
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
};

/**
 * @ignore
 */
SceneNode.prototype.acceptVisitor = function(visitor)
{
    if (this._debugBounds)
        this._debugBounds.acceptVisitor(visitor);

    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        var child = this._children[i];

        if (visitor.qualifies(child))
            child.acceptVisitor(visitor);
    }
};

/**
 * @ignore
 */
SceneNode.prototype._invalidateMatrix = function ()
{
    Transform.prototype._invalidateMatrix.call(this);
    this._invalidateWorldMatrix();
};

/**
 * @ignore
 */
SceneNode.prototype._invalidateWorldMatrix = function ()
{
    this._worldMatrixInvalid = true;
    this._invalidateWorldBounds();

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldMatrix();
};

/**
 * @ignore
 */
SceneNode.prototype._invalidateWorldBounds = function ()
{
    if (this._worldBoundsInvalid) return;

    this._worldBoundsInvalid = true;

    if (this._parent)
        this._parent._invalidateWorldBounds();
};

/**
 * @ignore
 */
SceneNode.prototype._updateWorldBounds = function ()
{
    var len = this._children.length;

    this._worldBounds.clear();

    for (var i = 0; i < len; ++i) {
        this._worldBounds.growToIncludeBound(this._children[i].worldBounds);
    }

    if (this._debugBounds)
        this._updateDebugBounds();
};

/**
 * @ignore
 */
SceneNode.prototype._updateDebugBounds = function()
{
    var matrix = this._debugBounds.matrix;
    var bounds = this._worldBounds;

    matrix.fromScale(bounds._halfExtentX * 2.0, bounds._halfExtentY * 2.0, bounds._halfExtentZ * 2.0);
    matrix.appendTranslation(bounds._center);
    this._debugBounds.matrix = matrix;
};

/**
 * @ignore
 */
SceneNode.prototype._updateMatrix = function()
{
    Transform.prototype._updateMatrix.call(this);
    this._invalidateWorldBounds();
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
SceneNode.prototype._createBoundingVolume = function()
{
    return new BoundingAABB();
};

/**
 * @ignore
 */
SceneNode.prototype.toString = function()
{
    return "[SceneNode(name=" + this._name + ")]";
};

/**
 * Applies a function recursively to all child nodes.
 * @param func The function to call (using the traversed node as argument)
 * @param [thisRef] Optional reference to "this" in the calling function, to keep the scope of "this" in the called method.
 */
SceneNode.prototype.applyFunction = function(func, thisRef)
{
    if (thisRef)
        func.call(thisRef, this);
    else
    // Heehee, this line amuses me:
        func(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i].applyFunction(func, thisRef);
};

export { SceneNode };