/**
 *
 * @param numSamples
 * @param range
 * @constructor
 */
HX.ScreenSpaceReflections = function(numSamples)
{
    HX.Effect.call(this);
    numSamples = numSamples || 5;
    this._numSamples = numSamples;

    var defines = {
        NUM_SAMPLES: numSamples
    };

    this._isSupported = !!HX.EXT_STANDARD_DERIVATIVES;
    this._stencilWriteState = new HX.StencilState(1, HX.Comparison.ALWAYS, HX.StencilOp.REPLACE, HX.StencilOp.REPLACE, HX.StencilOp.REPLACE);
    this._stencilReadState = new HX.StencilState(1, HX.Comparison.EQUAL, HX.StencilOp.KEEP, HX.StencilOp.KEEP, HX.StencilOp.KEEP);
    this._stencilPass = new HX.EffectPass(null, HX.ShaderLibrary.get("ssr_stencil_fragment.glsl"));
    this._pass = new HX.EffectPass(HX.ShaderLibrary.get("ssr_vertex.glsl", defines), HX.ShaderLibrary.get("ssr_fragment.glsl", defines));
    this._scale = .5;
    this.stepSize = Math.max(500.0 / numSamples, 1.0);
    this.maxDistance = 500.0;
    this.maxRoughness = .4;

    this._depthBuffer = new HX.ReadOnlyDepthBuffer();

    this._ssrTexture = new HX.Texture2D();
    this._ssrTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this._ssrTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._fbo = new HX.FrameBuffer(this._ssrTexture, this._depthBuffer);
};

HX.ScreenSpaceReflections.prototype = Object.create(HX.Effect.prototype);


/**
 * Amount of pixels to skip per sample
 */
Object.defineProperties(HX.ScreenSpaceReflections.prototype, {
    stepSize: {
        get: function () {
            return this._stepSize;
        },

        set: function (value) {
            this._stepSize = value;
            this._pass.setUniform("stepSize", value);
        }
    },

    maxDistance: {
        get: function()
        {
            return this._stepSize;
        },

        set: function(value)
        {
            this._stepSize = value;
            this._pass.setUniform("maxDistance", value);
        }
    },

    /**
     * The maximum amount of roughness that will show any screen-space reflections
     */
    maxRoughness: {
        get: function()
        {
            return this._stepSize;
        },

        set: function(value)
        {
            this._stepSize = value;
            this._pass.setUniform("maxRoughness", value);
            this._stencilPass.setUniform("maxRoughness", value);
        }
    },

    scale: {
        get: function()
        {
            return this._scale;
        },

        set: function(value)
        {
            this._scale = value;
            if (this._scale > 1.0) this._scale = 1.0;
        }
    }
});

// every SSAO type should implement this
HX.ScreenSpaceReflections.prototype.getSSRTexture = function()
{
    return this._ssrTexture;
};

HX.ScreenSpaceReflections.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;
    if (HX.TextureUtils.assureSize(w, h, this._ssrTexture, null, HX.GL.RGBA, HX.HDR_FORMAT)) {
        this._depthBuffer.init(w, h);
        this._fbo.init();
        this._pass.setUniform("ditherTextureScale", {x: w / HX.DEFAULT_2D_DITHER_TEXTURE.width, y: h / HX.DEFAULT_2D_DITHER_TEXTURE.height});
    }

    HX.pushRenderTarget(this._fbo);
        HX.clear();
        HX.GL.colorMask(false, false, false, false);
        HX.pushStencilState(this._stencilWriteState);
        this._drawPass(this._stencilPass);
        HX.popStencilState();
        HX.GL.colorMask(true, true, true, true);

        HX.pushStencilState(this._stencilReadState);

        this._drawPass(this._pass);
        HX.popStencilState();
    HX.popRenderTarget();
};