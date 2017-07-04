import {SceneNode} from "../scene/SceneNode";
import {Signal} from "../core/Signal";

function Entity()
{
    SceneNode.call(this);

    // components
    this._components = null;
    this._requiresUpdates = false;
    this._onRequireUpdatesChange = new Signal();

    // are managed by effect components, but need to be collectable unlike others
    this._effects = null;
}

/*Entity.create = function(components)
{
    var entity = new Entity();

    if (components) {
        var len = components.length;
        for (var i = 0; i < len; ++i)
            entity.addComponent(components[i]);
    }

    return entity;
};*/

Entity.prototype = Object.create(SceneNode.prototype);

Entity.prototype.addComponents = function(components)
{
    for (var i = 0; i < components.length; ++i)
        this.addComponent(components[i]);
};

Entity.prototype.removeComponents = function(components)
{
    for (var i = 0; i < components.length; ++i) {
        this.removeComponent(components[i]);
    }
};

Entity.prototype.hasComponentType = function(type)
{
    if (!this._components) return false;
    for (var i = 0; i < this._components.length; ++i) {
        if (this._components[i] instanceof type) return true;
    }
};

Entity.prototype.getComponentsByType = function(type)
{
    var collection = [];
    if (!this._components) return collection;
    for (var i = 0; i < this._components.length; ++i) {
        var comp = this._components[i];
        if (comp instanceof type) collection.push(comp);
    }
    return collection;
};

Entity.prototype.addComponent = function(component)
{
    if (component._entity)
        throw new Error("Component already added to an entity!");

    this._components = this._components || [];

    this._components.push(component);

    this._updateRequiresUpdates(this._requiresUpdates || (!!component.onUpdate));

    component._entity = this;
    component.onAdded();
};

Entity.prototype._updateRequiresUpdates = function(value)
{
    if (value !== this._requiresUpdates) {
        this._requiresUpdates = value;
        this._onRequireUpdatesChange.dispatch(this);
    }
};

Entity.prototype.removeComponent = function(component)
{
    component.onRemoved();

    var requiresUpdates = false;
    var len = this._components.length;
    var j = 0;
    var newComps = [];

    // not splicing since we need to regenerate _requiresUpdates anyway by looping
    for (var i = 0; i < len; ++i) {
        var c = this._components[i];
        if (c !== component) {
            newComps[j++] = c;
            requiresUpdates = requiresUpdates || !!component.onUpdate;
        }
    }

    this._components = j === 0? null : newComps;
    component._entity = null;
    this._updateRequiresUpdates(requiresUpdates);
};

Entity.prototype.acceptVisitor = function(visitor)
{
    SceneNode.prototype.acceptVisitor.call(this, visitor);

    // TODO: visit components

    if (this._effects)
        visitor.visitEffects(this._effects, this);
};

Entity.prototype.update = function(dt)
{
    var components = this._components;
    if (components) {
        var len = components.length;
        for (var i = 0; i < len; ++i) {
            var component = components[i];
            if (component.onUpdate) {
                component.onUpdate(dt);
            }
        }
    }
};

Entity.prototype._registerEffect = function(effect)
{
    this._effects = this._effects || [];
    this._effects.push(effect);
};

Entity.prototype._unregisterEffect = function(effect)
{
    var index = this._effects.indexOf(effect);
    this._effects.splice(index, 1);
    if (this._effects.length === 0)
        this._effects = null;
};

Entity.prototype._setScene = function(scene)
{
    if (this._scene)
        this._scene.entityEngine.unregisterEntity(this);

    if (scene)
        scene.entityEngine.registerEntity(this);

    SceneNode.prototype._setScene.call(this, scene);
};


export { Entity };