import {FPSCounter} from "./FPSCounter";
import {META, onPreFrame} from "../Helix";
import {_glStats} from "../core/GL";

/**
 * @classdesc
 * StatsDisplay is a simple display for render statistics.
 *
 * @param container The DOM element to add the stats to.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function StatsDisplay(container)
{
    this._fpsCounter = new FPSCounter(30);

    this._div = document.createElement("div");
    this._div.style.position = "absolute";
    this._div.style.left = "5px";
    this._div.style.top = "5px";
    this._div.style.width = "100px";
    //this._div.style.height = "100px";
    this._div.style.background = "rgba(0, 0, 0, .5)";
    this._div.style.padding = "10px 15px 10px 15px";
    this._div.style.color = "#ffffff";
    this._div.style.fontFamily = '"Lucida Console", Monaco, monospace';
    this._div.style.fontSize = "small";

    container = container || document.getElementsByTagName("body")[0];
    container.appendChild(this._div);

    onPreFrame.bind(this._update, this);
}

StatsDisplay.prototype =
{
    /**
     * Removes the stats display from the container.
     */
    remove: function()
    {
        this._div.parentNode.removeChild(this._div);
    },

    _update: function(dt)
    {
        this._fpsCounter.update(dt);
        this._div.innerHTML =
            "FPS: " + this._fpsCounter.averageFPS + "<br/>" +
            "Draws: " + _glStats.numDrawCalls + "<br/>" +
            "Tris: " + _glStats.numTriangles + "<br/>" +
            "Clears: " + _glStats.numClears + "<br/><br/>" +

            "<div style='font-size:x-small; width:100%; text-align:right;'>"+
            "Helix " + META.VERSION + "<br/>" +
            "</div>";
    }
};

export { StatsDisplay };