// basic version is non-hierarchical, for use with lights etc
/**
 *
 * @constructor
 */
HX.SceneNode = function()
{
    HX.Transform.call(this);
    this._effects = null;
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



HX.SceneNode.prototype = Object.create(HX.Transform.prototype);

Object.defineProperties(HX.SceneNode.prototype, {
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
                this._updateWorldTransformationMatrix();

            return this._worldTransformMatrix;
        }
    },

    effects: {
        get: function ()
        {
            return this._effects;
        },

        set: function (value)
        {
            this._effects = value;
        }
    },

    showDebugBounds: {
        get: function ()
        {
            return this._debugBounds !== null
        },
        set: function(value)
        {
            if (this.showDebugBounds === value) return;

            if (value) {
                this._debugBounds = new HX.ModelNode(this._worldBounds.getDebugModelInstance());
                this._updateDebugBounds();
            }
            else
                this._debugBounds = null;
        }
    }
});


HX.SceneNode.prototype.setTransformationMatrix = function(matrix)
{
    HX.Transform.prototype.setTransformationMatrix.call(this, matrix);

    this._invalidateWorldTransformationMatrix();
};

HX.SceneNode.prototype.acceptVisitor = function(visitor)
{
    if (this._effects)
        visitor.visitEffects(this._effects, this);

    if (this._debugBounds)
        this._debugBounds.acceptVisitor(visitor);
};

HX.SceneNode.prototype._invalidateTransformationMatrix = function ()
{
    HX.Transform.prototype._invalidateTransformationMatrix.call(this);
    this._invalidateWorldTransformationMatrix();
};

HX.SceneNode.prototype._invalidateWorldTransformationMatrix = function ()
{
    this._worldMatrixInvalid = true;
    this._invalidateWorldBounds();
};

HX.SceneNode.prototype._invalidateWorldBounds = function ()
{
    if (this._worldBoundsInvalid) return;

    this._worldBoundsInvalid = true;

    if (this._parent)
        this._parent._invalidateWorldBounds();
};

HX.SceneNode.prototype._updateWorldBounds = function ()
{
    if (this._debugBounds)
        this._updateDebugBounds();
};

HX.SceneNode.prototype._updateDebugBounds = function()
{
    var matrix = this._debugBounds.getTransformationMatrix();
    var bounds = this._worldBounds;

    matrix.scaleMatrix(bounds._halfExtentX * 2.0, bounds._halfExtentY * 2.0, bounds._halfExtentZ * 2.0);
    matrix.appendTranslation(bounds._centerX, bounds._centerY, bounds._centerZ);
    this._debugBounds.setTransformationMatrix(matrix);
};

HX.SceneNode.prototype._updateTransformationMatrix = function()
{
    HX.Transform.prototype._updateTransformationMatrix.call(this);
    this._invalidateWorldBounds();
};

HX.SceneNode.prototype._updateWorldTransformationMatrix = function()
{
    if (this._parent)
        this._worldTransformMatrix.product(this._parent.worldMatrix, this.getTransformationMatrix());
    else
        this._worldTransformMatrix.copyFrom(this.getTransformationMatrix());

    this._worldMatrixInvalid = false;
};

// override for better matches
HX.SceneNode.prototype._createBoundingVolume = function()
{
    return new HX.BoundingAABB();
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
    this._rootNode = rootNode || new HX.Entity();
    this._skybox = null;
};

HX.Scene.prototype = {
    constructor: HX.Scene,

    get skybox() { return this._skybox; },
    set skybox(value) { this._skybox = value; },

    get effects()
    {
        return this._rootNode._effects;
    },

    set effects(value)
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
