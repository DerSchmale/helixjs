import {InputPlugin} from "./InputPlugin";
import {onPreFrame} from "../Helix";
import {Float4} from "../math/Float4";
import {decreaseUsedGamepads, increaseUsedGamepads} from "./gamepads";
import {Quaternion} from "../math/Quaternion";

/**
 * @classdesc
 *
 * The Gamepad class enables gamepad input in {@linkcode Input}. The Javascript Gamepad API is currently still
 * experimental, hence this input type should be handled with care. Gamepad objects should not be created manually
 * unless you're querying the native gamepad API directly. Otherwise, get them from {@linkcode getGamepads} or {@linkcode
 * onGamepadConnected}.
 *
 * The button names for mapping are simply their integer indexes. Similar to axes, but they start from 0x100. For
 * convenience, you can use the <code>Gamepad.A</code>, <code>Gamepad.DPAD_UP</code>, ... enum. The naming of these is
 * based on the default Windows (XBox) and similar controllers. This will only apply if the mapping property is "standard".
 * If the gamepad supports it, button "touches" rather than presses can also be mapped.
 * If the buttons are analog, the communicated values will be between 0 and 1. Alternatively, you can also map "pressed"
 * and "touched" states by providing <code>(buttonName | Gamepad.PRESS)</code> or <code>(buttonName | Gamepad.TOUCH)</code>
 *
 * @property displayId The id of the VR display this gamepad is associated with, if any.
 * @property id The gamepad's id.
 * @property index The gamepad's index. This matches the index in the array returned by {@linkcode getGamepads}
 * @property mapping The mapping the user agent applies to the buttons. If not "standard", the input may not behave as
 * expected. If this is a specific type of gamepad or controller, you may want to provide custom mapping based on its id.
 * @property axisDeadzone The range for the axes to be considered "0". This assumes a default controller scheme where
 * @property hand Either {@linkcode Gamepad#HAND_LEFT} or {@linkcode Gamepad#HAND_RIGHT}. Used for VR controllers.
 *
 * @see {@link https://w3c.github.io/gamepad/#remapping}
 *
 * @constructor
 */
function Gamepad(device)
{
    InputPlugin.call(this);

    this.axisDeadzone = 0.251;

    this._device = device;
    this._hasPosition = false;
    this._hasRotation = false;
    this._position = new Float4();
    this._rotation = new Quaternion();
    this._linearVelocity = new Float4(0, 0, 0, 0);
    this._angularVelocity = new Float4(0, 0, 0, 0);
    this._linearAcceleration = new Float4(0, 0, 0, 0);
    this._angularAcceleration = new Float4(0, 0, 0, 0);
}

/**
 * The bottom button in the right cluster. On PS: Cross.
 */
Gamepad.A = 0;

/**
 * The right button in the right cluster. On PS: Circle.
 */
Gamepad.B = 0x01;

/**
 * The left button in the right cluster. On PS: Square.
 */
Gamepad.X = 0x02;

/**
 * The top button in the right cluster. On PS: Triangle.
 */
Gamepad.Y = 0x03;

/**
 * The top left trigger/bumper. On PS: L1.
 */
Gamepad.LB = 0x04;

/**
 * The top right trigger/bumper. On PS: R1.
 */
Gamepad.RB = 0x05;

/**
 * The bottom left trigger. On PS: L2.
 */
Gamepad.LT = 0x06;

/**
 * The bottom right trigger. On PS: R2.
 */
Gamepad.RT = 0x07;

/**
 * The back/select button.
 */
Gamepad.BACK = 0x08;

/**
 * The start button.
 */
Gamepad.START = 0x09;

/**
 * The left analog stick pressed down.
 */
Gamepad.L3 = 0x10;

/**
 * The right analog stick pressed down.
 */
Gamepad.R3 = 0x11;

/**
 * The up button on the directional pad.
 */
Gamepad.DPAD_UP = 0x12;

/**
 * The down button on the directional pad.
 */
Gamepad.DPAD_DOWN = 0x13;

/**
 * The left button on the directional pad.
 */
Gamepad.DPAD_LEFT = 0x14;

/**
 * The right button on the directional pad.
 */
Gamepad.DPAD_RIGHT = 0x15;

/**
 * The horizontal axis of the left analog stick.
 */
Gamepad.STICK_LX = 0x100;

/**
 * The vertical axis of the left analog stick.
 */
Gamepad.STICK_LY = 0x101;

/**
 * The horizontal axis of the right analog stick.
 */
Gamepad.STICK_RX = 0x102;

/**
 * The vertical axis of the right analog stick.
 */
Gamepad.STICK_RY = 0x103;

