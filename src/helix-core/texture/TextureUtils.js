HX.TextureUtils =
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
        HX.setRenderTarget(destFBO);
        HX.clear();
        HX.COPY_SHADER.execute(HX.RectMesh.DEFAULT, sourceTexture);
        HX.setRenderTarget(null);
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
        var encFun = HX.TextureUtils.encodeHalfFloat;
        var arr = [];
        for (var i = 0; i < float32Array.length; ++i) {
            arr[i] = encFun(float32Array[i]);
        }
        return new Uint16Array(arr);
    }
};