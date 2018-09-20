// @author derschmale <http://www.derschmale.com>

import {capabilities, META} from "../Helix";
import {VRDisplay} from "./VRDisplay";

var _isVRPresenting = false;

export function isVRPresenting()
{
    return _isVRPresenting;
}

/**
 * Turns on a VR display
 */
export function enableVR(display, onFail)
{
    if (META.VR_DISPLAY)
        throw new Error("VR already enabled!");

    META.VR_DISPLAY = display;
    display.onEnabled();

    capabilities.VR_CAN_PRESENT = display.capabilities.canPresent;

    if (capabilities.VR_CAN_PRESENT) {
        META.VR_LEFT_EYE_PARAMS = display.getEyeParameters("left");
        META.VR_RIGHT_EYE_PARAMS = display.getEyeParameters("right");

        META.VR_DISPLAY._display.requestPresent([{
            source: META.TARGET_CANVAS
        }]).then(function() {
            _isVRPresenting = true;
        }, onFail);

        META.TARGET_CANVAS.width = Math.max(META.VR_LEFT_EYE_PARAMS.renderWidth, META.VR_RIGHT_EYE_PARAMS.renderWidth);
        META.TARGET_CANVAS.height = Math.max(META.VR_LEFT_EYE_PARAMS.renderHeight, META.VR_RIGHT_EYE_PARAMS.renderHeight);
    }

    console.log("Starting VR on " + display.displayName);
}

export function disableVR()
{
    if (!META.VR_DISPLAY) return;

    META.VR_DISPLAY.onDisabled();
    _isVRPresenting = false;

    if (META.VR_DISPLAY.isPresenting)
        META.VR_DISPLAY.exitPresent();

    capabilities.VR_CAN_PRESENT = false;
    META.VR_DISPLAY = null;
    META.VR_LEFT_EYE_PARAMS = null;
    META.VR_RIGHT_EYE_PARAMS = null;
}

/**
 * Asynchronously retrieves the available VR displays and passes them into a callback function.
 */
export function getVRDisplays(callback)
{
    if (!navigator.getVRDisplays) {
        callback([]);
        return;
    }

    navigator.getVRDisplays().then(function (displays) {
        var mappedDisplays = [];

        displays.forEach(function(display) {
            mappedDisplays.push(new VRDisplay(display));
        });

        callback(mappedDisplays);
    });
}