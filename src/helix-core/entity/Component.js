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
 * Instead of using Object.create, Component subclasses need to be extended using
 *
 * <pre><code>
 * Component.create(SubComponentClass, props);
 * </pre></code>
 *
 * @see {@linkcode Entity}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Component()
{
	// this allows notifying entities about bound changes (useful for sized components)
	this._entity = null;
	this._enabled = true;
	this._bounds = null;
	this._boundsInvalid = true;
}

Component.COMPONENT_ID = 0;

Component.create = (function (constrFunction, props, baseClass)
{
	var COUNTER = 0;

	return function (constrFunction, props, baseClass)
	{
		baseClass = baseClass || Component;
		constrFunction.prototype = Object.create(baseClass.prototype, props);
		constrFunction.COMPONENT_ID = ++COUNTER;
		constrFunction.prototype.COMPONENT_ID = constrFunction.COMPONENT_ID;
	};
}());

Component.prototype =
	{
		/**
		 * If a Component has a scene presence, it can have bounds
		 */
		get bounds()
		{
			if (this._boundsInvalid) {
				if (this._bounds) this._updateBounds();
				this._boundsInvalid = false;
			}
			return this._bounds;
		},

		/**
		 * Called when this component is added to an Entity.
		 */
		onAdded: function ()
		{
		},

		/**
		 * Called when this component is removed from an Entity.
		 */
		onRemoved: function ()
		{
		},

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
		},

		/**
		 * Defines whether or not this component should be enabled.
		 */
		get enabled()
		{
			return this._enabled;
		},

		set enabled(value)
		{
			if (this._entity) {
				if (value)
					this.onAdded();
				else
					this.onRemoved();
			}
			this._enabled = value;
		},

		/**
		 * If provided, this method will be called by the scene partition traverser, allowing collection by the renderer.
		 */
		acceptVisitor: null,

		_updateBounds: function ()
		{
		},

		_invalidateBounds: function ()
		{
			this._boundsInvalid = true;

			if (this._entity)
				this._entity._invalidateBounds();
		}
	};


export {Component};