// basic version is non-hierarchical, for use with lights etc
/**
 *
 * @constructor
 */
HX.SceneNode = function()
{
    this._effects = null;
    this._transform = new HX.Transform();
    this._transform.onChange.bind(this, this._onTransformChange);
    this._transformMatrix = new HX.Matrix4x4();
    this._worldTransformMatrix = new HX.Matrix4x4();
    this._worldBoundsInvalid = true;
    this._matrixInvalid = true;
    this._worldMatrixInvalid = true;
    this._parent = null;
    this._worldBounds = this._createBoundingVolume();
    this._debugBounds = null;

    // used to determine sorting index for the render loop
    // models can use this to store distance to camera for more efficient rendering, lights use this to sort based on
    // intersection with near plane, etc
    this._renderOrderHint = 0.0;
};

HX.SceneNode.prototype = {
    constructor: HX.SceneNode,

    get transform()
    {
        return this._transform;
    },

    /**
     * Copies the transform from a Transform object to this object's transform object. If no value is passed in, the
     * Transform object is disabled for this object, allowing static objects with a fixed transformation matrix.
     * @param value
     */
    set transform(value)
    {
        if (value) {
            if (!this._transform) {
                this._transform = new HX.Transform();
                this._transform.onChange.bind(this, this._onTransformChange);
            }

            this._transform.copyFrom(value);
            this._invalidateTransformationMatrix();
        }
        else if (this._transform) {
            // whatever was still set on old transform must be stored first
            if (this._matrixInvalid) this._updateTransformationMatrix();
            this._transform.onChange.unbind(this._onTransformChange);
            this._transform = null;
        }
    },

    getEffects: function(value)
    {
        return this._effects;
    },

    setEffects: function(value)
    {
        this._effects = value;
    },

    getTransformationMatrix: function()
    {
        if (this._matrixInvalid)
            this._updateTransformationMatrix();

        return this._transformMatrix;
    },

    setTransformationMatrix: function(matrix)
    {
        this._transformMatrix.copyFrom(matrix);
        this._matrixInvalid = false;

        if (this._transform)
            this._transformMatrix.decompose(this._transform);

        this._invalidateWorldTransformationMatrix();
    },

    getWorldMatrix: function()
    {
        if (this._worldMatrixInvalid)
            this._updateWorldTransformationMatrix();

        return this._worldTransformMatrix;
    },

    // always go through here to get to world bounds!
    getWorldBounds: function()
    {
        if (this._worldBoundsInvalid) {
            this._updateWorldBounds();
            this._worldBoundsInvalid = false;
        }

        return this._worldBounds;
    },

    acceptVisitor: function(visitor)
    {
        if (this._effects)
            visitor.visitEffects(this._effects, this);

        if (this._debugBounds)
            this._debugBounds.acceptVisitor(visitor);
    },

    getShowDebugBounds: function()
    {
        return this._debugBounds !== null;
    },

    setShowDebugBounds: function(value)
    {
        if (this.getShowDebugBounds() === value) return;

        if (value) {
            this._debugBounds = new HX.ModelNode(this._worldBounds.getDebugModelInstance());
            this._debugBounds.setTransform(null);
            this._updateDebugBounds();
        }
        else
            this._debugBounds = null;
    },

    _onTransformChange: function()
    {
        this._invalidateTransformationMatrix();
    },

    _invalidateTransformationMatrix: function ()
    {
        this._matrixInvalid = true;
        this._invalidateWorldTransformationMatrix();
    },

    _invalidateWorldTransformationMatrix: function ()
    {
        this._worldMatrixInvalid = true;
        this._invalidateWorldBounds();
    },

    _invalidateWorldBounds: function (tellParent)
    {
        if (this._worldBoundsInvalid) return;

        this._worldBoundsInvalid = true;

        if (tellParent !== false && this._parent)
            this._parent._invalidateWorldBounds();
    },

    _updateWorldBounds: function ()
    {
        if (this._debugBounds)
            this._updateDebugBounds();
    },

    _updateDebugBounds: function()
    {
        var matrix = this._debugBounds.getTransformationMatrix();
        var bounds = this._worldBounds;

        matrix.scaleMatrix(bounds._halfExtentX * 2.0, bounds._halfExtentY * 2.0, bounds._halfExtentZ * 2.0);
        matrix.appendTranslation(bounds._centerX, bounds._centerY, bounds._centerZ);
        this._debugBounds.setTransformationMatrix(matrix);
    },

    _updateTransformationMatrix: function()
    {
        this._transformMatrix.compose(this._transform);
        this._matrixInvalid = false;
        this._worldBoundsInvalid = true;
    },

    _updateWorldTransformationMatrix: function()
    {
        if (this._parent)
            this._worldTransformMatrix.product(this._parent.getWorldMatrix(), this.getTransformationMatrix());
        else
            this._worldTransformMatrix.copyFrom(this.getTransformationMatrix());

        this._worldMatrixInvalid = false;
    },

    // override for better matches
    _createBoundingVolume: function()
    {
        return new HX.BoundingAABB();
    }
};

