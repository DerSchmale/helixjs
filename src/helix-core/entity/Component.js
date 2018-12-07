import {Bitfield} from "../core/Bitfield";

Component.COMPONENT_ID = 0;

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
 * Custom Component subclasses need to be registered for use with:
 *
 * <pre><code>
 * Component.register(name, classRef);
 * </pre></code>
 *
 * The name parameter is used to access component instances using the {@linkcode Entity#components.name[]} Array. By
 * default, the name is the same as the class name but starting with a lowercase letter.
 *
 * A component class can have a static member `dependencies`, which is an `Array` listing the components it requires to
 * be added to an Entity first.
 * @see {@linkcode Entity}
 *
 * @property entity The entity the component is assigned to.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Component()
{
	this.name = "";
	// this allows notifying entities about bound changes (useful for sized components)
	this.entity = null;
	this._enabled = true;
	this._bounds = null;
	this._boundsInvalid = true;
}

var COUNTER = 0;
var componentMap = {};

Component.register = function(name, classRef)
{
	classRef.COMPONENT_ID = ++COUNTER;
	classRef.COMPONENT_NAME = name;
	classRef.prototype.COMPONENT_ID = classRef.COMPONENT_ID;
	classRef.prototype.COMPONENT_NAME = classRef.COMPONENT_NAME;
	if (classRef.dependencies) {
		classRef.prototype.DEPENDENCY_HASH = new Bitfield();
		for (var i = 0, len = classRef.dependencies; i < len; ++i) {
			classRef.prototype.DEPENDENCY_HASH.setBit(classRef.dependencies[i].COMPONENT_ID);
		}
	}
	componentMap[name] = classRef;
};

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
		 * Defines whether or not this component should be enabled.
		 */
		get enabled()
		{
			return this._enabled;
		},

		set enabled(value)
		{
			if (this.entity) {
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

        /**
		 * @ignore
         * @private
         */
		_updateBounds: function ()
		{
		},

        /**
		 * Marks the bounds as invalid, causing them to be recalculated when next queried.
         */
		invalidateBounds: function ()
		{
			this._boundsInvalid = true;

			if (this.entity)
				this.entity.invalidateBounds();
		},

		/**
		 * Creates a duplicate of this Component.
		 */
		clone: function()
		{
			throw new Error("Abstract method called!");
		},

        /**
		 * Broadcasts a message dispatched by the owning Entity's onMessage Signal.
         */
        broadcast: function(name, args)
		{
            if (this.entity) {
            	var messenger = this.entity.messenger;
            	messenger.broadcast.apply(messenger, arguments);
            }
		},

        /**
		 * Tests whether the given signal is being listened to.
         */
        hasListeners: function(name)
		{
            if (this.entity) {
				return this.entity.messenger.hasListeners(name);
            }
            return false;
		},

        /**
		 * Listens to the entity's messenger for a given message type.
         */
        bindListener: function(name, func, thisRef)
		{
            this.entity.messenger.bind(name, func, thisRef);
		},

        /**
         * Listens to the entity's messenger for a given message type.
         */
        unbindListener: function(name, func)
        {
            this.entity.messenger.unbind(name, func);
        }
	};


export {Component};