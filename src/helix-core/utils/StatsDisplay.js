/**
 * @classdesc
 * StatsDisplay is a simple display for render statistics.
 *
 * @param container The DOM element to add the stats to.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
import {FPSCounter} from "./FPSCounter";
import {frameTime, onPreFrame} from "../Helix";
import {_glStats} from "../core/GL";

function StatsDisplay(container)
{
    this._fpsCounter = new FPSCounter(30);
    this._width = 100;
    this._height = 95;

    this._dpr = window.devicePixelRatio || 1;

    this._elm = document.createElement("canvas");
    this._elm.style.position = "fixed";
    this._elm.style.left = "5px";
    this._elm.style.top = "5px";
    this._elm.style.width = this._width + "px";
    this._elm.style.height = this._height + "px";
    this._elm.width = this._pixelWidth = this._width * this._dpr;
    this._elm.height = this._pixelHeight = this._height * this._dpr;

    var fontSize = 10 * this._dpr;
    this._context = this._elm.getContext( '2d' );
    this._context.font = fontSize + 'px "Lucida Console",Monaco,monospace';
    // this._context.globalAlpha = 0;

    container = container || document.getElementsByTagName("body")[0];
    container.appendChild(this._elm);

    onPreFrame.bind(this._update, this);
}

StatsDisplay.prototype =
{
    /**
     * Removes the stats display from the container.
     */
    remove: function()
    {
        this._elm.parentNode.removeChild(this._elm);
    },

    _update: function(dt)
    {
        // when switching to VR context
        if (dt === 0.0) dt = 16;

        this._fpsCounter.update(dt);

        var ctx = this._context;

        ctx.fillStyle = "rgba(0, 0, 0, .5)";
        ctx.fillRect(0, 0, this._pixelWidth, this._pixelHeight);

        var innerTime = frameTime.toFixed(1);
        var outerTime = dt.toFixed(1);

        ctx.fillStyle = "#fff";
        ctx.fillText("FPS: " + this._fpsCounter.averageFPS, 10 * this._dpr, 15 * this._dpr);
        ctx.fillText("Time: " + innerTime + " (" + outerTime + ") ", 10 * this._dpr, 30 * this._dpr);
        ctx.fillText("Draws: " + _glStats.numDrawCalls, 10 * this._dpr, 45 * this._dpr);
        ctx.fillText("Tris: " + _glStats.numTriangles, 10 * this._dpr, 60 * this._dpr);
        ctx.fillText("Clears: " + _glStats.numClears, 10 * this._dpr, 75 * this._dpr);
    }
};

export { StatsDisplay };