HX.ToneMapEffect = function(toneMapPass)
{
    HX.Effect.call(this);
    this._toneMapPass = toneMapPass;

    if (!HX.EXT_SHADER_TEXTURE_LOD || !HX.EXT_HALF_FLOAT_TEXTURES) {
        this._isSupported = false;
        return;
    }

    this.addPass(new HX.EffectPass(null, HX.ShaderLibrary.get("tonemap_reference_fragment.glsl")));
    this.addPass(this._toneMapPass);

    this._luminanceMap = new HX.Texture2D();
    this._luminanceMap.initEmpty(256, 256, HX.GL.RGBA, HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES);
    this._luminanceFBO = new HX.FrameBuffer([this._luminanceMap], HX.FrameBuffer.DEPTH_MODE_DISABLED);
    this._luminanceFBO.init();

    this._adaptationRate = 500.0;

    this._toneMapPass.setTexture("hx_luminanceMap", this._luminanceMap);
    this._toneMapPass.setUniform("hx_luminanceMipLevel", Math.log(this._luminanceMap._width) / Math.log(2));
};

HX.ToneMapEffect.prototype = Object.create(HX.Effect.prototype);

HX.ToneMapEffect.prototype.dispose = function()
{
    HX.Effect.prototype.dispose.call(this);
    this._luminanceFBO.dispose();
    this._luminanceMap.dispose();
};

/**
 * The amount of time in milliseconds for the "lens" to adapt to the frame's exposure.
 */
HX.ToneMapEffect.prototype.getAdaptationRate = function()
{
    return this._adaptationRate;
};

HX.ToneMapEffect.prototype.setAdaptationRate = function(value)
{
    this._adaptationRate = value;
};

HX.ToneMapEffect.prototype.draw = function(dt)
{
    if (!HX.EXT_HALF_FLOAT_TEXTURES) return;

    var amount = this._adaptationRate > 0? dt / this._adaptationRate : 1.0;
    if (amount > 1) amount = 1;

    HX.GL.enable(HX.GL.BLEND);
    HX.GL.blendFunc(HX.GL.CONSTANT_ALPHA, HX.GL.ONE_MINUS_CONSTANT_ALPHA);
    HX.GL.blendColor(1.0, 1.0, 1.0, amount);

    HX.setRenderTarget(this._luminanceFBO);
    HX.GL.viewport(0, 0, this._luminanceFBO._width, this._luminanceFBO._height);
    this._drawPass(this._passes[0]);
    this._luminanceMap.generateMipmap();
    HX.GL.disable(HX.GL.BLEND);

    HX.setRenderTarget(this._hdrTarget);
    HX.GL.viewport(0, 0, this._hdrTarget._width, this._hdrTarget._height);
    this._drawPass(this._passes[1]);
    this._swapHDRBuffers();
};

/**
 *
 * @constructor
 */
HX.ReinhardToneMapEffect = function()
{
    if (!HX.EXT_SHADER_TEXTURE_LOD || !HX.EXT_HALF_FLOAT_TEXTURES) {
        this._isSupported = false;
        return;
    }

    HX.ToneMapEffect.call(this, new HX.EffectPass(null, HX.ShaderLibrary.get("tonemap_reinhard_fragment.glsl")));

    this.setKey(.18);
};

HX.ReinhardToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);

HX.ReinhardToneMapEffect.prototype.getKey = function()
{
    return this._key;
};

HX.ReinhardToneMapEffect.prototype.setKey = function(value)
{
    this._key = value;
    if (this._isSupported)
        this._toneMapPass.setUniform("key", value);
};

/**
 *
 * @constructor
 */
HX.FilmicToneMapEffect = function()
{
    if (!HX.EXT_SHADER_TEXTURE_LOD || !HX.EXT_HALF_FLOAT_TEXTURES) {
        this._isSupported = false;
        return;
    }

    HX.ToneMapEffect.call(this, new HX.EffectPass(null, HX.ShaderLibrary.get("tonemap_filmic_fragment.glsl")));
    this._outputsGamma = true;
    this.setKey(.18);
};

HX.FilmicToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);

HX.FilmicToneMapEffect.prototype.getKey = function()
{
    return this._key;
};

HX.FilmicToneMapEffect.prototype.setKey = function(value)
{
    this._key = value;
    if (this._isSupported)
        this._toneMapPass.setUniform("key", value);
};