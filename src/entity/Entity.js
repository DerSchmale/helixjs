HX.Entity = function()
{
    HX.GroupNode.call(this);

    // components
    this._components = [];

    // are managed by effect components, but need to be collectable unlike others
    this._effects = null;
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

HX.Entity.prototype = Object.create(HX.GroupNode.prototype);

HX.Entity.prototype.addComponents = function(components)
{
    for (var i = 0; i < components.length; ++i) {
        this.addComponent(components[i]);
    }
};

HX.Entity.prototype.removeComponents = function(components)
{
    for (var i = 0; i < components.length; ++i) {
        this.removeComponent(components[i]);
    }
};

HX.Entity.prototype.addComponent = function(component)
{
    if (component._entity)
        throw "Component already added to an entity!";

    this._components.push(component);

    component._entity = this;
    component.onAdded();
};

HX.Entity.prototype.removeComponent = function(component)
{
    component.onRemoved();
    var index = this._components.indexOf(component);
    if (index >= 0)
        this._components.splice(index, 1);
    component._entity = null;
};

HX.Entity.prototype.acceptVisitor = function(visitor)
{
    HX.GroupNode.prototype.acceptVisitor.call(this, visitor);

    if (this._effects)
        visitor.visitEffects(this._effects, this);
};

HX.Entity.prototype._registerEffect = function(effect)
{
    this._effects = this._effects || [];
    this._effects.push(effect);
};

HX.Entity.prototype._unregisterEffect = function(effect)
{
    var index = this._effects.indexOf(effect);
    this._effects.splice(index, 1);
    if (this._effects.length === 0)
        this._effects = null;
};