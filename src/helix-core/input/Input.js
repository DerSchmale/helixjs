import {Signal} from "../core/Signal";

/**
 * @classdesc
 *
 * The Input class allows mapping user input to named actions to simplify handling different input types. For example,
 * Mouse's movement and TouchInput's touch movements can both be used to look around. Values triggered by buttons are
 * 0 or 1, axes such as mouse or gamepad movement are generally in between 0 and 1.
 *
 * @property {Signal} onAction A {@linkcode Signal} that dispatches whenever an action occurs. This only happens when
 * the state of an input changes, so should be listened to for triggered events, not for continuous "while button down" events.
 *
 * @constructor
 */
function Input()
{
	this.onAction = new Signal(/* name, value */);

	this._values = {};
	this._plugins = [];
}

Input.prototype =
{
	/**
	 * Enables an input plugin.
	 */
	enable: function(input)
	{
		this._plugins.push(input);
		input._setInput(this);
	},

	/**
	 * Disables an input plugin.
	 */
	disable: function(input)
	{
		var index = this._plugins.indexOf(input);
		this._plugins.splice(index, 1);
		input._setInput(null);
	},

	/**
	 * @ignore
	 */
	setActionValue: function(name, value)
	{
		if (this._values[name] === value) return;
		this._values[name] =  value;
		this.onAction.dispatch(name, value);
	},

	/**
	 * Gets the value currently associated with an action.
	 */
	getValue: function(name)
	{
		return this._values[name] || 0;
	}
};

export { Input };