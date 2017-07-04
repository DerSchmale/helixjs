/**
 * TODO: This is currently pointless. Code remains for reference
 * @param numSamples
 * @param range
 * @constructor
 */
import {
    capabilities, Comparison, TextureFilter, TextureFormat, TextureWrapMode, StencilOp, _HX_,
    DEFAULTS
} from "../Helix";
import {StencilState} from "../render/StencilState";
import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {Texture2D} from "../texture/Texture2D";
import {FrameBuffer} from "../texture/FrameBuffer";
import {Effect} from "./Effect";
import {TextureUtils} from "../texture/TextureUtils";
function ScreenSpaceReflections(numSamples)
{
    Effect.call(this);
    numSamples = numSamples || 5;
    this._numSamples = numSamples;

    var defines = {
        NUM_SAMPLES: numSamples
    };

    this._isSupported = !!capabilities.EXT_STANDARD_DERIVATIVES;
    this._stencilWriteState = new StencilState(1, Comparison.ALWAYS, StencilOp.REPLACE, StencilOp.REPLACE, StencilOp.REPLACE);
    this._stencilReadState = new StencilState(1, Comparison.EQUAL, StencilOp.KEEP, StencilOp.KEEP, StencilOp.KEEP);
    this._stencilPass = new EffectPass(null, ShaderLibrary.get("ssr_stencil_fragment.glsl"));
    this._pass = new EffectPass(ShaderLibrary.get("post_viewpos_vertex.glsl", defines), ShaderLibrary.get("ssr_fragment.glsl", defines));
    this._scale = .5;
    this.stepSize = Math.max(500.0 / numSamples, 1.0);
    this.maxDistance = 500.0;
    this.maxRoughness = .4;

    this._depthBuffer = new WriteOnlyDepthBuffer();

    this._ssrTexture = new Texture2D();
    this._ssrTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._ssrTexture.wrapMode = TextureWrapMode.CLAMP;
    this._fbo = new FrameBuffer(this._ssrTexture, this._depthBuffer);
};

ScreenSpaceReflections.prototype = Object.create(Effect.prototype);


/**
 * Amount of pixels to skip per sample
 */
Object.defineProperties(ScreenSpaceReflections.prototype, {
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
ScreenSpaceReflections.prototype.getSSRTexture = function()
{
    return this._ssrTexture;
};

ScreenSpaceReflections.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;
    if (TextureUtils.assureSize(w, h, this._ssrTexture, null, TextureFormat.RGBA, _HX_.HDR_FORMAT)) {
        this._depthBuffer.init(w, h);
        this._fbo.init();
        this._pass.setUniform("ditherTextureScale", {x: w / DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.width, y: h / DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.height});
    }

    // TODO: Fix all of this up
    /*GL.pushRenderTarget(this._fbo);
        HX.setClearColor(HX.Color.ZERO);
        HX.clear();
        HX_GL.colorMask(false, false, false, false);
        HX.setStencilState(this._stencilWriteState);
        this._drawPass(this._stencilPass);

        HX_GL.colorMask(true, true, true, true);

        HX.setStencilState(this._stencilReadState);
        this._drawPass(this._pass);
        HX.setStencilState();
    HX.popRenderTarget();*/
};