/**
 *
 * @constructor
 */
HX.AmbientLight = function()
{
    HX.Light.call(this, HX.AmbientLight);

    HX.Light._rectMesh = HX.Light._rectMesh || new HX.RectMesh.create();

    this._lightPass = null;
    this._useAO = false;

    this.setColor(new HX.Color(.1,.1,.1));
};

HX.AmbientLight.prototype = Object.create(HX.Light.prototype);

HX.AmbientLight.prototype.activate = function(camera, gbuffer, occlusion)
{
    var useAO = occlusion != null;

    if (!this._lightPass || this._useAO != useAO) {
        this._useAO = useAO;
        this._initLightPass();
    }

    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    HX.AmbientLight._lightPass.updateGlobalState(camera, gbuffer, occlusion);
    HX.AmbientLight._lightPass.updateRenderState();
};

// returns the index of the FIRST UNRENDERED light
HX.AmbientLight.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    this._occlusion = occlusion;
    var colorR = 0, colorG = 0, colorB = 0;
    var end = lightCollection.length;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];
        var color = light._scaledIrradiance;

        if (light._type != this._type) {
            end = i;
            break;
        }
        colorR += color.r;
        colorG += color.g;
        colorB += color.b;
    }

    HX.GL.uniform3f(HX.AmbientLight._colorLocation, colorR, colorG, colorB);

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);

    return end;
};

HX.AmbientLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.AmbientLight.prototype._initLightPass =  function()
{
    var defines = "";
    if (this._useAO) defines += "#define USE_AO\n";
    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("ambient_light_vertex.glsl"),
        defines + HX.ShaderLibrary.get("ambient_light_fragment.glsl"),
        HX.Light._rectMesh);

    HX.AmbientLight._colorLocation = pass.getUniformLocation("lightColor");

    HX.AmbientLight._lightPass = pass;
};