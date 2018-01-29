import {capabilities, DataType, TextureFormat} from "../Helix";
import {GL} from "../core/GL";
import {Texture2D} from "./Texture2D";

/**
 * @classdesc
 * FrameBuffer provides a render target associated with a given texture/textures.
 *
 * @param colorTextures Either a single texture, or an Array of textures (only if {@linkcode capabilities#EXT_DRAW_BUFFERS} is supported).
 * @param depthBuffer An optional depth buffer. This can be a {@linkcode WriteOnlyDepthBuffer} or, if readback is required, a {@linkcode Texture2D} (only available if {@linkcode capabilities#EXT_DEPTH_TEXTURE} is supported).
 * @param cubeFace If colorTextures is a {@linkcode TextureCube}, cubeFace should contain the relevant {@linkcode CubeFace}.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FrameBuffer(colorTextures, depthBuffer, cubeFace)
{
    if (colorTextures && colorTextures[0] === undefined) colorTextures = [ colorTextures ];

    this._cubeFace = cubeFace;
    this._colorTextures = colorTextures;
    this._numColorTextures = this._colorTextures? this._colorTextures.length : 0;
    this._depthBuffer = depthBuffer;

    if (this._colorTextures && this._numColorTextures > 1) {

        this._drawBuffers = new Array(this._numColorTextures);
        for (var i = 0; i < this._numColorTextures; ++i) {
            this._drawBuffers[i] = capabilities.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i;
        }
    }
    else {
        this._drawBuffers = null;
    }

    this._fbo = GL.gl.createFramebuffer();
}

FrameBuffer.prototype = {
    get width() { return this._width; },
    get height() { return this._height; },

    /**
     * Initializes the framebuffer object. This needs to be called whenever the Texture2D's are resized using initEmpty.
     * @param silent Whether or not warnings should be printed.
     */
    init: function(silent)
    {
        var gl = GL.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

        if (this._colorTextures) {
            if (this._cubeFace === undefined) {
                this._width = this._colorTextures[0]._width;
                this._height = this._colorTextures[0]._height;
            }
            else {
                this._height = this._width = this._colorTextures[0].size;
            }
        }
        else  {
            this._width = this._depthBuffer._width;
            this._height = this._depthBuffer._height;
        }

        var target = this._cubeFace === undefined? gl.TEXTURE_2D : this._cubeFace;

        if (this._numColorTextures === 1) {
            var texture = this._colorTextures[0];
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, texture._texture, 0);
        }
        else if (capabilities.EXT_DRAW_BUFFERS) {
            for (var i = 0; i < this._numColorTextures; ++i) {
                texture = this._colorTextures[i];
                gl.framebufferTexture2D(gl.FRAMEBUFFER, capabilities.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i, target, texture._texture, 0);
            }
        }
        else
            throw new Error("Trying to bind multiple render targets without EXT_DRAW_BUFFERS support!");


        if (this._depthBuffer) {
            var attachment = this._depthBuffer.format === gl.DEPTH_STENCIL? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;

            if (this._depthBuffer instanceof Texture2D)
                gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, this._depthBuffer._texture, 0);
            else
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, this._depthBuffer._renderBuffer);
        }

        var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

        switch (status && !silent) {
            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                break;
            case gl.FRAMEBUFFER_UNSUPPORTED:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_UNSUPPORTED");
                break;
            default:
                // nothing
        }

        return status === gl.FRAMEBUFFER_COMPLETE;
    },

	/**
     * Retrieves pixel data from this FBO. Not recommended, as it can be slow.
	 */
	readPixels: function()
    {
		var gl = GL.gl;
		var texture = this._colorTextures[0];
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

		var numComponents;
		var pixels;
		switch(texture.format) {
            case TextureFormat.RGB:
				numComponents = 3;
				break;
            case TextureFormat.RGBA:
				numComponents = 4;
				break;
		}

		var len = this.width * this.height * numComponents;
		switch(texture.dataType) {
            case DataType.FLOAT:
            case DataType.HALF_FLOAT:
				pixels = new Float32Array(len);
                break;
            case DataType.UNSIGNED_BYTE:
				pixels = new Uint8Array(len);
				break;
        }
		gl.readPixels(0, 0, this.width, this.height, texture.format, texture.dataType, pixels);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return pixels;
    }

};

export { FrameBuffer };