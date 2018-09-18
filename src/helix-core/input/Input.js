import {Signal} from "../core/Signal";

/**
 * @classdesc
 *
 * The Input class allows mapping user input to named actions to simplify handling different input types. For example,
 * Mouse's movement and TouchInput's touch movements can both be used to look around. This can be done by enabling their
 * input plugins {@linkcode Mouse} and {@linkcode Touch} while mapping their axes (for example: {@linkcode Mouse#MOVE_X},
 * {@linkcode Mouse#MOVE_Y}, {@linkcode Touch#MOVE_X}, {@linkcode Touch#MOVE_X}} to "actions" (usually strings or enum
 * values). You can then poll the actions to get the input value assigned to it from any input device.
 * When supporting multiple users on a single device, multiple Input classes can be created with each having their own
 * mappings.
 *
 * @property {Signal} onAction A {@linkcode Signal} that dispatches whenever an action value changes. This should be
 * listened to for "triggered" events, not for continuous "while button down" events. For example: jumping is normally
 * a triggered event, while walking is continuous and would be polled using {@linkcode Input#getValue}.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
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
	 *
	 * {@see Gamepad}
	 * {@see Keyboard}
	 * {@see Mouse}
	 * {@see MouseLock}
	 * {@see Touch}
	 */
	enable: function(input)
	{
		if (this._plugins.indexOf(input) >= 0)
			return;

		this._plugins.push(input);
		input._setInput(this);
	},

	/**
	 * Disables an input plugin.
	 *
     * {@see Gamepad}
     * {@see Keyboard}
     * {@see Mouse}
     * {@see MouseLock}
     * {@see Touch}
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
		this._values[name] = value;
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