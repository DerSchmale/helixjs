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

    var renderer = this.renderer;

    document.addEventListener("keyup", function(event)
    {
        var keyCode = ("which" in event) ? event.which : event.keyCode;

        switch (keyCode) {
            case 48:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_NONE;
                break;
            case 49:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_COLOR;
                break;
            case 50:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_NORMALS;
                break;
            case 51:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_ROUGHNESS;
                break;
            case 52:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_METALLICNESS;
                break;
            case 53:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_DEPTH;
                break;
            case 54:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_AO;
                break;
            case 55:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_SSR;
                break;
            case 56:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_LIGHT_ACCUM;
                break;
        }
    });
};