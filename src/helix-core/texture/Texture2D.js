import {GL} from "../core/GL";
import {DataType, TextureFormat, TextureFilter, TextureWrapMode, capabilities} from "../Helix";
import {TextureUtils} from "./TextureUtils";
import {MathX} from "../math/MathX";
import {Texture} from "./Texture";

var nameCounter = 0;

/**
 * @classdesc
 * Texture2D represents a 2D texture.
 *
 * @constructor
 *
 * @property name The name of the texture.
 * @property width The texture's width
 * @property height The texture's height
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Texture2D()
{
	Texture.call(this, GL.gl.TEXTURE_2D);

	this.name = "hx_texture2d_" + (nameCounter++);
	this._default = Texture2D.DEFAULT;
    this._width = 0;
    this._height = 0;

	this.wrapMode = TextureWrapMode.DEFAULT;
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

Texture2D.prototype = Object.create(Texture.prototype, {
	numMips: {
		get: function() {
			return Math.floor(MathX.log2(Math.max(this._width, this._height)));
		}
	},
	wrapMode: {
		get: function()
		{
			return this._wrapMode;
		},

		set: function(value)
		{
			var gl = GL.gl;
			this._wrapMode = value;
			this.bind();
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, value.s);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, value.t);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
	},
	width: {
		get: function() { return this._width; }
	},
	height: {
		get: function() { return this._height; }
	}
});

/**
 * Inits an empty texture.
 * @param width The width of the texture.
 * @param height The height of the texture.
 * @param {TextureFormat} format The texture's format.
 * @param {DataType} dataType The texture's data format.
 */
Texture2D.prototype.initEmpty = function(width, height, format, dataType)
{
	this._data = null;
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
};

/**
 * Initializes the texture with the given data.
 * @param {*} data An typed array containing the initial data.
 * @param {number} width The width of the texture.
 * @param {number} height The height of the texture.
 * @param {boolean} generateMips Whether or not a mip chain should be generated.
 * @param {TextureFormat} format The texture's format.
 * @param {DataType} dataType The texture's data format.
 * @param {number} mipLevel The target mip map level. Defaults to 0. If provided, generateMips should be false.
 */
Texture2D.prototype.uploadData = function(data, width, height, generateMips, format, dataType, mipLevel)
{
	var gl = GL.gl;

	if (capabilities.EXT_HALF_FLOAT_TEXTURES && dataType === DataType.HALF_FLOAT && !(data instanceof Uint16Array))
		data = TextureUtils.encodeToFloat16Array(data);

	if (!mipLevel) {
		this._width = width;
		this._height = height;
		this._format = format || TextureFormat.RGBA;
		this._dataType = dataType || DataType.UNSIGNED_BYTE;

		if (this._keepData)
			this._data = data;
	}

	format = this._format;
	dataType = this._dataType;

	generateMips = generateMips === undefined? false: generateMips;

	this.bind();

	var internalFormat = TextureFormat.getDefaultInternalFormat(format, dataType);
	gl.texImage2D(gl.TEXTURE_2D, mipLevel || 0, internalFormat, width, height, 0, format, dataType, data);

	if (generateMips)
		gl.generateMipmap(gl.TEXTURE_2D);

	this._isReady = true;

	gl.bindTexture(gl.TEXTURE_2D, null);
};

/**
 * Initializes the texture with a given Image.
 * @param image The Image to upload to the texture
 * @param width The width of the texture.
 * @param height The height of the texture.
 * @param generateMips Whether or not a mip chain should be generated.
 * @param {TextureFormat} format The texture's format.
 * @param {DataType} dataType The texture's data format.
 * @param {number} mipLevel The target mip map level. Defaults to 0. If provided, generateMips should be false.
 */
Texture2D.prototype.uploadImage = function(image, width, height, generateMips, format, dataType, mipLevel)
{
	var gl = GL.gl;

	if (!mipLevel) {
		this._width = width;
		this._height = height;
		this._format = format || TextureFormat.RGBA;
		this._dataType = dataType || DataType.UNSIGNED_BYTE;

		if (this._keepData)
			this._data = image;
	}

	format = this._format;
	dataType = this._dataType;

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

	var internalFormat = TextureFormat.getDefaultInternalFormat(format, dataType);
	gl.texImage2D(gl.TEXTURE_2D, mipLevel || 0, internalFormat, format, dataType, image);

	if (generateMips)
		gl.generateMipmap(gl.TEXTURE_2D);

	this._isReady = true;

	gl.bindTexture(gl.TEXTURE_2D, null);
};

/**
 * Uploads compressed data.
 *
 * @param {*} data An typed array containing the initial data.
 * @param {number} width The width of the texture.
 * @param {number} height The height of the texture.
 * @param {boolean} generateMips Whether or not a mip chain should be generated.
 * @param {*} internalFormat The texture's internal compression format.
 * @param {number} mipLevel The target mip map level. Defaults to 0. If provided, generateMips should be false.
 */
Texture2D.prototype.uploadCompressedData = function(data, width, height, generateMips, internalFormat, mipLevel)
{
	if (this._keepData)
		this._data = data;
	var gl = GL.gl;

	if (!mipLevel) {
		this._width = width;
		this._height = height;
		this._format = TextureFormat.RGBA;
		this._dataType = DataType.UNSIGNED_BYTE;

		if (this._keepData)
			this._data = data;
	}

	this.bind();

	gl.compressedTexImage2D(gl.TEXTURE_2D, mipLevel || 0, internalFormat, width, height, 0, data);

	if (generateMips)
		gl.generateMipmap(gl.TEXTURE_2D);

	this._isReady = true;

	gl.bindTexture(gl.TEXTURE_2D, null);
};

/**
 * @ignore
 */
Texture2D.prototype.toString = function()
{
	return "[Texture2D(name=" + this.name + ")]";
};


export { Texture2D };