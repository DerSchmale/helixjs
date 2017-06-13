/**
 *
 * @constructor
 */
HX.Texture2D = function()
{
    this._name = null;
    this._default = HX.Texture2D.DEFAULT;
    this._texture = HX_GL.createTexture();
    this._width = 0;
    this._height = 0;
    this._format = null;
    this._dataType = null;

    this.bind();

    // set defaults
    this.maxAnisotropy = HX.DEFAULT_TEXTURE_MAX_ANISOTROPY;
    this.filter = HX.TextureFilter.DEFAULT;
    this.wrapMode = HX.TextureWrapMode.DEFAULT;

    this._isReady = false;

    HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
};

HX.Texture2D._initDefault = function()
{
    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);
    HX.Texture2D.DEFAULT = new HX.Texture2D();
    HX.Texture2D.DEFAULT.uploadData(data, 1, 1, true);
    HX.Texture2D.DEFAULT.filter = HX.TextureFilter.NEAREST_NOMIP;
};

HX.Texture2D.prototype =
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
        HX_GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX_GL.generateMipmap(HX_GL.TEXTURE_2D);
        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    get filter()
    {
        return this._filter;
    },

    set filter(filter)
    {
        this._filter = filter;
        this.bind();
        HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX_GL.TEXTURE_MIN_FILTER, filter.min);
        HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX_GL.TEXTURE_MAG_FILTER, filter.mag);
        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);

        if (filter === HX.TextureFilter.NEAREST_NOMIP || filter === HX.TextureFilter.NEAREST) {
            this.maxAnisotropy = 1;
        }
    },

    get wrapMode()
    {
        return this._wrapMode;
    },

    set wrapMode(mode)
    {
        this._wrapMode = mode;
        this.bind();
        HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX_GL.TEXTURE_WRAP_S, mode.s);
        HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX_GL.TEXTURE_WRAP_T, mode.t);
        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    get maxAnisotropy()
    {
        return this._maxAnisotropy;
    },

    set maxAnisotropy(value)
    {
        if (value > HX.DEFAULT_TEXTURE_MAX_ANISOTROPY)
            value = HX.DEFAULT_TEXTURE_MAX_ANISOTROPY;

        this._maxAnisotropy = value;

        this.bind();
        if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC)
            HX_GL.texParameteri(HX_GL.TEXTURE_2D, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    get width() { return this._width; },
    get height() { return this._height; },
    get format() { return this._format; },
    get dataType() { return this._dataType; },

    initEmpty: function(width, height, format, dataType)
    {
        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;

        this.bind();
        this._width = width;
        this._height = height;

        HX_GL.texImage2D(HX_GL.TEXTURE_2D, 0, format, width, height, 0, format, dataType, null);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    uploadData: function(data, width, height, generateMips, format, dataType)
    {
        this._width = width;
        this._height = height;

        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? false: generateMips;

        this.bind();

        HX_GL.pixelStorei(HX_GL.UNPACK_FLIP_Y_WEBGL, 1);

        HX_GL.texImage2D(HX_GL.TEXTURE_2D, 0, format, width, height, 0, format, dataType, data);

        if (generateMips)
            HX_GL.generateMipmap(HX_GL.TEXTURE_2D);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    uploadImage: function(image, width, height, generateMips, format, dataType)
    {
        this._width = width;
        this._height = height;

        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        if (image)
            HX_GL.pixelStorei(HX_GL.UNPACK_FLIP_Y_WEBGL, 1);

        HX_GL.texImage2D(HX_GL.TEXTURE_2D, 0, format, format, dataType, image);

        if (generateMips)
            HX_GL.generateMipmap(HX_GL.TEXTURE_2D);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    isReady: function() { return this._isReady; },

    // binds a texture to a given texture unit
    bind: function(unitIndex)
    {
        if (unitIndex !== undefined) {
            HX_GL.activeTexture(HX_GL.TEXTURE0 + unitIndex);
        }

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, this._texture);
    },

    toString: function()
    {
        return "[Texture2D(name=" + this._name + ")]";
    }
};


/**
 *
 * @constructor
 */
HX.TextureCube = function()
{
    this._name = null;
    this._default = HX.TextureCube.DEFAULT;
    this._texture = HX_GL.createTexture();
    this._size = 0;
    this._format = null;
    this._dataType = null;

    this.bind();
    this.filter = HX.TextureFilter.DEFAULT;
    this.maxAnisotropy = HX.DEFAULT_TEXTURE_MAX_ANISOTROPY;

    this._isReady = false;
};

HX.TextureCube._initDefault = function()
{
    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);
    HX.TextureCube.DEFAULT = new HX.TextureCube();
    HX.TextureCube.DEFAULT.uploadData([data, data, data, data, data, data], 1, true);
    HX.TextureCube.DEFAULT.filter = HX.TextureFilter.NEAREST_NOMIP;
    HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
};

HX.TextureCube.prototype =
{
    constructor: HX.TextureCube,

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
        HX_GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX_GL.generateMipmap(HX_GL.TEXTURE_CUBE_MAP);
        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    get filter()
    {
        return this._filter;
    },

    set filter(filter)
    {
        this._filter = filter;
        this.bind();
        HX_GL.texParameteri(HX_GL.TEXTURE_CUBE_MAP, HX_GL.TEXTURE_MIN_FILTER, filter.min);
        HX_GL.texParameteri(HX_GL.TEXTURE_CUBE_MAP, HX_GL.TEXTURE_MAG_FILTER, filter.mag);
        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    get maxAnisotropy()
    {
        return this._maxAnisotropy;
    },

    set maxAnisotropy(value)
    {
        if (value > HX.DEFAULT_TEXTURE_MAX_ANISOTROPY)
            value = HX.DEFAULT_TEXTURE_MAX_ANISOTROPY;

        this._maxAnisotropy = value;

        this.bind();
        if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC)
            HX_GL.texParameteri(HX_GL.TEXTURE_CUBE_MAP, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    get size() { return this._size; },
    get format() { return this._format; },
    get dataType() { return this._dataType; },

    initEmpty: function(size, format, dataType)
    {
        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;

        this._size = size;

        this.bind();

        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, null);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, null);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_2D, null);
    },

    uploadData: function(data, size, generateMips, format, dataType)
    {
        this._size = size;

        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        HX_GL.pixelStorei(HX_GL.UNPACK_FLIP_Y_WEBGL, 0);

        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, data[0]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, data[1]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, data[2]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, data[3]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, data[4]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, data[5]);

        if (generateMips)
            HX_GL.generateMipmap(HX_GL.TEXTURE_CUBE_MAP);

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    uploadImages: function(images, generateMips, format, dataType)
    {
        generateMips = generateMips === undefined? true: generateMips;

        this._format = format;
        this._dataType = dataType;

        this.uploadImagesToMipLevel(images, 0, format, dataType);

        if (generateMips) {
            this.bind();
            HX_GL.generateMipmap(HX_GL.TEXTURE_CUBE_MAP);
        }

        this._isReady = true;

        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    uploadImagesToMipLevel: function(images, mipLevel, format, dataType)
    {
        this._format = format = format || HX_GL.RGBA;
        this._dataType = dataType = dataType || HX_GL.UNSIGNED_BYTE;

        if (mipLevel === 0)
            this._size = images[0].naturalWidth;

        this.bind();

        HX_GL.pixelStorei(HX_GL.UNPACK_FLIP_Y_WEBGL, 0);

        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_X, mipLevel, format, format, dataType, images[0]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_X, mipLevel, format, format, dataType, images[1]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Y, mipLevel, format, format, dataType, images[2]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, mipLevel, format, format, dataType, images[3]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Z, mipLevel, format, format, dataType, images[4]);
        HX_GL.texImage2D(HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, mipLevel, format, format, dataType, images[5]);

        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, null);
    },

    isReady: function() { return this._isReady; },

    // binds a texture to a given texture unit
    bind: function(unitIndex)
    {
        if (unitIndex !== undefined)
            HX_GL.activeTexture(HX_GL.TEXTURE0 + unitIndex);

        HX_GL.bindTexture(HX_GL.TEXTURE_CUBE_MAP, this._texture);
    },

    toString: function()
    {
        return "[TextureCube(name=" + this._name + ")]";
    }
};