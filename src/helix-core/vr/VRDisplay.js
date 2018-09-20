import {Signal} from "../core/Signal";
import {getGamepads, onGamepadConnected, onGamepadDisconnected} from "../input/gamepads";
import {Gamepad} from "../input/Gamepad";
import {Matrix4x4} from "../math/Matrix4x4";
import {META} from "../Helix";
import {Float2} from "../math/Float2";
import {Transform} from "../math/Transform";

/**
 * @classdesc
 *
 * VRDisplay represents a VR display. It's a wrapper for the native VRDisplay class, and provides some convienence
 * methods to retrieve the controllers.
 *
 * @property {Signal} onGamepadConnected A signal that is dispatched when a Gamepad associated with this VR display is
 * connected. This only applies if controllers have hand information (otherwise, use the standard gamepad queries).
 * @property {Signal} onGamepadDisconnected A signal that is dispatched when a Gamepad associated with this VR display
 * has disconnected. This only applies if controllers have hand information (otherwise, use the standard gamepad queries).
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VRDisplay(display)
{
    this._display = display;
    this.onGamepadConnected = new Signal();
    this.onGamepadDisconnected = new Signal();

    this.requestAnimationFrame = display.requestAnimationFrame.bind(display);
    this.cancelAnimationFrame = display.cancelAnimationFrame.bind(display);
    this.getEyeParameters = display.getEyeParameters.bind(display);
    this.getFrameData = display.getFrameData.bind(display);
    this.capabilities = display.capabilities;

    this._gamepadLeft = null;
    this._gamepadRight = null;

    this.sittingToStandingTransform = null;
    this.roomSize = undefined;

    if (display.stageParameters) {
        // this is actually an inverse matrix
        if (display.stageParameters.sittingToStandingTransform) {
            this.sittingToStandingTransform = new Matrix4x4(display.stageParameters.sittingToStandingTransform);
            var t = new Transform();
            this.sittingToStandingTransform.decompose(t);
            var temp = t.position.y;
            t.position.y = -t.position.z;
            t.position.z = temp;
            temp = t.rotation.y;
            t.rotation.y = -t.rotation.z;
            t.rotation.z = temp;
            this.sittingToStandingTransform.compose(t);
        }

        if (display.stageParameters.sizeX) {
            this.roomSize = new Float2(display.stageParameters.sizeX, display.stageParameters.sizeY);
        }
    }

    // provide default
    if (!this.sittingToStandingTransform) {
        this.sittingToStandingTransform = new Matrix4x4();
        this.sittingToStandingTransform.fromTranslation(0, 0, META.OPTIONS.vrUserHeight);
    }
}

VRDisplay.prototype = {
    /**
     * The display name of the VR device.
     */
    get displayName()
    {
        return this._display.displayName;
    },

    /**
     * The display id of the VR device.
     */
    get displayId()
    {
        return this._display.displayId;
    },

    get gamepads()
    {
        return this._gamepads;
    },

    /**
     * The left handed Gamepad device associated with this display, if present.
     */
    get gamepadLeft()
    {
        return this._gamepadLeft;
    },

    /**
     * The right handed Gamepad device associated with this display, if present.
     */
    get gamepadRight()
    {
        return this._gamepadRight;
    },

    /**
     * Indicates whether or not the display is currently presenting
     */
    get isPresenting()
    {
        return this._display.isPresenting;
    },

    /**
     * Stops presenting.
     */
    exitPresent: function()
    {
        this._display.exitPresent();
    },

    /**
     * called by vr.js
     * @ignore
     */
    onEnabled: function ()
    {
        onGamepadConnected.bind(this._onGamepadConnected, this);
        onGamepadDisconnected.bind(this._onGamepadDisconnected, this);

        getGamepads().forEach(this._onGamepadConnected.bind(this));
    },

    /**
     * called by vr.js
     * @ignore
     */
    onDisabled: function ()
    {
        onGamepadConnected.unbind(this._onGamepadConnected, this);
        onGamepadDisconnected.unbind(this._onGamepadDisconnected, this);
    },

    /**
     * @ignore
     * @private
     */
    _onGamepadConnected: function (gamepad)
    {
        // sometimes, Chrome will notify a connected gamepad without giving the correct hand information
        if (gamepad.displayId === this.displayId) {
            // if controller is already set, it's probably a case where the gamepad query comes after the connect event
            // (although connect doesn't seem to trigger with VR controllers, can't be safe enough)
            if (gamepad.hand === Gamepad.HAND_LEFT && !this._gamepadLeft) {
                console.log("Left VR controller connected");
                this._gamepadLeft = gamepad;
                this.onGamepadConnected.dispatch(gamepad);
            }
            else if (gamepad.hand === Gamepad.HAND_RIGHT && !this._gamepadRight) {
                console.log("Right VR controller connected");
                this._gamepadRight = gamepad;
                this.onGamepadConnected.dispatch(gamepad);
            }
        }
    },

    /**
     * @ignore
     * @private
     */
    _onGamepadDisconnected: function (gamepad)
    {
        if (gamepad.displayId === this.displayId) {
            if (gamepad.hand === Gamepad.HAND_LEFT) {
                this._gamepadLeft = null;
                this.onGamepadDisconnected.dispatch(gamepad);
            }
            else if (gamepad.hand === Gamepad.HAND_RIGHT) {
                this._gamepadRight = null;
                this.onGamepadDisconnected.dispatch(gamepad);
            }
        }
    }
};

export {VRDisplay};