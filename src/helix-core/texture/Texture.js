import {GL} from "../core/GL";
import {MathX} from "../math/MathX";
import {capabilities, TextureFilter, TextureFormat, TextureWrapMode} from "../Helix";

/**
 * @classdesc
 * A base class for textures.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Texture(target)
{
	this._keepData = false;
	this._data = null;
	this._format = null;
	this._dataType = null;
	this._glTarget = target;
	this._texture = GL.gl.createTexture();

	this.bind();
	this.filter = TextureFilter.DEFAULT;
	this.maxAnisotropy = capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY;
	this._isReady = false;

	GL.gl.bindTexture(target, null);

}

Texture.prototype =
{
	/**
	 * Generates a mip map chain.
	 */
	generateMipmap: function()
	{
		var gl = GL.gl;

		this.bind();

		gl.generateMipmap(this._glTarget);
		gl.bindTexture(this._glTarget, null);
	},

	/**
	 * Defines whether or not CPU-side data should be kept in the data property;
	 * @returns {boolean}
	 */
	get keepData()
	{
		return this._keepData;
	},

	/**
	 * Defines whether or not CPU-side data should be kept in the data property;
	 * @returns {boolean}
	 */
	set keepData(value)
	{
		this._keepData = value;
		if (!value) this._data = null;
	},

	/**
	 * The data used during the last upload. Only available if keepData is true.
	 * @returns {null}
	 */
	get data()
	{
		return this._data;
	},

	/**
	 * The amount of color components per pixel.
	 */
	get numComponents()
	{
		switch (this._format) {
			case TextureFormat.RED:
				return 1;
			case TextureFormat.RG:
				return 2;
			case TextureFormat.RGB:
				return 3;
			case TextureFormat.RGBA:
				return 4;
		}
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
		gl.texParameteri(this._glTarget, gl.TEXTURE_MIN_FILTER, filter.min);
		gl.texParameteri(this._glTarget, gl.TEXTURE_MAG_FILTER, filter.mag);
		gl.bindTexture(this._glTarget, null);

		if (filter === TextureFilter.NEAREST_NOMIP || filter === TextureFilter.NEAREST) {
			this.maxAnisotropy = 1;
		}
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
			GL.gl.texParameteri(this._glTarget, capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);

		gl.bindTexture(this._glTarget, null);
	},

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

		gl.bindTexture(this._glTarget, this._texture);
	}
};

export { Texture };