HX.Entity = function()
{
    HX.SceneNode.call(this);

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