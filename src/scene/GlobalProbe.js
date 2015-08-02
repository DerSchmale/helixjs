/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 * @constructor
 */
HX.GlobalSpecularProbe = function(texture)
{
    this._texture = texture;

    // could just use a HX global rect mesh
    HX.GlobalSpecularProbe._rectMesh = HX.GlobalSpecularProbe._rectMesh || new HX.RectMesh.create();
    this._pass = this._initPass();
};

// conversion range for spec power to mip
HX.GlobalSpecularProbe.powerRange0 = .00098;
HX.GlobalSpecularProbe.powerRange1 = .9921;

HX.GlobalSpecularProbe.prototype = Object.create(HX.Light.prototype);

HX.GlobalSpecularProbe.prototype.render = function(camera, gbuffer, occlusion)
{
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    this._pass.updateGlobalState(camera, gbuffer, occlusion);
    this._pass.updateRenderState();

    if (this._texture) {
        var maxMip = Math.floor(Math.log(this._texture.size()) / Math.log(2));
        var mipOffset = 0;
        HX.GL.uniform1f(this._numMipsLocation, maxMip - mipOffset);
    }

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
};

HX.GlobalSpecularProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.GlobalSpecularProbe.prototype._initPass = function()
{
    var defines = {};
    var extensions = {};

    if (HX.EXT_SHADER_TEXTURE_LOD) {
        extensions.push("GL_EXT_shader_texture_lod");
        defines.USE_TEX_LOD = 1;
    }

    defines.K0 = HX.GlobalSpecularProbe.powerRange0;
    defines.K1 = HX.GlobalSpecularProbe.powerRange1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("global_specular_probe_vertex.glsl"),
        HX.ShaderLibrary.get("global_specular_probe_fragment.glsl", defines, extensions),
        HX.Light._rectMesh
    );

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

    // could just use a HX global rect mesh
    HX.GlobalIrradianceProbe._rectMesh = HX.GlobalIrradianceProbe._rectMesh || new HX.RectMesh.create();
    this._usingAO = false;
};

HX.GlobalIrradianceProbe.prototype = Object.create(HX.Light.prototype);

HX.GlobalIrradianceProbe.prototype.render = function(camera, gbuffer, occlusion)
{
    var usingAO = occlusion != null;
    if (this._usingAO != usingAO || !this._pass) {
        this._usingAO = usingAO;
        this._pass = this._initPass();
    }

    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    this._pass.updateGlobalState(camera, gbuffer, occlusion);
    this._pass.updateRenderState();

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
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
        HX.ShaderLibrary.get("global_irradiance_probe_fragment.glsl", defines),
        HX.Light._rectMesh
    );

    this._numMipsLocation = pass.getUniformLocation("numMips");

    pass.setTexture("irradianceProbeSampler", this._texture);

    return pass;
};