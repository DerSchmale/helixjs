import { Signal } from '../core/Signal';
import {capabilities, META} from "../Helix";

/**
 * Encapsulates behaviour to handle frames and time differences.
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FrameTicker()
{
    this._isRunning = false;
    this._dt = 0;
    this._currentTime = 0;
    this._tickFunc = this._tick.bind(this);
    this.onTick = new Signal();
}

FrameTicker.prototype = {

    /**
     * Starts automatically calling a callback function every animation frame.
     * @param callback Function to call when a frame needs to be processed.
     */
    start: function() {
        if (this._isRunning) return;
        this._currentTime = 0;
        this._isRunning = true;

        this._requestAnimationFrame();
    },

    /**
     * Stops calling the function.
     */
    stop: function() {
        this._isRunning = false;
    },

    /**
     * @returns {number} The time passed in between two frames
     */
    get dt() { return this._dt; },
    get time() { return this._currentTime; },

    /**
     * @private
     */
    _tick: function(time) {
        if (!this._isRunning) return;

        this._requestAnimationFrame();

        // difference with previous currentTime
        // var currentTime = (performance || Date).now();
        if (this._currentTime === 0)
            this._dt = 16;
        else
            this._dt = time - this._currentTime;

        this._currentTime = time;

        // this happens when switching to VR
        if (this._dt < 0) this._dt = 0;
        this.onTick.dispatch(this._dt);
    },

    /**
     * @private
     */
    _requestAnimationFrame: function()
    {
        if (capabilities.VR_CAN_PRESENT)
            META.VR_DISPLAY.requestAnimationFrame(this._tickFunc);
        else
            requestAnimationFrame(this._tickFunc);
    }
};

export { FrameTicker };