HX.ToneMapEffect = function(toneMapPass, adaptive)
{
    this._adaptive = adaptive === undefined? false : adaptive;

    if (this._adaptive && (!HX.EXT_SHADER_TEXTURE_LOD || !HX.EXT_HALF_FLOAT_TEXTURES)) {
        this._isSupported = false;
        return;
    }

    HX.Effect.call(this);
    this._toneMapPass = toneMapPass;

    if (this._adaptive) {
        this.addPass(new HX.EffectPass(null, HX.ShaderLibrary.get("tonemap_reference_fragment.glsl")));

        this._luminanceMap = new HX.Texture2D();
        this._luminanceMap.initEmpty(256, 256, HX.GL.RGBA, HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES);
        this._luminanceFBO = new HX.FrameBuffer([this._luminanceMap], HX.FrameBuffer.DEPTH_MODE_DISABLED);
        this._luminanceFBO.init();

        this._adaptationRate = 500.0;

        this._toneMapPass.setTexture("hx_luminanceMap", this._luminanceMap);
        this._toneMapPass.setUniform("hx_luminanceMipLevel", Math.log(this._luminanceMap._width) / Math.log(2));
    }

    this.addPass(this._toneMapPass);

    this.referenceLuminance = .3;
    this.exposure = 1.0;
};

HX.ToneMapEffect.prototype = Object.create(HX.Effect.prototype);

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
        this._drawPass(this._passes[0]);
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
            this._toneMapPass.setUniform("exposure", value);
    }
});

Object.defineProperty(HX.ToneMapEffect.prototype, "referenceLuminance", {
    get: function()
    {
        return this._referenceLuminance;
    },

    set: function(value)
    {
        this._referenceLuminance = value;
        if (!this._adaptive)
            this._toneMapPass.setUniform("referenceLuminance", value);
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
    var defines = {};
    var extensions = [];

    if (adaptive) {
        defines.ADAPTIVE = 1;
        extensions.push("GL_EXT_shader_texture_lod");
    }

    var pass = new HX.EffectPass(
        null,
        HX.ShaderLibrary.get("tonemap_reinhard_fragment.glsl", defines, extensions)
    );
    HX.ToneMapEffect.call(this, pass, adaptive);
};

HX.ReinhardToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);

/**
 *
 * @constructor
 */
HX.FilmicToneMapEffect = function(adaptive)
{
    var defines = {};
    var extensions = [];

    if (adaptive) {
        defines.ADAPTIVE = 1;
        extensions.push("GL_EXT_shader_texture_lod");
    }

    var pass = new HX.EffectPass(
        null,
        HX.ShaderLibrary.get("tonemap_filmic_fragment.glsl", defines, extensions)
    );


    HX.ToneMapEffect.call(this, pass, adaptive);
    this._outputsGamma = true;

};

HX.FilmicToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);