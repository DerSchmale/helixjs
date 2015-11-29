HX.Entity = function()
{
    HX.SceneNode.call(this);

    // child entities (scene nodes)
    this._children = [];

    // components
    this._components = [];
};

HX.Entity.create = function(components)
{
    var entity = new HX.Entity();

    if (components) {
        var len = components.length;
        for (var i = 0; i < len; ++i)
            entity.addComponent(components[i]);
    }

    return entity;
};

HX.Entity.prototype = Object.create(HX.SceneNode.prototype);

HX.Entity.prototype.addComponent = function(component)
{
    if (component._entity)
        throw "Component already added to an entity!";

    this._components.push(component);

    component._entity = this;
    component._invalidateWorldBounds();
    this._invalidateWorldBounds();
    component.onAdded();
};

HX.Entity.prototype.removeComponent = function(component)
{
    component.onRemoved();
    var index = this._components.indexOf(component);
    if (index >= 0)
        this._components.splice(index, 1);
    component._entity = null;
    if (component.worldBounds) this._invalidateWorldBounds();
};

HX.Entity.prototype.attach = function(child)
{
    if (child._parent)
        throw "Child is already parented!";

    child._parent = this;

    this._children.push(child);
    this._invalidateWorldBounds();
};

HX.Entity.prototype.detach = function(child)
{
    var index = this._children.indexOf(child);

    if (index < 0)
        throw "Trying to remove a scene object that is not a child";

    child._parent = null;

    this._children.splice(index, 1);
    this._invalidateWorldBounds();
};

HX.Entity.prototype.numChildren = function() { return this._children.length; };

HX.Entity.prototype.getChild = function(index) { return this._children[index]; };


HX.Entity.prototype.acceptVisitor = function(visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);

    var len = this._components.length;
    for (var i = 0; i < len; ++i) {
        var component = this._components[i];
        component.acceptVisitor(visitor);
    }

    len = this._children.length;
    for (var i = 0; i < len; ++i) {
        var child = this._children[i];

        if (visitor.qualifies(child))
            child.acceptVisitor(visitor);
    }
};

HX.Entity.prototype._invalidateWorldTransformationMatrix = function()
{
    HX.SceneNode.prototype._invalidateWorldTransformationMatrix.call(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldTransformationMatrix();
};

HX.Entity.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear();

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._worldBounds.growToIncludeBound(this._children[i].worldBounds);

    len = this._components.length;
    for (var i = 0; i < len; ++i) {
        var worldBounds = this._components[i].worldBounds;
        if (worldBounds)
            this._worldBounds.growToIncludeBound(worldBounds);
    }

    HX.SceneNode.prototype._updateWorldBounds.call(this);
};