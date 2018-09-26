import {GL} from "../core/GL";
import {DataType, TextureFormat, TextureFilter, capabilities, CubeFace} from "../Helix";

var nameCounter = 0;

//       +-----+
//       |  +Z |
// +-----+-----+-----+-----+
// |  -X |  +Y |  +X |  -Y |
// +-----+-----+-----+-----+
//       |  -Z |
//       +-----+

/**
 * @classdesc
 * TextureCube represents a cube map texture. The order of the textures in a cross map is as such:
 *
 * @constructor
 *
 * @property name The name of the texture.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function TextureCube()
{
	this.name = "hx_texturecube_" + (nameCounter++);
    this._default = TextureCube.DEFAULT;
    this._texture = GL.gl.createTexture();
    this._size = 0;
    this._format = null;
    this._dataType = null;

    this.bind();
    this.filter = TextureFilter.DEFAULT;
    this.maxAnisotropy = capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY;

    this._isReady = false;
}

/**
 * @ignore
 */
TextureCube._initDefault = function()
{
    var gl = GL.gl;
    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);
    TextureCube.DEFAULT = new TextureCube();
    TextureCube.DEFAULT.uploadData([data, data, data, data, data, data], 1, true);
    TextureCube.DEFAULT.filter = TextureFilter.NEAREST_NOMIP;
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
};

TextureCube.prototype =
{
    /**
     * Generates a mip map chain.
     */
    generateMipmap: function()
    {
        this.bind();
        var gl = GL.gl;
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
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
        this._filter = filter;
        this.bind();
        var gl = GL.gl;
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, filter.min);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, filter.mag);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
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
        if (value > capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY)
            value = capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY;

        this._maxAnisotropy = value;

        this.bind();

        var gl = GL.gl;
        if (capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC)
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    },

    /**
     * The cube texture's size
     */
    get size() { return this._size; },

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
     * @param size The size of the texture.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    initEmpty: function(size, format, dataType)
    {
        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;

        this._size = size;

        this.bind();

        var gl = GL.gl;
		var internalFormat = TextureFormat.getDefaultInternalFormat(format, dataType);
		gl.texImage2D(CubeFace.POSITIVE_X, 0, internalFormat, size, size, 0, format, dataType, null);
        gl.texImage2D(CubeFace.NEGATIVE_X, 0, internalFormat, size, size, 0, format, dataType, null);
        gl.texImage2D(CubeFace.POSITIVE_Y, 0, internalFormat, size, size, 0, format, dataType, null);
        gl.texImage2D(CubeFace.NEGATIVE_Y, 0, internalFormat, size, size, 0, format, dataType, null);
        gl.texImage2D(CubeFace.POSITIVE_Z, 0, internalFormat, size, size, 0, format, dataType, null);
        gl.texImage2D(CubeFace.NEGATIVE_Z, 0, internalFormat, size, size, 0, format, dataType, null);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * Initializes the texture with the given data.
     * @param data A array of typed arrays (per {@linkcode CubeFace}) containing the initial data.
     * @param size The size of the texture.
     * @param generateMips Whether or not a mip chain should be generated.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    uploadData: function(data, size, generateMips, format, dataType)
    {
        this._size = size;

        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        var gl = GL.gl;
		var internalFormat = TextureFormat.getDefaultInternalFormat(format, dataType);
        gl.texImage2D(CubeFace.POSITIVE_X, 0, internalFormat, size, size, 0, format, dataType, data[0]);
        gl.texImage2D(CubeFace.NEGATIVE_X, 0, internalFormat, size, size, 0, format, dataType, data[1]);
        gl.texImage2D(CubeFace.POSITIVE_Y, 0, internalFormat, size, size, 0, format, dataType, data[2]);
        gl.texImage2D(CubeFace.NEGATIVE_Y, 0, internalFormat, size, size, 0, format, dataType, data[3]);
        gl.texImage2D(CubeFace.POSITIVE_Z, 0, internalFormat, size, size, 0, format, dataType, data[4]);
        gl.texImage2D(CubeFace.NEGATIVE_Z, 0, internalFormat, size, size, 0, format, dataType, data[5]);

        if (generateMips)
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    },

    /**
     * Initializes the texture with the given Images.
     * @param data A array of typed arrays (per {@linkcode CubeFace}) containing the initial data.
     * @param generateMips Whether or not a mip chain should be generated.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    uploadImages: function(images, generateMips, format, dataType)
    {
        generateMips = generateMips === undefined? true: generateMips;

        this._format = format;
        this._dataType = dataType;

        this.uploadImagesToMipLevel(images, 0, format, dataType);

        var gl = GL.gl;
        if (generateMips) {
            this.bind();
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        }

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    },

    /**
     * Initializes a miplevel with the given Images.
     * @param data A array of typed arrays (per {@linkcode CubeFace}) containing the initial data.
     * @param mipLevel The mip-level to initialize.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    uploadImagesToMipLevel: function(images, mipLevel, format, dataType)
    {
        var gl = GL.gl;
        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;

        if (mipLevel === 0)
            this._size = images[0].naturalWidth;

        this.bind();

		var internalFormat = TextureFormat.getDefaultInternalFormat(format, dataType);
        gl.texImage2D(CubeFace.POSITIVE_X, mipLevel, internalFormat, format, dataType, images[0]);
        gl.texImage2D(CubeFace.NEGATIVE_X, mipLevel, internalFormat, format, dataType, images[1]);
        gl.texImage2D(CubeFace.POSITIVE_Y, mipLevel, internalFormat, format, dataType, images[2]);
        gl.texImage2D(CubeFace.NEGATIVE_Y, mipLevel, internalFormat, format, dataType, images[3]);
        gl.texImage2D(CubeFace.POSITIVE_Z, mipLevel, internalFormat, format, dataType, images[4]);
        gl.texImage2D(CubeFace.NEGATIVE_Z, mipLevel, internalFormat, format, dataType, images[5]);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
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

        if (unitIndex !== undefined)
            gl.activeTexture(gl.TEXTURE0 + unitIndex);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._texture);
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[TextureCube(name=" + this.name + ")]";
    }
};

export { TextureCube };