/**
 *
 * @constructor
 */
HX.BoundingHierarchyNode = function()
{
    HX.SceneNode.call(this);
    this._children = [];
};

HX.BoundingHierarchyNode.prototype = Object.create(HX.SceneNode.prototype);

HX.BoundingHierarchyNode.prototype.attach = function(child)
{
    if (child._parent)
        throw "Child is already parented!";

    child._parent = this;

    this._children.push(child);
    this._invalidateWorldBounds();
};

HX.BoundingHierarchyNode.prototype.detach = function(child)
{
    var index = this._children.indexOf(child);

    if (index < 0)
        throw "Trying to remove a scene object that is not a child";

    child._parent = null;

    this._children.splice(index, 1);
    this._invalidateWorldBounds();
};

HX.BoundingHierarchyNode.prototype.numChildren = function() { return this._children.length; };

HX.BoundingHierarchyNode.prototype.getChild = function(index) { return this._children[index]; };


HX.BoundingHierarchyNode.prototype.acceptVisitor = function(visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);

    var len = this._children.length;

    for (var i = 0; i < len; ++i) {
        var child = this._children[i];
        if (visitor.qualifies(child))
            child.acceptVisitor(visitor);
    }
};


HX.BoundingHierarchyNode.prototype._invalidateWorldBounds = function()
{
    HX.SceneNode.prototype._invalidateWorldBounds.call(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldBounds(false); // false = parent (ie: this) does not need to know, it already knows
};

HX.BoundingHierarchyNode.prototype._invalidateWorldTransformationMatrix = function()
{
    HX.SceneNode.prototype._invalidateWorldTransformationMatrix.call(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldTransformationMatrix();
};

HX.BoundingHierarchyNode.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear();

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._worldBounds.growToIncludeBound(this._children[i].getWorldBounds());

    HX.SceneNode.prototype._updateWorldBounds.call(this);
};

/**
 * Creates a new Scene object
 * @param rootNode (optional) A rootnode to be used, allowing different partition types to be used as the root.
 * @constructor
 */
HX.Scene = function(rootNode)
{
    // the default partition is a BVH node
    //  -> or this may need to become an infinite bound node?
    this._rootNode = rootNode || new HX.BoundingHierarchyNode();
    this._skyBox = null;
};

HX.Scene.prototype = {
    constructor: HX.Scene,

    getSkyBox: function() { return this._skyBox; },
    setSkyBox: function(value) { this._skyBox = value; },

    getEffects: function(value)
    {
        return this._rootNode._effects;
    },

    setEffects: function(value)
    {
        this._rootNode._effects = value;
    },

    attach: function(child)
    {
        this._rootNode.attach(child);
    },

    detach: function(child)
    {
        this._rootNode.detach(child);
    },

    numChildren: function()
    {
        return this._rootNode.numChildren();
    },

    getChild: function(index)
    {
        return this._rootNode.getChild(index);
    },

    contains: function(child)
    {
        this._rootNode.contains(child);
    },

    acceptVisitor: function(visitor)
    {
        visitor.visitScene(this);
        // assume root node will always qualify
        this._rootNode.acceptVisitor(visitor);
    }
};

/**
 *
 * @param modelInstance
 * @constructor
 */
HX.ModelNode = function(modelInstance)
{
    HX.SceneNode.call(this);
    this.setModelInstance(modelInstance);
};

HX.ModelNode.prototype = Object.create(HX.SceneNode.prototype);

HX.ModelNode.prototype.acceptVisitor = function(visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);
    visitor.visitModelInstance(this._modelInstance, this.getWorldMatrix(), this.getWorldBounds());
};

HX.ModelNode.prototype.getModelInstance = function()
{
    return this._modelInstance;
};

HX.ModelNode.prototype.setModelInstance = function(value)
{
    if (this._modelInstance)
        this._modelInstance.onChange.unbind(this, HX.ModelNode.prototype._invalidateWorldBounds);

    this._modelInstance = value;

    this._modelInstance.onChange.bind(this, HX.ModelNode.prototype._invalidateWorldBounds);
    this._invalidateWorldBounds();
};

// override for better matches
HX.ModelNode.prototype._updateWorldBounds = function()
{
    if (this._modelInstance)
        this._worldBounds.transformFrom(this._modelInstance.getLocalBounds(), this.getWorldMatrix());

    HX.SceneNode.prototype._updateWorldBounds.call(this);
};