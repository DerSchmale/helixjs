/**
 *
 * @constructor
 */
HX.AmbientLight = function()
{
    HX.Light.call(this);

    // asume only one ambient light
    this._colorLocation = null;
    this._lightPass = null;
    this._useAO = false;

    this.color = new HX.Color(.1,.1,.1);
};

HX.AmbientLight.prototype = Object.create(HX.Light.prototype);

// returns the index of the FIRST UNRENDERED light
HX.AmbientLight.prototype.renderBatch = function(lightCollection, startIndex, renderer)
{
    var useAO = renderer._aoEffect != null;

    if (!this._lightPass || this._useAO != useAO) {
        this._useAO = useAO;
        this._initLightPass();
    }

    HX.GL.disable(HX.GL.DEPTH_TEST);

    this._lightPass.updateRenderState(renderer);

    var colorR = 0, colorG = 0, colorB = 0;
    var end = lightCollection.length;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];
        var color = light._scaledIrradiance;

        if (light._type != this._type)
            break;

        colorR += color.r;
        colorG += color.g;
        colorB += color.b;
    }

    HX.GL.uniform3f(this._colorLocation, colorR, colorG, colorB);

    // render rect mesh
    HX.drawElements(HX.GL.TRIANGLES, 6, 0);

    return i;
};

HX.AmbientLight.prototype._updateWorldBounds = function()
{
    //console.log(new Error().stack);
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.AmbientLight.prototype._initLightPass =  function()
{
    var defines = {};
    if (this._useAO) defines.USE_AO = 1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("ambient_light_vertex.glsl"),
        HX.ShaderLibrary.get("ambient_light_fragment.glsl", defines)
    );

    pass.blendState = HX.BlendState.ADD;

    this._colorLocation = pass.getUniformLocation("lightColor");

    this._lightPass = pass;
};