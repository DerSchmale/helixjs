import {Signal} from "../core/Signal";
import {Gamepad} from "./Gamepad";

var gamepads = [];
var usedGamepadCount = 0;

/**
 * Dispatched when a gamepad is connected.
 */
export var onGamepadConnected = new Signal();

/**
 * Dispatched when a gamepad is disconnected.
 */
export var onGamepadDisconnected = new Signal();

/**
 * Returns the connected gamepads as Gamepad objects that can be enabled in an {@linkcode Input} object. Entries
 * in the array may be undefined or null, depending on whether it was disconnected or not. If a gamepad is plugged in,
 * it's not necessarily available due to user agent security policies. You may have to interact with the pad. It will
 * then become available through the {@linkcode onGamepadConnected} signal.
 *
 * @see Gamepad
 * @see Input
 */
export function getGamepads()
{
    return gamepads;
}

/**
 * Returns the gamepad with a given index.
 *
 * @see Gamepad
 * @see Input
 */
export function getGamepad(index)
{
    return gamepads[index];
}

/**
 * @ignore
 */
function _onGamepadConnected(event)
{
    console.log("gamepad connected " + event.gamepad.id);

    var gamepad = new Gamepad(event.gamepad);
    gamepads[event.gamepad.index] = gamepad;
    onGamepadConnected.dispatch(gamepad);
}

/**
 * @ignore
 */
function _onGamepadDisconnected(event)
{
    console.log("gamepad disconnected " + event.gamepad.id);

    var index = event.gamepad.index;
    var gamepad = gamepads[index];
    // keep it sparse
    delete gamepads[index];
    onGamepadDisconnected.dispatch(gamepad);
}

/**
 * @ignore
 */
export function initGamepads()
{
    // no support for gamepads
    if (!navigator.getGamepads)
        return;

    var devices = navigator.getGamepads();
    if (!devices) return;

    for (var i = 0, l = devices.length; i < l; ++i) {

        // keep the list sparse to match the devices list
        if (devices[i])
            gamepads[i] = new Gamepad(devices[i]);
    }

    window.addEventListener("gamepadconnected", _onGamepadConnected);
    window.addEventListener("gamepaddisconnected", _onGamepadDisconnected);
}

// this is required for Chrome to update its gamepad state correctly!
export function updateGamepads()
{
    // don't update if we're not actually using any
    if (!usedGamepadCount || !navigator.getGamepads)
        return;

    var devices = navigator.getGamepads();
    if (!devices) return;

    for (var i = 0, l = gamepads.length; i < l; ++i) {
        var gamepad = gamepads[i];
        var device = devices[i];

        if (gamepad && device)
            gamepad._device = device;
    }
}

export function increaseUsedGamepads()
{
    ++usedGamepadCount;
}

export function decreaseUsedGamepads()
{
    --usedGamepadCount;
}