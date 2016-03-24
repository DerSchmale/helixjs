// basic version is non-hierarchical, for use with lights etc
/**
 *
 * @constructor
 */
HX.SceneNode = function()
{
    HX.Transform.call(this);
    this._name = null;
    this._worldMatrix = new HX.Matrix4x4();
    this._worldBoundsInvalid = true;
    this._matrixInvalid = true;
    this._worldMatrixInvalid = true;
    this._parent = null;
    this._scene = null;
    this._worldBounds = this._createBoundingVolume();
    this._debugBounds = null;
    this._visible = true;

    // used to determine sorting index for the render loop
    // models can use this to store distance to camera for more efficient rendering, lights use this to sort based on
    // intersection with near plane, etc
    this._renderOrderHint = 0.0;
};

HX.SceneNode.prototype = Object.create(HX.Transform.prototype);

Object.defineProperties(HX.SceneNode.prototype, {
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
    },

    showDebugBounds: {
        get: function ()
        {
            return this._debugBounds !== null
        },
        set: function(value)
        {
            if (!!this._debugBounds === value) return;

            if (value) {
                this._debugBounds = this._worldBounds.getDebugModelInstance();
                this._updateDebugBounds();
            }
            else
                this._debugBounds = null;
        }
    }
});

HX.SceneNode.prototype._applyMatrix = function()
{
    HX.Transform.prototype._applyMatrix.call(this);
    this._invalidateWorldMatrix();
};

HX.SceneNode.prototype.findMaterialByName = function(name)
{
    var visitor = new HX.MaterialQueryVisitor(name);
    this.acceptVisitor(visitor);
    return visitor.foundMaterial;
};

HX.SceneNode.prototype.findNodeByName = function(name)
{
    return this._name === name? this : null;
};

HX.SceneNode.prototype._setScene = function(scene)
{
    this._scene = scene;
};

HX.SceneNode.prototype.acceptVisitor = function(visitor)
{
    if (this._debugBounds)
        this._debugBounds.acceptVisitor(visitor);
};

HX.SceneNode.prototype._invalidateMatrix = function ()
{
    HX.Transform.prototype._invalidateMatrix.call(this);
    this._invalidateWorldMatrix();
};

HX.SceneNode.prototype._invalidateWorldMatrix = function ()
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
    var matrix = this._debugBounds.matrix;
    var bounds = this._worldBounds;

    console.log(bounds._halfExtentX, bounds._halfExtentY * 2.0, bounds._halfExtentZ * 2.0);

    matrix.fromScale(bounds._halfExtentX * 2.0, bounds._halfExtentY * 2.0, bounds._halfExtentZ * 2.0);
    matrix.appendTranslation(bounds._center);
    this._debugBounds.matrix = matrix;
};

HX.SceneNode.prototype._updateMatrix = function()
{
    HX.Transform.prototype._updateMatrix.call(this);
    this._invalidateWorldBounds();
};

HX.SceneNode.prototype._updateWorldMatrix = function()
{
    if (this._parent)
        this._worldMatrix.multiply(this._parent.worldMatrix, this.matrix);
    else
        this._worldMatrix.copyFrom(this.matrix);

    this._worldMatrixInvalid = false;
};

// override for better matches
HX.SceneNode.prototype._createBoundingVolume = function()
{
    return new HX.BoundingAABB();
};

HX.SceneNode.prototype.toString = function()
{
    return "[SceneNode(name=" + this._name + ")]";
};