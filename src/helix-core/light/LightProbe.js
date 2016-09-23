/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 */
HX.LightProbe = function(diffuseTexture, specularTexture)
{
    HX.Entity.call(this);
    this._specularTexture = specularTexture;
    this._diffuseTexture = diffuseTexture;
    this._size = undefined;
};

// conversion range for spec power to mip
HX.LightProbe.powerRange0 = .00098;
HX.LightProbe.powerRange1 = .9921;

HX.LightProbe.prototype = Object.create(HX.Entity.prototype,
    {
        specularTexture: {
            get: function() { return this._specularTexture; },
            set: function(value) { this._specularTexture = value; },
        },
        diffuseTexture: {
            get: function() { return this._diffuseTexture; },
            set: function(value) { this._diffuseTexture = value; },
        }
    });

HX.LightProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};


/*HX.GlobalSpecularProbe.prototype.render = function(renderer)
{
    this._pass.updateRenderState(renderer);

    if (this._texture) {
        var maxMip = Math.floor(HX.log2(this._texture.size));
        var mipOffset = 0;
        HX_GL.uniform1f(this._numMipsLocation, maxMip - mipOffset);
    }

    // render rect mesh
    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};

HX.GlobalSpecularProbe.prototype._initPass = function()
{
    var defines = {};
    var extensions = [];

    if (HX.EXT_SHADER_TEXTURE_LOD) {
        defines.USE_TEX_LOD = 1;
        extensions.push("GL_EXT_shader_texture_lod");
    }

    defines.K0 = HX.GlobalSpecularProbe.powerRange0;
    defines.K1 = HX.GlobalSpecularProbe.powerRange1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("global_specular_probe_vertex.glsl"),
        HX.ShaderLibrary.get("global_specular_probe_fragment.glsl", defines, extensions)
    );

    pass.blendState = HX.BlendState.ADD;

    this._numMipsLocation = pass.getUniformLocation("numMips");

    pass.setTexture("specularProbeSampler", this._texture);

    var minRoughness = 0.0014;
    var maxPower = 2.0 / (minRoughness * minRoughness) - 2.0;
    var maxMipFactor = (Math.pow(2.0, -10.0/Math.sqrt(maxPower)) - HX.GlobalSpecularProbe.powerRange0)/HX.GlobalSpecularProbe.powerRange1;
    pass.setUniform("maxMipFactor", maxMipFactor);

    return pass;
};*/


/*HX.GlobalIrradianceProbe.prototype.render = function(renderer)
{
    this._pass.updateRenderState(renderer);

    // render rect mesh
    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};

HX.GlobalIrradianceProbe.prototype._initPass = function()
{
    var defines = {};

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("global_irradiance_probe_vertex.glsl"),
        HX.ShaderLibrary.get("global_irradiance_probe_fragment.glsl", defines)
    );

    pass.blendState = HX.BlendState.ADD;

    pass.setTexture("irradianceProbeSampler", this._texture);

    return pass;
};*/