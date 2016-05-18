/**
 * @constructor
 */
HX.StatsDisplay = function(container)
{
    this._fpsCounter = new HX.FPSCounter(30);

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

    HX.onPreFrame.bind(this._update, this);
};

HX.StatsDisplay.prototype =
{
    remove: function()
    {
        this._div.parentNode.removeChild(this._div);
    },

    _update: function(dt)
    {
        this._fpsCounter.update(dt);
        this._div.innerHTML =
            "FPS: " + this._fpsCounter.averageFPS + "<br/>" +
            "Draws: " + HX._glStats.numDrawCalls + "<br/>" +
            "Tris: " + HX._glStats.numTriangles + "<br/>" +
            "Clears: " + HX._glStats.numClears + "<br/><br/>" +

            "<div style='font-size:x-small; width:100%; text-align:right;'>"+
            "Helix " + HX.VERSION + "<br/>" +
            "Hash 0x" + HX.BUILD_HASH.toString(16) + "<br/>" +
            "</div>";
    }
};