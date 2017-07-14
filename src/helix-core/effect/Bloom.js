import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {GaussianBlurPass} from "./GaussianBlurPass";
import {Texture2D} from "../texture/Texture2D";
import {capabilities, META, TextureFormat, TextureFilter, TextureWrapMode} from "../Helix";
import {FrameBuffer} from "../texture/FrameBuffer";
import {GL} from "../core/GL";
import {Effect} from "./Effect";

/**
 * @classdesc
 * Bloom is an {@linkcode Effect} added to the Camera that allows bright areas in the image to bleed into less bright areas.
 *
 * @property {number} strength The strength of the bloom effect.
 * @property {number} thresholdLuminance The threshold luminance for pixels that are allowed to bleed.
 *
 * @param radius The radius of the bloom effect.
 * @param strength The strength of the bloom effect.
 * @param [downScale] How many times smaller the bloom should be calculated relative to the render target.
 * @param [anisotropy] Defines the ratio between the horizontal and vertical bloom. For the JJ Abrams people among us.
 *
 * @constructor
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Bloom(radius, strength, downScale, anisotropy)
{
    Effect.call(this);

    this._downScale = downScale || 4;

    this._targetWidth = -1;
    this._targetHeight = -1;

    radius = radius || 256;
    radius /= this._downScale;
    this._thresholdPass = new EffectPass(null, ShaderLibrary.get("bloom_threshold_fragment.glsl"));
    this._compositePass = new EffectPass(ShaderLibrary.get("bloom_composite_vertex.glsl"), ShaderLibrary.get("bloom_composite_fragment.glsl"));
    this._blurPass = new GaussianBlurPass(radius);
    this._blurSourceSlot = this._blurPass.getTextureSlot("sourceTexture");
    this._thresholdWidth = -1;
    this._thresholdHeight = -1;

    this._thresholdMaps = [];
    this._smallFBOs = [];

    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i] = new Texture2D();
        this._thresholdMaps[i].filter = TextureFilter.BILINEAR_NOMIP;
        this._thresholdMaps[i].wrapMode = TextureWrapMode.CLAMP;
        this._smallFBOs[i] = new FrameBuffer([this._thresholdMaps[i]]);
    }

    this._anisotropy = anisotropy || 1;

    this._strength = strength === undefined ? 1.0 : strength;

    if (capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR && capabilities.EXT_HALF_FLOAT_TEXTURES)
        this.thresholdLuminance = META.OPTIONS.hdr;
    else
        this.thresholdLuminance = .9;

    this._compositePass.setTexture("bloomTexture", this._thresholdMaps[0]);

    this.strength = this._strength;
}

Bloom.prototype = Object.create(Effect.prototype,
    {
        strength: {
            get: function ()
            {
                return this._strength;
            },

            set: function (value)
            {
                this._strength = value;
                this._compositePass.setUniform("strength", this._strength);
            }
        },

        thresholdLuminance: {
            get: function ()
            {
                return this._thresholdLuminance;
            },

            set: function (value)
            {
                this._thresholdLuminance = value;
                this._thresholdPass.setUniform("threshold", value)
            }
        }
    }
);

/**
 * @ignore
 */
Bloom.prototype._initTextures = function ()
{
    for (var i = 0; i < 2; ++i) {
        this._thresholdWidth = Math.ceil(this._targetWidth / this._downScale);
        this._thresholdHeight = Math.ceil(this._targetHeight / this._downScale);
        this._thresholdMaps[i].initEmpty(this._thresholdWidth, this._thresholdHeight, TextureFormat.RGB, capabilities.HDR_FORMAT);
        this._smallFBOs[i].init();
    }
};

/**
 * @ignore
 */
Bloom.prototype.draw = function (dt)
{
    if (this._renderer._width !== this._targetWidth || this._renderer._height !== this._targetHeight) {
        this._targetWidth = this._renderer._width;
        this._targetHeight = this._renderer._height;
        this._initTextures();
    }

    GL.setRenderTarget(this._smallFBOs[0]);
    GL.clear();
    this._drawPass(this._thresholdPass);

    GL.setRenderTarget(this._smallFBOs[1]);
    GL.clear();
    this._blurSourceSlot.texture = this._thresholdMaps[0];
    this._blurPass.setUniform("stepSize", {x: 1.0 / this._thresholdWidth, y: 0.0});
    this._drawPass(this._blurPass);

    GL.setRenderTarget(this._smallFBOs[0]);
    GL.clear();
    this._blurSourceSlot.texture = this._thresholdMaps[1];
    this._blurPass.setUniform("stepSize", {x: 0.0, y: this._anisotropy / this._thresholdHeight});
    this._drawPass(this._blurPass);

    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._drawPass(this._compositePass);
};


export { Bloom };