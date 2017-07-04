/**
 *
 * @constructor
 */
import {GL} from "../core/GL";
import {DataType, TextureFormat, TextureFilter, TextureWrapMode, capabilities} from "../Helix";
import {TextureUtils} from "./TextureUtils";

function Texture2D()
{
    this._name = null;
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

Texture2D._initDefault = function()
{
    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);
    Texture2D.DEFAULT = new Texture2D();
    Texture2D.DEFAULT.uploadData(data, 1, 1, true);
    Texture2D.DEFAULT.filter = TextureFilter.NEAREST_NOMIP;
};

Texture2D.prototype =
{
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    dispose: function()
    {
        GL.gl.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        var gl = GL.gl;

        this.bind();

        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    },

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

    get width() { return this._width; },
    get height() { return this._height; },
    get format() { return this._format; },
    get dataType() { return this._dataType; },

    initEmpty: function(width, height, format, dataType)
    {
        var gl = GL.gl;
        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;

        this.bind();
        this._width = width;
        this._height = height;

        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, dataType, null);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    uploadData: function(data, width, height, generateMips, format, dataType)
    {
        var gl = GL.gl;

        if (capabilities.EXT_HALF_FLOAT_TEXTURES && dataType === capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES)
            data = TextureUtils.encodeToFloat16Array(data);

        this._width = width;
        this._height = height;

        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? false: generateMips;

        this.bind();

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, dataType, data);

        if (generateMips)
            gl.generateMipmap(gl.TEXTURE_2D);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    uploadImage: function(image, width, height, generateMips, format, dataType)
    {
        var gl = GL.gl;

        this._width = width;
        this._height = height;

        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        if (image)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

        gl.texImage2D(gl.TEXTURE_2D, 0, format, format, dataType, image);

        if (generateMips)
            gl.generateMipmap(gl.TEXTURE_2D);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    isReady: function() { return this._isReady; },

    // binds a texture to a given texture unit
    bind: function(unitIndex)
    {
        var gl = GL.gl;

        if (unitIndex !== undefined) {
            gl.activeTexture(gl.TEXTURE0 + unitIndex);
        }

        gl.bindTexture(gl.TEXTURE_2D, this._texture);
    },

    toString: function()
    {
        return "[Texture2D(name=" + this._name + ")]";
    }
};


export { Texture2D };