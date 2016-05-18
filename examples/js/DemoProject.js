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

    var renderer = this.renderer;

    document.addEventListener("keyup", function(event)
    {
        debugInfoField.style.display = "inline";

        var keyCode = ("which" in event) ? event.which : event.keyCode;

        switch (keyCode) {
            case 48:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_NONE;
                debugInfoField.style.display = "none";
                break;
            case 49:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_COLOR;
                debugInfoField.innerHTML = "Debug: color";
                break;
            case 50:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_NORMALS;
                debugInfoField.innerHTML = "Debug: normals";
                break;
            case 51:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_ROUGHNESS;
                debugInfoField.innerHTML = "Debug: roughness";
                break;
            case 52:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_METALLICNESS;
                debugInfoField.innerHTML = "Debug: metallicness";
                break;
            case 53:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_DEPTH;
                debugInfoField.innerHTML = "Debug: depth";
                break;
            case 54:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_TRANSPARENCY_MODE;
                debugInfoField.innerHTML = "Debug: Transparency";
                break;
            case 55:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_AO;
                debugInfoField.innerHTML = "Debug: AO";
                break;
            case 56:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_SSR;
                debugInfoField.innerHTML = "Debug: SSR";
                break;
            case 57:
                renderer.debugMode = HX.DebugRenderMode.DEBUG_LIGHT_ACCUM;
                debugInfoField.innerHTML = "Debug: Light Accumulation";
                break;
        }
    });
};