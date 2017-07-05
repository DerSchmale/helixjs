/**
 * @constructor
 */
MultiDemoProject = function()
{
    MultiViewProject.call(this);
    this._stats = null;
};

MultiDemoProject.prototype = Object.create(MultiViewProject.prototype);

MultiDemoProject.prototype.init = function(canvas, initOptions)
{
    MultiViewProject.prototype.init.call(this, canvas, initOptions);

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