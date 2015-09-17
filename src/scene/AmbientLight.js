/**
 *
 * @constructor
 */
HX.AmbientLight = function()
{
    HX.Light.call(this, HX.AmbientLight);

    HX.Light._rectMesh = HX.Light._rectMesh || new HX.RectMesh.create();

    // asume only one ambient light
    this._colorLocation = null;
    this._lightPass = null;
    this._useAO = false;

    this.color = new HX.Color(.1,.1,.1);
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

    this._lightPass.updateGlobalState(camera, gbuffer, occlusion);
    this._lightPass.updateRenderState();
};

// returns the index of the FIRST UNRENDERED light
HX.AmbientLight.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    this._occlusion = occlusion;
    var colorR = 0, colorG = 0, colorB = 0;
    //var end = lightCollection.length;

    //for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[startIndex];
        var color = light._scaledIrradiance;

        //if (light._type != this._type) {
        //    end = i;
        //    break;
        //}
        colorR += color.r;
        colorG += color.g;
        colorB += color.b;
    //}

    HX.GL.uniform3f(this._colorLocation, colorR, colorG, colorB);

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);

    return startIndex + 1;
};

HX.AmbientLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.AmbientLight.prototype._initLightPass =  function()
{
    var defines = {};
    if (this._useAO) defines.USE_AO = 1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("ambient_light_vertex.glsl"),
        HX.ShaderLibrary.get("ambient_light_fragment.glsl", defines),
        HX.Light._rectMesh
    );

    this._colorLocation = pass.getUniformLocation("lightColor");

    this._lightPass = pass;
};