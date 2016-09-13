/**
 * Just a slight extension to HX.SimpleProject, to add debug mode number keys and an fps counter
 * @constructor
 */
DemoProject = function()
{
    HX.SimpleProject.call(this);
    this._stats = null;
};

DemoProject.prototype = Object.create(HX.SimpleProject.prototype);

DemoProject.prototype.init = function(canvas, initOptions)
{
    HX.SimpleProject.prototype.init.call(this, canvas, initOptions);

    this._stats = new HX.StatsDisplay();
    var debugInfoField = this._stats._div.cloneNode(false);
    debugInfoField.style.removeProperty("width");
    debugInfoField.style.removeProperty("left");
    debugInfoField.style.right = "10px";
    debugInfoField.style.top = "10px";
    debugInfoField.style.display = "none";

    document.body.appendChild(debugInfoField);
};