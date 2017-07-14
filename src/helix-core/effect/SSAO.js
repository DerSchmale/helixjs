import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Texture2D} from "../texture/Texture2D";
import {FrameBuffer} from "../texture/FrameBuffer";
import {TextureFilter, TextureWrapMode} from "../Helix";
import {PoissonSphere} from "../math/PoissonSphere";
import {TextureUtils} from "../texture/TextureUtils";
import {GL} from "../core/GL";
import {Color} from "../core/Color";
import {Effect} from "./Effect";

/**
 * @classdesc
 * SSAO adds Screen-Space Ambient Occlusion to the renderer.
 *
 * @property {number} sampleRadius The sample radius in world space to search for occluders.
 * @property {number} fallOffDistance The maximum distance for occluders to still count.
 * @property {number} strength The strength of the ambient occlusion effect.
 * @property {number} scale The scale at which to calculate the ambient occlusion (usually 0.5, half-resolution)
 *
 * @constructor
 * @param numSamples The amount of samples to take per pixel.
 *
 * @see {@linkcode Renderer#ambientOcclusion}
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SSAO(numSamples)
{
    numSamples = numSamples || 8;
    if (numSamples > 64) numSamples = 64;

    this._numSamples = numSamples;
    this._strength = 1.0;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._scale = .5;
    this._ditherTexture = null;

    Effect.call(this);

    this._ssaoPass = new EffectPass(null,
        ShaderLibrary.get("ssao_fragment.glsl",
            {
                NUM_SAMPLES: numSamples
            }
        ));
    this._blurPass = new EffectPass(ShaderLibrary.get("ao_blur_vertex.glsl"), ShaderLibrary.get("ao_blur_fragment.glsl"));

    this._initSamples();
    this._initDitherTexture();
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
    this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._ssaoPass.setUniform("sampleRadius", this._radius);
    this._ssaoPass.setTexture("ditherTexture", this._ditherTexture);
    this._sourceTextureSlot = this._blurPass.getTextureSlot("source");

    this._ssaoTexture = new Texture2D();
    this._ssaoTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._ssaoTexture.wrapMode = TextureWrapMode.CLAMP;
    this._backTexture = new Texture2D();
    this._backTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._backTexture.wrapMode = TextureWrapMode.CLAMP;
    this._fbo1 = new FrameBuffer(this._backTexture);
    this._fbo2 = new FrameBuffer(this._ssaoTexture);
}

SSAO.prototype = Object.create(Effect.prototype, {
    sampleRadius: {
        get: function ()
        {
            return this._radius;
        },
        set: function (value)
        {
            this._radius = value;
            this._ssaoPass.setUniform("sampleRadius", this._radius);
        }
    },

    fallOffDistance: {
        get: function ()
        {
            return this._fallOffDistance;
        },
        set: function (value)
        {
            this._fallOffDistance = value;
            this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
        }
    },

    strength: {
        get: function()
        {
            return this._strength;
        },
        set: function (value)
        {
            this._strength = value;
            this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
        }
    },

    scale: {
        get: function() { return this._scale; },
        set: function(value) { this._scale = value; }
    }
});

/**
 * Returns the texture containing the ambient occlusion values.
 * @returns {Texture2D}
 *
 * @ignore
 */
SSAO.prototype.getAOTexture = function()
{
    return this._ssaoTexture;
};

/**
 * @ignore
 * @private
 */
SSAO.prototype._initSamples = function()
{
    var samples = [];
    var j = 0;
    var poissonPoints = PoissonSphere.DEFAULT.getPoints();

    for (var i = 0; i < this._numSamples; ++i) {
        var point = poissonPoints[i];

        // power of two, to create a bit more for closer occlusion
        samples[j++] = Math.pow(point.x, 2);
        samples[j++] = Math.pow(point.y, 2);
        samples[j++] = Math.pow(point.z, 2);
    }

    this._ssaoPass.setUniformArray("samples", new Float32Array(samples));
};

/**
 * @ignore
 */
SSAO.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;

    if (TextureUtils.assureSize(w, h, this._ssaoTexture, this._fbo2)) {
        TextureUtils.assureSize(w, h, this._backTexture, this._fbo1);
        this._ssaoPass.setUniform("ditherScale", {x: w *.25, y: h *.25});
    }

    GL.setClearColor(Color.WHITE);

    GL.setRenderTarget(this._fbo1);
    GL.clear();
    this._drawPass(this._ssaoPass);

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
SSAO.prototype._initDitherTexture = function()
{
    var data = [ 126, 255, 126, 255, 135, 253, 105, 255, 116, 51, 26, 255, 137, 57, 233, 255, 139, 254, 121, 255, 56, 61, 210, 255, 227, 185, 73, 255, 191, 179, 30, 255, 107, 245, 173, 255, 205, 89, 34, 255, 191, 238, 138, 255, 56, 233, 125, 255, 198, 228, 161, 255, 85, 13, 164, 255, 140, 248, 168, 255, 147, 237, 65, 255 ];

    // in case you're wondering, below is how the list above is generated:
    // We're just using fixed data to prevent poor random results
    /*var n = new HX.Float4();
    for (var i = 0; i < 16; ++i) {
        var azimuthal = Math.random() * Math.PI * 2.0;
        var polar = Math.random() * Math.PI;
        n.fromSphericalCoordinates(1.0, azimuthal, polar);
        data[i * 4] = Math.round((n.x * .5 + .5) * 0xff);
        data[i * 4 + 1] = Math.round((n.y * .5 + .5) * 0xff);
        data[i * 4 + 2] = Math.round((n.z * .5 + .5) * 0xff);
        data[i * 4 + 3] = 0xff;
    }
    console.log(data.join(", "));*/

    this._ditherTexture = new Texture2D();
    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.filter = TextureFilter.NEAREST_NOMIP;
    this._ditherTexture.wrapMode = TextureWrapMode.REPEAT;
};

export { SSAO };