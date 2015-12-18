/**
 *
 * @constructor
 */
HX.GroupNode = function()
{
    HX.SceneNode.call(this);

    // child entities (scene nodes)
    this._children = [];
};

HX.GroupNode.prototype = Object.create(HX.SceneNode.prototype,
    {
        numChildren: {
            get: function() { return this._children.length; }
        }
    });


HX.GroupNode.prototype.findNodeByName = function(name)
{
    var node = HX.SceneNode.prototype.findNodeByName.call(this, name);
    if (node) return node;
    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        node = this._children[i].findNodeByName(name);
        if (node) return node;
    }
};

HX.GroupNode.prototype.attach = function(child)
{
    if (child._parent)
        throw new Error("Child is already parented!");

    child._parent = this;
    child._setScene(this._scene);

    this._children.push(child);
    this._invalidateWorldBounds();
};

HX.GroupNode.prototype.detach = function(child)
{
    var index = this._children.indexOf(child);

    if (index < 0)
        throw new Error("Trying to remove a scene object that is not a child");

    child._parent = null;

    this._children.splice(index, 1);
    this._invalidateWorldBounds();
};

HX.GroupNode.prototype.getChild = function(index) { return this._children[index]; };

HX.GroupNode.prototype.acceptVisitor = function(visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);

    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        var child = this._children[i];

        if (visitor.qualifies(child))
            child.acceptVisitor(visitor);
    }
};

HX.GroupNode.prototype._invalidateWorldTransformationMatrix = function()
{
    HX.SceneNode.prototype._invalidateWorldTransformationMatrix.call(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldTransformationMatrix();
};

HX.GroupNode.prototype._updateWorldBounds = function()
{
    var len = this._children.length;

    for (var i = 0; i < len; ++i) {
        this._worldBounds.growToIncludeBound(this._children[i].worldBounds);
    }

    HX.SceneNode.prototype._updateWorldBounds.call(this);
};

HX.GroupNode.prototype._setScene = function(scene)
{
    HX.SceneNode.prototype._setScene.call(this, scene);

    var len = this._children.length;

    for (var i = 0; i < len; ++i)
        this._children[i]._setScene(scene);
};