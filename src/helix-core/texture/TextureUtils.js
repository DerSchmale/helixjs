import {GL} from "../core/GL";
import {DataType, DEFAULTS, TextureFormat} from "../Helix";
import {RectMesh} from "../mesh/RectMesh";
import {BlitTexture} from "../utils/BlitTexture";
import {Texture2D} from "./Texture2D";
import {FrameBuffer} from "./FrameBuffer";
import {CustomCopyShader} from "../render/UtilShaders";
import {ShaderLibrary} from "../shader/ShaderLibrary";

var toRGBA8;

/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
export var TextureUtils =
{
    /**
     * Resizes a texture (empty) if its size doesn't match. Returns true if the size has changed.
     * @param width The target width
     * @param height The target height
     * @param texture The texture to be resized if necessary
     * @param fbo (optional) Any fbos to be reinitialized if necessary
     * @returns {boolean} Returns true if the texture has been resized, false otherwise.
     */
    assureSize: function(width, height, texture, fbo, format, dataType)
    {
        if (width === texture.width && height === texture.height)
            return false;

        texture.initEmpty(width, height, format, dataType);
        if (fbo) fbo.init();
        return true;
    },

    /**
     * Copies a texture into a Framebuffer.
     * @param sourceTexture The source texture to be copied.
     * @param destFBO The target FBO to copy into.
     */
    copy: function(sourceTexture, destFBO)
    {
        GL.setRenderTarget(destFBO);
        GL.clear();
        DEFAULTS.COPY_SHADER.execute(RectMesh.DEFAULT, sourceTexture);
        GL.setRenderTarget(null);
    },

    // ref: http://stackoverflow.com/questions/32633585/how-do-you-convert-to-half-floats-in-javascript
    encodeHalfFloat: function(val) {

        var floatView = new Float32Array(1);
        var int32View = new Int32Array(floatView.buffer);

        /* This method is faster than the OpenEXR implementation (very often
         * used, eg. in Ogre), with the additional benefit of rounding, inspired
         * by James Tursa?s half-precision code. */
        return function toHalf(val) {

            floatView[0] = val;
            var x = int32View[0];

            var bits = (x >> 16) & 0x8000; /* Get the sign */
            var m = (x >> 12) & 0x07ff; /* Keep one extra bit for rounding */
            var e = (x >> 23) & 0xff; /* Using int is faster here */

            /* If zero, or denormal, or exponent underflows too much for a denormal
             * half, return signed zero. */
            if (e < 103) {
                return bits;
            }

            /* If NaN, return NaN. If Inf or exponent overflow, return Inf. */
            if (e > 142) {
                bits |= 0x7c00;
                /* If exponent was 0xff and one mantissa bit was set, it means NaN,
                 * not Inf, so make sure we set one mantissa bit too. */
                bits |= ((e === 255) ? 0 : 1) && (x & 0x007fffff);
                return bits;
            }

            /* If exponent underflows but not too much, return a denormal */
            if (e < 113) {
                m |= 0x0800;
                /* Extra rounding may overflow and set mantissa to 0 and exponent
                 * to 1, which is OK. */
                bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
                return bits;
            }

            bits |= ((e - 112) << 10) | (m >> 1);
            /* Extra rounding. An overflow will set mantissa to 0 and increment
             * the exponent, which is OK. */
            bits += m & 1;
            return bits;
        };
    }(),

    encodeToFloat16Array: function(float32Array)
    {
        var encFun = TextureUtils.encodeHalfFloat;
        var arr = [];
        for (var i = 0; i < float32Array.length; ++i) {
            arr[i] = encFun(float32Array[i]);
        }
        return new Uint16Array(arr);
    },

    /**
     * Returns the raw image data from a texture. This can be very slow, so use with care.
     *
     * @param texture The texture to read back from
     * @param rgbaEnc True if the texture contains greyscale float data.
     */
    getData: function(texture, rgbaEnc)
    {
        var w = texture.width;
        var h = texture.height;
        var dataType = DataType.UNSIGNED_BYTE;

        // There's a problem with Safari here, since it doesn't support readPixels with FLOAT types
        if (!rgbaEnc && (texture.dataType === DataType.HALF_FLOAT || texture.dataType === DataType.FLOAT)) {
            throw new Error("Reading float textures is not supported on all platforms (Safari)!");
		}

        var tex = new Texture2D();
        tex.initEmpty(w, h, TextureFormat.RGBA, dataType);

        var fbo = new FrameBuffer(tex);
        fbo.init();

        GL.setRenderTarget(fbo);
        GL.clear();

        if (rgbaEnc) {
            if (!toRGBA8)
			    toRGBA8 = new CustomCopyShader(ShaderLibrary.get("greyscale_to_rgba8.glsl"));
			toRGBA8.execute(RectMesh.DEFAULT, texture);
        }
        else
            BlitTexture.execute(texture);

        var len = w * h * 4;

        var data;
        if (dataType === DataType.FLOAT)
            data = new Float32Array(len);
        else if (dataType === DataType.UNSIGNED_BYTE)
            data = new Uint8Array(len);

        GL.gl.readPixels(0, 0, w, h, TextureFormat.RGBA, dataType, data);

        return data;
    }
};