/**
 * Combine with a button name to indicate that the action is only interested in the pressed state, not the analog value:
 * <code>gamepad.map(name | Gamepad.PRESSED, "action")</code>
 */
Gamepad.PRESS = 0x1000;

/**
 * Combine with a button name to indicate that the action is interested in the touched state, if the gamepad supports this.
 * <code>gamepad.map(name | Gamepad.TOUCHED, "action")</code>
 */
Gamepad.TOUCH = 0x2000;

Gamepad.HAND_LEFT = "left";
Gamepad.HAND_RIGHT = "right";

Gamepad.prototype = Object.create(InputPlugin.prototype, {
    hasPosition: {
        get: function()
        {
            return this._hasPosition;
        }
    },

    hasRotation: {
        get: function()
        {
            return this._hasRotation;
        }
    },

    linearVelocity: {
        get: function() {
            return this._linearVelocity;
        }
    },

    angularVelocity: {
        get: function() {
            return this._angularVelocity;
        }
    },

    linearAcceleration: {
        get: function() {
            return this._linearAcceleration;
        }
    },

    angularAcceleration: {
        get: function() {
            return this._angularAcceleration;
        }
    },

    position: {
        get: function() {
            return this._position;
        }
    },

    rotation: {
        get: function() {
            return this._rotation;
        }
    },

    displayId: {
        get: function()
        {
            return this._device.displayId;
        }
    },

    id: {
        get: function()
        {
            return this._device.id;
        }
    },

    index: {
        get: function()
        {
            return this._device.index;
        }
    },

    mapping: {
        get: function()
        {
            return this._device.mapping;
        }
    },

    hand: {
        get: function()
        {
            return this._device.hand;
        }
    }
});

/**
 * @ignore
 */
Gamepad.prototype.onEnabled = function()
{
    increaseUsedGamepads();
    onPreFrame.bind(this._onPreFrame, this);
};

/**
 * @ignore
 */
Gamepad.prototype.onDisabled = function()
{
    decreaseUsedGamepads();
    onPreFrame.unbind(this._onPreFrame);
};

/**
 * @ignore
 * @private
 */
Gamepad.prototype._onPreFrame = function()
{
    var device = this._device;
    if (!device.connected) return;

    var buttons = device.buttons;
    var axes = device.axes;

    for (var i = 0, len = buttons.length; i < len; ++i) {
        var button = buttons[i];
        this.setValue(i, button.value);
        this.setValue(i | Gamepad.PRESS, button.pressed? 1 : 0);

        if (button.touched !== undefined)
            this.setValue(i | Gamepad.TOUCH, button.touched? 1 : 0);

    }

    var deadzone = this.axisDeadzone;

    var i, len;

    if (deadzone > 0) {
        var deadzoneSqr = deadzone * deadzone;
        var rcpDeadZone = 1.0 / (1.0 - deadzone); // this remaps it to 0 - 1 after applying deadzone

        // this assumes a default controller
        for (i = 0, len = axes.length; i < len; i += 2) {
            var x = axes[i];
            var y = axes[i | 1];
            var magSqr = x * x + y * y;
            if (magSqr > deadzoneSqr) {
                var mag = Math.sqrt(magSqr);
                var newMag = (mag - deadzone) * rcpDeadZone;
                var sc = newMag / mag;  // this scales to the new magnitude
                this.setValue(i | 0x100, x * sc);
                this.setValue(i | 0x101, y * sc);
            }
            else {
                this.setValue(i | 0x100, 0);
                this.setValue(i | 0x101, 0);
            }
        }
    }
    else {
        for (i = 0, len = axes.length; i < len; ++i) {
            var v = axes[i];
            this.setValue(i | 0x100, v);
        }
    }

    var pose = this._device.pose;

    if (pose) {
        var pos = pose.position;
        var quat = pose.orientation;
        var lv = pose.linearVelocity;
        var av = pose.angularVelocity;
        var la = pose.linearAcceleration;
        var aa = pose.angularAcceleration;

        // may have to swap orientation again... (see VRCamera)
        if (pos) {
            this._position.set(pos[0], -pos[2], pos[1]);
            this._hasPosition = true;
        }
        else
            this._hasPosition = false;

        if (quat) {
            this._rotation.set(quat[0], -quat[2], quat[1], quat[3]);
            this._hasRotation = true;
        }
        else {
            this._hasRotation = false;
        }
        if (lv) this._linearVelocity.set(lv[0], -lv[2], lv[1]);
        if (la) this._linearAcceleration.set(la[0], -la[2], la[1]);
        if (av) this._angularVelocity.set(av[0], -av[2], av[1]);
        if (aa) this._angularAcceleration.set(aa[0], -aa[2], aa[1]);
    }
};

export { Gamepad };