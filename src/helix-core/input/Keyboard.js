import {InputPlugin} from "./InputPlugin";

/**
 * @classdesc
 *
 * The Keyboard class allows mapping keystrokes to named actions. The mapped "buttons" are the key codes or the character
 * values.
 *
 * @property {boolean} useCode If true, the mappings apply to key codes, if false, they apply to the pressed characters.
 * By default it is true, making for example WASD controls work on Azerty keyboards where W = Z, A = Q.
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
 * Maps two keys to represent an axis. This allows for example: "left" and "right"
 * @param negKey The key or character to represent the negative end of the axis.
 * @param posKey The key or character to represent the positive end of the axis.
 * @param action The action to map the axis on.
 */
Keyboard.prototype.mapAxis = function(negKey, posKey, action)
{
	this._signs[negKey] = -1;
	this._signs[posKey] = 1;
	this.map(negKey, action);
	this.map(posKey, action);
};

Keyboard.prototype.unmap = function(key)
{
	InputPlugin.prototype.unmap.call(key);
	delete this._signs[key];
};


Keyboard.prototype.onEnabled = function()
{
	window.addEventListener("keydown", this._onKeyDown);
	window.addEventListener("keyup", this._onKeyUp);
};

Keyboard.prototype.onDisabled = function()
{
	window.removeEventListener("keydown", this._onKeyDown);
	window.removeEventListener("keyup", this._onKeyUp);
};

Keyboard.prototype._onKeyDown = function(event)
{
	var key = this.useCode? event.code : event.key;

	if (this.isMapped(key)) {
		this.setValue(key, this._signs[key] || 1);
		event.preventDefault();
	}
};

Keyboard.prototype._onKeyUp = function(event)
{
	var key = this.useCode? event.code : event.key;

	if (this.isMapped(key)) {
		this.setValue(key, 0);
		event.preventDefault();
	}
};

export { Keyboard };