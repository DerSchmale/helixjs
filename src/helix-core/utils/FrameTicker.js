import { Signal } from '../core/Signal';

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if(!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    if(!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());


/**
 * Encapsulates behaviour to handle frames and time differences.
 * @constructor
 */

function FrameTicker()
{
    this._isRunning = false;
    this._callback = undefined;
    this._dt = 0;
    this._currentTime = 0;
    this.onTick = new Signal();
}

FrameTicker.prototype = {

    /**
     * Starts automatically calling a callback function every animation frame.
     * @param callback Function to call when a frame needs to be processed.
     */
    start: function(callback) {
        if (this._isRunning) return;
        this._callback = callback;
        this._currentTime = this._getTime();
        this._isRunning = true;
        this._tick();
        this._tick._this = this;
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
    _tick: function() {
        if (!this._isRunning) return;

        self.requestAnimationFrame(this._tick.bind(this));

        var currentTime = this._getTime();
        this._dt = currentTime - this._currentTime;
        // IsNan (on Safari?)
        if (this._dt !== this._dt) this._dt = 0;
        this._currentTime = currentTime;

        if(this._callback)
            this._callback(this._dt);

        this.onTick.dispatch(this._dt);
    },

    /**
     * @private
     */
    _getTime: function() {
        if (self.performance === undefined || self.performance.now === undefined)
            return Date.now();
        else
            return self.performance.now();
    }
};

export { FrameTicker };