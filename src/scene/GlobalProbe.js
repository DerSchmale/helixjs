/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 * @constructor
 */
HX.GlobalSpecularProbe = function(texture)
{
    this._texture = texture;

    this._pass = null;  // created deferredly
    this._usingAO = false;
    this._usingSSR = false;
};

// conversion range for spec power to mip
HX.GlobalSpecularProbe.powerRange0 = .00098;
HX.GlobalSpecularProbe.powerRange1 = .9921;

HX.GlobalSpecularProbe.prototype = Object.create(HX.Light.prototype);

HX.GlobalSpecularProbe.prototype.render = function(renderer)
{
    var usingAO = renderer._aoEffect != null;
    var usingSSR = renderer._ssrEffect != null;
    if (this._usingAO != usingAO || this._usingSSR != usingSSR || !this._pass) {
        this._usingAO = usingAO;
        this._usingSSR = usingSSR;
        this._pass = this._initPass();
    }

    HX.GL.disable(HX.GL.DEPTH_TEST);

    this._pass.updateRenderState(renderer);

    if (this._texture) {
        var maxMip = Math.floor(Math.log(this._texture.size) / Math.log(2));
        var mipOffset = 0;
        HX.GL.uniform1f(this._numMipsLocation, maxMip - mipOffset);
    }

    // render rect mesh
    HX.drawElements(HX.GL.TRIANGLES, 6, 0);
};

HX.GlobalSpecularProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.GlobalSpecularProbe.prototype._initPass = function()
{
    var defines = {};

    if (HX.EXT_SHADER_TEXTURE_LOD)
        defines.USE_TEX_LOD = 1;

    if (this._usingAO)
        defines.USE_AO = 1;

    if (this._usingSSR)
        defines.USE_SSR = 1;

    defines.K0 = HX.GlobalSpecularProbe.powerRange0;
    defines.K1 = HX.GlobalSpecularProbe.powerRange1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("global_specular_probe_vertex.glsl"),
        HX.ShaderLibrary.get("global_specular_probe_fragment.glsl", defines)
    );

    pass.blendState = HX.BlendState.ADD;

    this._numMipsLocation = pass.getUniformLocation("numMips");

    pass.setTexture("specularProbeSampler", this._texture);

    var minRoughness = 0.0014;
    var maxPower = 2.0 / (minRoughness * minRoughness) - 2.0;
    var maxMipFactor = (Math.pow(2.0, -10.0/Math.sqrt(maxPower)) - HX.GlobalSpecularProbe.powerRange0)/HX.GlobalSpecularProbe.powerRange1;
    pass.setUniform("maxMipFactor", maxMipFactor);

    return pass;
};


/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 * @constructor
 */
HX.GlobalIrradianceProbe = function(texture)
{
    this._texture = texture;
    this._usingAO = false;
};

HX.GlobalIrradianceProbe.prototype = Object.create(HX.Light.prototype);

HX.GlobalIrradianceProbe.prototype.render = function(renderer)
{
    var usingAO = renderer._aoEffect != null;
    if (this._usingAO != usingAO || !this._pass) {
        this._usingAO = usingAO;
        this._pass = this._initPass();
    }

    HX.GL.disable(HX.GL.DEPTH_TEST);

    this._pass.updateRenderState(renderer);

    // render rect mesh
    HX.drawElements(HX.GL.TRIANGLES, 6, 0);
};

HX.GlobalIrradianceProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.GlobalIrradianceProbe.prototype._initPass = function()
{
    var defines = {};

    if (this._usingAO)
        defines.USE_AO = 1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("global_irradiance_probe_vertex.glsl"),
        HX.ShaderLibrary.get("global_irradiance_probe_fragment.glsl", defines)
    );

    pass.blendState = HX.BlendState.ADD;

    pass.setTexture("irradianceProbeSampler", this._texture);

    return pass;
};