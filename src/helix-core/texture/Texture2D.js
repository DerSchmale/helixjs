import {GL} from "../core/GL";
import {DataType, TextureFormat, TextureFilter, TextureWrapMode, capabilities} from "../Helix";
import {TextureUtils} from "./TextureUtils";
import {MathX} from "../math/MathX";

var nameCounter = 0;

/**
 * @classdesc
 * Texture2D represents a 2D texture.
 *
 * @constructor
 *
 * @propety name The name of the texture.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Texture2D()
{
    this.name = "hx_texture2d_" + (nameCounter++);
    this._default = Texture2D.DEFAULT;
    this._texture = GL.gl.createTexture();
    this._width = 0;
    this._height = 0;
    this._format = null;
    this._dataType = null;

    this.bind();

    // set defaults
    this.maxAnisotropy = capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY;
    this.filter = TextureFilter.DEFAULT;
    this.wrapMode = TextureWrapMode.DEFAULT;

    this._isReady = false;

    GL.gl.bindTexture(GL.gl.TEXTURE_2D, null);
}

/**
 * @ignore
 */
Texture2D._initDefault = function()
{
    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);
    Texture2D.DEFAULT = new Texture2D();
    Texture2D.DEFAULT.uploadData(data, 1, 1, true);
    Texture2D.DEFAULT.filter = TextureFilter.NEAREST_NOMIP;
};

Texture2D.prototype =
{
    /**
     * Generates a mip map chain.
     */
    generateMipmap: function()
    {
        var gl = GL.gl;

        this.bind();

        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * A {@linkcode TextureFilter} object defining how the texture should be filtered during sampling.
     */
    get filter()
    {
        return this._filter;
    },

    set filter(filter)
    {
        var gl = GL.gl;
        this._filter = filter;
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter.min);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter.mag);
        gl.bindTexture(gl.TEXTURE_2D, null);

        if (filter === TextureFilter.NEAREST_NOMIP || filter === TextureFilter.NEAREST) {
            this.maxAnisotropy = 1;
        }
    },

    /**
     * A {@linkcode TextureWrapMode} object defining how out-of-bounds sampling should be handled.
     */
    get wrapMode()
    {
        return this._wrapMode;
    },

    set wrapMode(mode)
    {
        var gl = GL.gl;
        this._wrapMode = mode;
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mode.s);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, mode.t);
        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * The maximum anisotropy used when sampling. Limited to {@linkcode capabilities#DEFAULT_TEXTURE_MAX_ANISOTROPY}
     */
    get maxAnisotropy()
    {
        return this._maxAnisotropy;
    },

    set maxAnisotropy(value)
    {
        var gl = GL.gl;

        if (value > capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY)
            value = capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY;

        this._maxAnisotropy = value;

        this.bind();
        if (capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC)
            GL.gl.texParameteri(gl.TEXTURE_2D, capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * The texture's width
     */
    get width() { return this._width; },

    /**
     * The texture's height
     */
    get height() { return this._height; },

    /**
     * The texture's format
     *
     * @see {@linkcode TextureFormat}
     */
    get format() { return this._format; },

    /**
     * The texture's data type
     *
     * @see {@linkcode DataType}
     */
    get dataType() { return this._dataType; },

    /**
     * Inits an empty texture.
     * @param width The width of the texture.
     * @param height The height of the texture.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    initEmpty: function(width, height, format, dataType)
    {
        var gl = GL.gl;
        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;

        this.bind();
        this._width = width;
        this._height = height;

		var internalFormat = TextureFormat.getDefaultInternalFormat(format, dataType);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, dataType, null);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * Initializes the texture with the given data.
     * @param {*} data An typed array containing the initial data.
     * @param {number} width The width of the texture.
     * @param {number} height The height of the texture.
     * @param {boolean} generateMips Whether or not a mip chain should be generated.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    uploadData: function(data, width, height, generateMips, format, dataType)
    {
        var gl = GL.gl;

        if (capabilities.EXT_HALF_FLOAT_TEXTURES && dataType === DataType.HALF_FLOAT)
            data = TextureUtils.encodeToFloat16Array(data);

        this._width = width;
        this._height = height;

        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? false: generateMips;

        this.bind();

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

        var internalFormat = TextureFormat.getDefaultInternalFormat(format, dataType);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, dataType, data);

        if (generateMips)
            gl.generateMipmap(gl.TEXTURE_2D);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * Initializes the texture with a given Image.
     * @param image The Image to upload to the texture
     * @param width The width of the texture.
     * @param height The height of the texture.
     * @param generateMips Whether or not a mip chain should be generated.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     *
     * TODO: Just use image.naturalWidth / image.naturalHeight ?
     */
    uploadImage: function(image, width, height, generateMips, format, dataType)
    {
        var gl = GL.gl;

        this._width = width;
        this._height = height;

        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        if (!(MathX.isPowerOfTwo(width) && MathX.isPowerOfTwo(height))) {
			generateMips = false;
			if (this.filter === TextureFilter.NEAREST)
			    this.filter = TextureFilter.NEAREST_NOMIP;
			else if (this.filter === TextureFilter.BILINEAR)
				this.filter = TextureFilter.BILINEAR_NOMIP;
			else if (this.filter === TextureFilter.TRILINEAR || this.filter === TextureFilter.TRILINEAR_ANISOTROPIC)
				this.filter = TextureFilter.BILINEAR_NOMIP;

			this.wrapMode = TextureWrapMode.CLAMP;
		}

        this.bind();

        if (image)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

		var internalFormat = TextureFormat.getDefaultInternalFormat(format, dataType);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, dataType, image);

        if (generateMips)
            gl.generateMipmap(gl.TEXTURE_2D);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * Defines whether data has been uploaded to the texture or not.
     */
    isReady: function() { return this._isReady; },

    /**
     * Binds a texture to a given texture unit.
     * @ignore
     */
    bind: function(unitIndex)
    {
        var gl = GL.gl;

        if (unitIndex !== undefined) {
            gl.activeTexture(gl.TEXTURE0 + unitIndex);
        }

        gl.bindTexture(gl.TEXTURE_2D, this._texture);
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[Texture2D(name=" + this.name + ")]";
    }
};


export { Texture2D };