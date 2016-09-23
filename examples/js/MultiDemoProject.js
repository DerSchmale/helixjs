/**
 * Just a slight extension to HX.SimpleProject, to add debug mode number keys and an fps counter
 * @constructor
 */
MultiDemoProject = function()
{
    HX.MultiViewProject.call(this);
    this._stats = null;
};

MultiDemoProject.prototype = Object.create(HX.MultiViewProject.prototype);

MultiDemoProject.prototype.init = function(canvas, initOptions)
{
    HX.MultiViewProject.prototype.init.call(this, canvas, initOptions);

    this._stats = new HX.StatsDisplay();
};

MultiDemoProject.prototype.addView = function(view)
{
    this.renderer.addView(view);
};

MultiDemoProject.prototype.removeView = function(view)
{
    this.renderer.removeView(view);
};