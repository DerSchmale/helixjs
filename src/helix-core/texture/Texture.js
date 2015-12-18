/**
 *
 * @constructor
 */
HX.Texture2D = function()
{
    this._name = null;
    this._default = HX.Texture2D.DEFAULT;
    this._texture = HX.GL.createTexture();
    this._width = 0;
    this._height = 0;

    this.bind();

    // set defaults
    this.filter = HX.TextureFilter.DEFAULT;
    this.wrapMode = HX.TextureWrapMode.DEFAULT;
    this.maxAnisotropy = HX.DEFAULT_TEXTURE_MAX_ANISOTROPY;

    this._isReady = false;

    HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
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
        HX.GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX.GL.generateMipmap(HX.GL.TEXTURE_2D);
        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    get filter()
    {
        return this._filter;
    },

    set filter(filter)
    {
        this._filter = filter;
        this.bind();
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MIN_FILTER, filter.min);
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MAG_FILTER, filter.mag);
        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    get wrapMode()
    {
        return this._wrapMode;
    },

    set wrapMode(mode)
    {
        this._wrapMode = mode;
        this.bind();
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_S, mode.s);
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_T, mode.t);
        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
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
            HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    get width() { return this._width; },
    get height() { return this._height; },

    initEmpty: function(width, height, format, dataType)
    {
        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;

        this.bind();
        this._width = width;
        this._height = height;

        HX.GL.texImage2D(HX.GL.TEXTURE_2D, 0, format, width, height, 0, format, dataType, null);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    uploadData: function(data, width, height, generateMips, format, dataType)
    {
        this._width = width;
        this._height = height;

        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? false: generateMips;

        this.bind();

        HX.GL.texImage2D(HX.GL.TEXTURE_2D, 0, format, width, height, 0, format, dataType, data);

        if (generateMips)
            HX.GL.generateMipmap(HX.GL.TEXTURE_2D);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    uploadImage: function(image, width, height, generateMips, format, dataType)
    {
        this._width = width;
        this._height = height;

        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        if (image)
            HX.GL.pixelStorei(HX.GL.UNPACK_FLIP_Y_WEBGL, 1);

        HX.GL.texImage2D(HX.GL.TEXTURE_2D, 0, format, format, dataType, image);

        if (generateMips)
            HX.GL.generateMipmap(HX.GL.TEXTURE_2D);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    isReady: function() { return this._isReady; },

    // binds a texture to a given texture unit
    bind: function(unitIndex)
    {
        if (unitIndex !== undefined)
            HX.GL.activeTexture(HX.GL.TEXTURE0 + unitIndex);

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, this._texture);
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
    this._texture = HX.GL.createTexture();
    this._size = 0;

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
    HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
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
        HX.GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX.GL.generateMipmap(HX.GL.TEXTURE_CUBE_MAP);
        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
    },

    get filter()
    {
        return this._filter;
    },

    set filter(filter)
    {
        this._filter = filter;
        this.bind();
        HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MIN_FILTER, filter.min);
        HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MAG_FILTER, filter.mag);
        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
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
            HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
    },

    get size() { return this._size; },

    initEmpty: function(size, format, dataType)
    {
        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;

        this._size = size;

        this.bind();

        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, null);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    uploadData: function(data, size, generateMips, format, dataType)
    {
        this._size = size;

        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        HX.GL.pixelStorei(HX.GL.UNPACK_FLIP_Y_WEBGL, 0);

        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, data[0]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, data[1]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, data[2]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, data[3]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, data[4]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, data[5]);

        if (generateMips)
            HX.GL.generateMipmap(HX.GL.TEXTURE_CUBE_MAP);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
    },

    uploadImages: function(images, generateMips, format, dataType)
    {
        generateMips = generateMips === undefined? true: generateMips;

        this.uploadImagesToMipLevel(images, 0, format, dataType);

        if (generateMips) {
            this.bind();
            HX.GL.generateMipmap(HX.GL.TEXTURE_CUBE_MAP);
        }

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
    },

    uploadImagesToMipLevel: function(images, mipLevel, format, dataType)
    {
        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;

        if (mipLevel == 0)
            this._size = images[0].naturalWidth;

        this.bind();

        HX.GL.pixelStorei(HX.GL.UNPACK_FLIP_Y_WEBGL, 0);

        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_X, mipLevel, format, format, dataType, images[0]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_X, mipLevel, format, format, dataType, images[1]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Y, mipLevel, format, format, dataType, images[2]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, mipLevel, format, format, dataType, images[3]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Z, mipLevel, format, format, dataType, images[4]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, mipLevel, format, format, dataType, images[5]);

        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
    },

    isReady: function() { return this._isReady; },

    // binds a texture to a given texture unit
    bind: function(unitIndex)
    {
        if (unitIndex !== undefined)
            HX.GL.activeTexture(HX.GL.TEXTURE0 + unitIndex);

        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, this._texture);
    },

    toString: function()
    {
        return "[TextureCube(name=" + this._name + ")]";
    }
};