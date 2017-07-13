/**
 * @abstract
 *
 * @constructor
 *
 * @classdesc
 * <p>A Component is an object that can be added to an {@linkcode Entity} to add behavior to it in a modular fashion.
 * This can be useful to create small pieces of functionality that can be reused often and without extra boilerplate code.</p>
 * <p>If it implements an onUpdate(dt) function, the update method will be called every frame.</p>
 * <p>A single Component instance is unique to an Entity and cannot be shared!</p>
 *
 * @see {@linkcode Entity}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Component()
{
    // this allows notifying entities about bound changes (useful for sized components)
    this._entity = null;
}

Component.prototype =
{
    /**
     * Called when this component is added to an Entity.
     */
    onAdded: function() {},

    /**
     * Called when this component is removed from an Entity.
     */
    onRemoved: function() {},

    /**
     * If provided, this method will be called every frame, allowing updating the entity.
     * @param [Number] dt The amount of milliseconds passed since last frame.
     */
    onUpdate: null,

    /**
     * The target entity.
     */
    get entity()
    {
        return this._entity;
    }
};

export { Component };