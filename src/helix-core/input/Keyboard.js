import {InputPlugin} from "./InputPlugin";

/**
 * @classdesc
 *
 * The Keyboard class enabled keyboard input in {@linkcode Input} The mapped "buttons" are the key codes or the character
 * values. Which of the two depends on the {@linkcode Keyboard#useCode} property.
 *
 * @property mode If {@linkcode Keyboard#MODE_KEY_LOCATION}, the button mappings apply to key "codes" representing the
 * key locations on the keyboard ("KeyA", "LeftShift", etc) as specified on a QWERTY keyboard. If {Keyboard.MODE_KEY_VALUE},
 * they apply to the pressed characters. By default it uses locations, making for example WASD controls work on
 * Azerty keyboards where W = Z, A = Q. In either case, the old API's keycode will always be used as fallback so
 * until the new KeyboardEvent API is implemented reliably by browsers, you should also map the old integer keyCodes.
 *
 * {@see KeyboardEvent#code}
 * {@see KeyboardEvent#key}
 *
 * @constructor
 */
function Keyboard()
{
	InputPlugin.call(this);
	this.mode = Keyboard.MODE_KEY_LOCATION;
	this._onKeyUp = this._onKeyUp.bind(this);
	this._onKeyDown = this._onKeyDown.bind(this);
	this._axisMap = {};
}

Keyboard.MODE_KEY_VALUE = 0;
Keyboard.MODE_KEY_LOCATION = 1;

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
	this._axisMap[negKey] = { value: -range, opposite: posKey, isDown: false };
	this._axisMap[posKey] = { value: range, opposite: negKey, isDown: false };
	this.map(negKey, action);
	this.map(posKey, action);
};

/**
 * @inheritDoc
 */
Keyboard.prototype.unmap = function(key)
{
	InputPlugin.prototype.unmap.call(key);
	delete this._axisMap[key];
};

/**
 * @ignore
 */
Keyboard.prototype.onEnabled = function()
{
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
};

/**
 * @ignore
 */
Keyboard.prototype.onDisabled = function()
{
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
};

/**
 * @ignore
 * @private
 */
Keyboard.prototype._onKeyDown = function(event)
{
	var key = this.mode? event.code || event.keyCode : event.key || event.keyCode;

	if (this.isMapped(key)) {
		var data = this._axisMap[key];

		if (data) {
            var otherEnd = this._axisMap[data.opposite];
            data.isDown = true;

            // both ends are down, cancel eachother out
            if (otherEnd.isDown)
            	this.setValue(key, 0);
            else
                this.setValue(key, data.value);
        }
        else {
            this.setValue(key, 1);
		}

		event.preventDefault();
	}
};

/**
 * @ignore
 * @private
 */
Keyboard.prototype._onKeyUp = function(event)
{
    var key = this.mode? event.code || event.keyCode : event.key || event.keyCode;

	if (this.isMapped(key)) {
        var data = this._axisMap[key];
        if (data) {
            var otherEnd = this._axisMap[data.opposite];

            data.isDown = false;

            // need to restore the other key's value if it's still down
            if(otherEnd.isDown)
                this.setValue(key, otherEnd.value);
            else
                this.setValue(key, 0);
        }
        else
			this.setValue(key, 0);
		event.preventDefault();
	}
};

export { Keyboard };