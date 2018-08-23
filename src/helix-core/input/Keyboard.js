import {InputPlugin} from "./InputPlugin";

/**
 * @classdesc
 *
 * The Keyboard class enabled keyboard input in {@linkcode Input} The mapped "buttons" are the key codes or the character
 * values. Which of the two depends on the {@linkcode Keyboard#useCode} property.
 *
 * @property {boolean} useCode If true, the button mappings apply to key codes ("KeyA", "LeftShift", etc). If false,
 * they apply to the pressed characters. By default it is true, making for example WASD controls work on Azerty
 * keyboards where W = Z, A = Q.
 *
 * {@see KeyboardEvent#code}
 * {@see KeyboardEvent#key}
 *
 * @constructor
 */
function Keyboard()
{
	InputPlugin.call(this);
	this.useCode = true;
	this._onKeyUp = this._onKeyUp.bind(this);
	this._onKeyDown = this._onKeyDown.bind(this);
	this._signs = {};
}

Keyboard.prototype = Object.create(InputPlugin.prototype);

/**
 * Maps two keys to represent an axis. For example mapping "ArrowLeft" and "ArrowRight" can be mapped to (-1, 1).
 * @param {string} negKey The key or character to represent the negative end of the axis.
 * @param {string} posKey The key or character to represent the positive end of the axis.
 * @param action The action to map the axis on.
 * @param {number} [range] The maximum value the key represents. Defaults to 1.
 */
Keyboard.prototype.mapAxis = function(negKey, posKey, action, range)
{
	var range = range || 1;
	this._signs[negKey] = -range;
	this._signs[posKey] = range;
	this.map(negKey, action);
	this.map(posKey, action);
};

/**
 * @inheritDoc
 */
Keyboard.prototype.unmap = function(key)
{
	InputPlugin.prototype.unmap.call(key);
	delete this._signs[key];
};

/**
 * @ignore
 */
Keyboard.prototype.onEnabled = function()
{
	window.addEventListener("keydown", this._onKeyDown);
	window.addEventListener("keyup", this._onKeyUp);
};

/**
 * @ignore
 */
Keyboard.prototype.onDisabled = function()
{
	window.removeEventListener("keydown", this._onKeyDown);
	window.removeEventListener("keyup", this._onKeyUp);
};

/**
 * @ignore
 * @private
 */
Keyboard.prototype._onKeyDown = function(event)
{
	var key = this.useCode? event.code : event.key;

	if (this.isMapped(key)) {
		this.setValue(key, this._signs[key] || 1);
		event.preventDefault();
	}
};

/**
 * @ignore
 * @private
 */
Keyboard.prototype._onKeyUp = function(event)
{
	var key = this.useCode? event.code : event.key;

	if (this.isMapped(key)) {
		this.setValue(key, 0);
		event.preventDefault();
	}
};

export { Keyboard };