HX.ToneMapEffect = function(adaptive)
{
    this._adaptive = adaptive === undefined? false : adaptive;

    if (this._adaptive && (!HX.EXT_SHADER_TEXTURE_LOD || !HX.EXT_HALF_FLOAT_TEXTURES)) {
        console.log("Warning: adaptive tone mapping not supported, using non-adaptive");
        this._adaptive = false;
        return;
    }

    HX.Effect.call(this);

    this._toneMapPass = this._createToneMapPass();

    if (this._adaptive) {
        this.addPass(new HX.EffectPass(null, HX.ShaderLibrary.get("tonemap_reference_fragment.glsl")));

        this._luminanceMap = new HX.Texture2D();
        this._luminanceMap.initEmpty(256, 256, HX.GL.RGBA, HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES);
        this._luminanceFBO = new HX.FrameBuffer([this._luminanceMap]);
        this._luminanceFBO.init();

        this._adaptationRate = 500.0;

        this._toneMapPass.setTexture("hx_luminanceMap", this._luminanceMap);
        this._toneMapPass.setUniform("hx_luminanceMipLevel", Math.log(this._luminanceMap._width) / Math.log(2));
    }

    this.addPass(this._toneMapPass);

    this.exposure = 0.0;
};

HX.ToneMapEffect.prototype = Object.create(HX.Effect.prototype);

HX.ToneMapEffect.prototype._createToneMapPass = function()
{
    throw new Error("Abstract method called!");
}


HX.ToneMapEffect.prototype.dispose = function()
{
    HX.Effect.prototype.dispose.call(this);
    this._luminanceFBO.dispose();
    this._luminanceMap.dispose();
};

HX.ToneMapEffect.prototype.draw = function(dt)
{
    if (this._adaptive) {
        if (!this._isSupported) return;

        var amount = this._adaptationRate > 0 ? dt / this._adaptationRate : 1.0;
        if (amount > 1) amount = 1;

        HX.GL.enable(HX.GL.BLEND);
        HX.GL.blendFunc(HX.GL.CONSTANT_ALPHA, HX.GL.ONE_MINUS_CONSTANT_ALPHA);
        HX.GL.blendColor(1.0, 1.0, 1.0, amount);

        HX.setRenderTarget(this._luminanceFBO);
        HX.GL.viewport(0, 0, this._luminanceFBO._width, this._luminanceFBO._height);
        this._drawPass(this._opaquePasses[0]);
        this._luminanceMap.generateMipmap();
        HX.GL.disable(HX.GL.BLEND);
    }

    HX.setRenderTarget(this._hdrTarget);
    HX.GL.viewport(0, 0, this._hdrTarget._width, this._hdrTarget._height);
    this._drawPass(this._toneMapPass);
    this._swapHDRBuffers();
};


Object.defineProperty(HX.ToneMapEffect.prototype, "exposure", {
    get: function()
    {
        return this._exposure;
    },

    set: function(value)
    {
        this._exposure = value;
        if (this._isSupported)
            this._toneMapPass.setUniform("hx_exposure", Math.pow(2.0, value));
    }
});

/**
 * The amount of time in milliseconds for the "lens" to adapt to the frame's exposure.
 */
Object.defineProperty(HX.ToneMapEffect.prototype, "adaptationRate", {
    get: function()
    {
        return this._adaptationRate;
    },

    set: function(value)
    {
        this._adaptationRate = value;
    }
});

/**
 *
 * @constructor
 */
HX.ReinhardToneMapEffect = function(adaptive)
{
    HX.ToneMapEffect.call(this, adaptive);
};

HX.ReinhardToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);

HX.ReinhardToneMapEffect.prototype._createToneMapPass = function()
{
    var defines = {};
    var extensions;

    if (this._adaptive) {
        defines.ADAPTIVE = 1;
        extensions = "#extension GL_EXT_shader_texture_lod : require";
    }

    return new HX.EffectPass(
        null,
        HX.ShaderLibrary.get("snippets_tonemap.glsl", defines) + "\n" +
        HX.ShaderLibrary.get("tonemap_reinhard_fragment.glsl"),
        null,
        null,
        extensions
    );
};

/**
 *
 * @constructor
 */
HX.FilmicToneMapEffect = function(adaptive)
{
    HX.ToneMapEffect.call(this, adaptive);
    this._outputsGamma = true;

};

HX.FilmicToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);

HX.FilmicToneMapEffect.prototype._createToneMapPass = function()
{
    var defines = {};
    var extensions;

    if (this._adaptive) {
        defines.ADAPTIVE = 1;
        extensions = "#extension GL_EXT_shader_texture_lod : require";
    }

    return new HX.EffectPass(
        null,
        HX.ShaderLibrary.get("snippets_tonemap.glsl", defines) + "\n" +
        HX.ShaderLibrary.get("tonemap_filmic_fragment.glsl"),
        null,
        null,
        extensions
    );
};