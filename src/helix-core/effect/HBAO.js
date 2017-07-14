import {ShaderLibrary} from "../shader/ShaderLibrary";
import {EffectPass} from "./EffectPass";
import {Texture2D} from "../texture/Texture2D";
import {TextureFilter, TextureWrapMode} from "../Helix";
import {FrameBuffer} from "../texture/FrameBuffer";
import {Effect} from "./Effect";
import {TextureUtils} from "../texture/TextureUtils";
import {GL} from "../core/GL";
import {ArrayUtils} from "../utils/ArrayUtils";
import {Color} from "../core/Color";

/**
 * @classdesc
 * HBAO adds Horizon-Based Ambient Occlusion to the renderer.
 *
 * @constructor
 * @param numRays The amount of rays to march over.
 * @param numSamplesPerRay The samples per ray during a march.
 *
 * @see {@linkcode Renderer#ambientOcclusion}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HBAO(numRays, numSamplesPerRay)
{
    numRays = numRays || 4;
    numSamplesPerRay = numSamplesPerRay || 4;
    if (numRays > 32) numRays = 32;
    if (numSamplesPerRay > 32) numSamplesPerRay = 32;

    this._numRays = numRays;
    this._strength = 1.0;
    this._bias = .01;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._scale = .5;
    this._sampleDirTexture = null;
    this._ditherTexture = null;

    Effect.call(this);
    this._aoPass = new EffectPass(
        ShaderLibrary.get("hbao_vertex.glsl"),
        ShaderLibrary.get("hbao_fragment.glsl", {
            NUM_RAYS: numRays,
            NUM_SAMPLES_PER_RAY: numSamplesPerRay
        })
    );

    this._blurPass = new EffectPass(ShaderLibrary.get("ao_blur_vertex.glsl"), ShaderLibrary.get("ao_blur_fragment.glsl"));

    this._initSampleDirTexture();
    this._initDitherTexture();
    this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
    this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._aoPass.setUniform("halfSampleRadius", this._radius *.5);
    this._aoPass.setUniform("bias", this._bias);
    this._aoPass.setTexture("ditherTexture", this._ditherTexture);
    this._aoPass.setTexture("sampleDirTexture", this._sampleDirTexture);
    this._sourceTextureSlot = this._blurPass.getTextureSlot("source");

    this._aoTexture = new Texture2D();
    this._aoTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._aoTexture.wrapMode = TextureWrapMode.CLAMP;
    this._backTexture = new Texture2D();
    this._backTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._backTexture.wrapMode = TextureWrapMode.CLAMP;
    this._fbo1 = new FrameBuffer(this._backTexture);
    this._fbo2 = new FrameBuffer(this._aoTexture);
}

HBAO.prototype = Object.create(Effect.prototype, {
    /**
     * The sample radius in world space to search for occluders.
     */
    sampleRadius: {
        get: function ()
        {
            return this._radius;
        },

        set: function (value)
        {
            this._radius = value;
            this._aoPass.setUniform("halfSampleRadius", this._radius * .5);
        }
    },

    /**
     * The maximum distance for occluders to still count.
     */
    fallOffDistance: {
        get: function ()
        {
            return this._fallOffDistance;
        },
        set: function (value)
        {
            this._fallOffDistance = value;
            this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
        }
    },

    /**
     * The strength of the ambient occlusion effect.
     */
    strength: {
        get: function()
        {
            return this._strength;
        },
        set: function (value)
        {
            this._strength = value;
            this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
        }
    },

    /**
     * The angle bias to prevent some artifacts.
     */
    bias: {
        get: function()
        {
            return this._bias;
        },
        set: function (value)
        {
            this._bias = value;
            this._aoPass.setUniform("bias", this._bias);
        }
    },

    /**
     * The scale at which to calculate the ambient occlusion (usually 0.5, half-resolution)
     */
    scale: {
        get: function() { return this._scale; },
        set: function(value) { this._scale = value; }
    }
});

/**
 * Returns the texture containing the ambient occlusion values.
 *
 * @returns {Texture2D}
 * @ignore
 */
HBAO.prototype.getAOTexture = function()
{
    return this._aoTexture;
};

/**
 * @ignore
 */
HBAO.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;

    if (TextureUtils.assureSize(w, h, this._aoTexture, this._fbo2)) {
        TextureUtils.assureSize(w, h, this._backTexture, this._fbo1);
        this._aoPass.setUniform("ditherScale", {x: w * .25, y: h * .25});
    }

    GL.setClearColor(Color.WHITE);

    GL.setRenderTarget(this._fbo1);
    GL.clear();
    this._drawPass(this._aoPass);

    GL.setRenderTarget(this._fbo2);
    GL.clear();
    this._blurPass.setUniform("pixelSize", {x: 1.0 / w, y: 1.0 / h});
    this._sourceTextureSlot.texture = this._backTexture;
    this._drawPass(this._blurPass);

    GL.setClearColor(Color.BLACK);
};

/**
 * @ignore
 * @private
 */
HBAO.prototype._initSampleDirTexture = function()
{
    this._sampleDirTexture = new Texture2D();
    var data = [];
    var j = 0;

    for (var i = 0; i < 256; ++i)
    {
        var angle = i / 256 * 2.0 * Math.PI;
        var r = Math.cos(angle)*.5 + .5;
        var g = Math.sin(angle)*.5 + .5;
        data[j] = Math.round(r * 0xff);
        data[j+1] = Math.round(g * 0xff);
        data[j+2] = 0x00;
        data[j+3] = 0xff;
        j += 4;
    }

    this._sampleDirTexture.uploadData(new Uint8Array(data), 256, 1, false);
    this._sampleDirTexture.filter = TextureFilter.NEAREST_NOMIP;
    this._sampleDirTexture.wrapMode = TextureWrapMode.REPEAT;
};

/**
 * @ignore
 * @private
 */
HBAO.prototype._initDitherTexture = function()
{
    this._ditherTexture = new Texture2D();
    var data = [];

    var i;
    var j = 0;
    var offsets1 = [];
    var offsets2 = [];

    for (i = 0; i < 16; ++i) {
        offsets1.push(i / 16.0);
        offsets2.push(i / 15.0);
    }

    ArrayUtils.shuffle(offsets1);
    ArrayUtils.shuffle(offsets2);

    i = 0;

    for (var y = 0; y < 4; ++y) {
        for (var x = 0; x < 4; ++x) {
            var r = offsets1[i];
            var g = offsets2[i];

            ++i;

            data[j] = Math.round(r * 0xff);
            data[j + 1] = Math.round(g * 0xff);
            data[j + 2] = 0x00;
            data[j + 3] = 0xff;

            j += 4;
        }
    }

    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.filter = TextureFilter.NEAREST_NOMIP;
    this._ditherTexture.wrapMode = TextureWrapMode.REPEAT;
};

export { HBAO };