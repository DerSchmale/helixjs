import {SceneNode} from "../scene/SceneNode";
import {Signal} from "../core/Signal";
import {Bitfield} from "../core/Bitfield";

/**
 * @classdesc
 * Entity represents a node in the Scene graph that can have {@linkcode Component} objects added to it, which can
 * define its behavior in a modular way.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Entity()
{
    SceneNode.call(this);

    // components
    this._componentHash = new Bitfield();
    this._components = null;
    this._requiresUpdates = false;
    this._onComponentsChange = new Signal();

    // are managed by effect components, but need to be collectable unlike others
    this._effects = null;
}

Entity.prototype = Object.create(SceneNode.prototype);


/**
 * Adds a single {@linkcode Component} object to the Entity.
 */
Entity.prototype.addComponent = function(component)
{
    if (component._entity)
        throw new Error("Component already added to an entity!");

    var oldHash = this._componentHash;
    this._componentHash = this._componentHash.clone();

    this._components = this._components || [];

    this._components.push(component);
    this._componentHash.setBit(component.COMPONENT_ID);

    this._requiresUpdates = this._requiresUpdates || (!!component.onUpdate);

    component._entity = this;
    component.onAdded();

    this._onComponentsChange.dispatch(this, oldHash);
};

/**
 * Removes a single Component from the Entity.
 */
Entity.prototype.removeComponent = function(component)
{
    var requiresUpdates = false;
    var len = this._components.length;
    var j = 0;
    var newComps = [];

    var oldHash = this._componentHash;
    this._componentHash = new Bitfield();

    // not splicing since we need to regenerate _requiresUpdates anyway by looping
    for (var i = 0; i < len; ++i) {
        var c = this._components[i];
        if (c !== component) {
            newComps[j++] = c;
            requiresUpdates = requiresUpdates || !!component.onUpdate;
            this._componentHash.setBit(c.COMPONENT_ID);
        }
    }

    this._requiresUpdates = requiresUpdates;

    this._onComponentsChange.dispatch(this, oldHash);

    this._components = j === 0? null : newComps;
    component._entity = null;

    component.onRemoved();
};

/**
 * Adds multiple {@linkcode Component} objects to the Entity.
 * @param {Array} components An array of components to add.
 */
Entity.prototype.addComponents = function(components)
{
    for (var i = 0; i < components.length; ++i)
        this.addComponent(components[i]);
};

/**
 * Removes multiple {@linkcode Component} objects from the Entity.
 * @param {Array} components A list of components to remove.
 */
Entity.prototype.removeComponents = function(components)
{
    for (var i = 0; i < components.length; ++i) {
        this.removeComponent(components[i]);
    }
};

/**
 * @inheritDoc
 */
Entity.prototype.destroy = function()
{
    SceneNode.prototype.destroy.call(this);
    if (this._components)
	    this.removeComponents(this._components);
};


/**
 * Returns whether or not the Entity has a component of a given type assigned to it.
 */
Entity.prototype.hasComponentType = function(type)
{
    if (!this._components) return false;
    for (var i = 0; i < this._components.length; ++i) {
        if (this._components[i] instanceof type) return true;
    }
};

Entity.prototype.getFirstComponentByType = function(type)
{
    if (!this._components) return null;
    for (var i = 0; i < this._components.length; ++i) {
        var comp = this._components[i];
        if (comp instanceof type)
            return comp;
    }
    return null;
};

/**
 * Returns an array of all Components with a given type.
 */
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

/**
 * @ignore
 */
Entity.prototype.acceptVisitor = function(visitor)
{
    SceneNode.prototype.acceptVisitor.call(this, visitor);

    if (this._effects)
        visitor.visitEffects(this._effects, this);
};

/**
 * @ignore
 */
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

/**
 * @ignore
 */
Entity.prototype._registerEffect = function(effect)
{
    this._effects = this._effects || [];
    this._effects.push(effect);
};

/**
 * @ignore
 */
Entity.prototype._unregisterEffect = function(effect)
{
    var index = this._effects.indexOf(effect);
    this._effects.splice(index, 1);
    if (this._effects.length === 0)
        this._effects = null;
};

/**
 * @ignore
 */
Entity.prototype._setScene = function(scene)
{
    if (this._scene)
        this._scene.entityEngine.unregisterEntity(this);

    if (scene)
        scene.entityEngine.registerEntity(this);

    SceneNode.prototype._setScene.call(this, scene);
};

export { Entity };