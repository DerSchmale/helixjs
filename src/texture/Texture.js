/**
 *
 * @constructor
 */
HX.Texture2D = function()
{
    this._default = HX.DEFAULT_TEXTURE_2D;
    this._texture = HX.GL.createTexture();
    this._width = 0;
    this._height = 0;

    this.bind();
    // set defaults
    HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MIN_FILTER, HX.TextureFilter.DEFAULT.min);
    HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MAG_FILTER, HX.TextureFilter.DEFAULT.mag);
    HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_S, HX.TextureWrapMode.DEFAULT.s);
    HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_T, HX.TextureWrapMode.DEFAULT.t);

    if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC && HX.DEFAULT_TEXTURE_MAX_ANISOTROPY > 0) {
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, HX.DEFAULT_TEXTURE_MAX_ANISOTROPY);
    }

    this._isReady = false;
};

HX.Texture2D.prototype =
{
    constructor: HX.Texture2D,

    dispose: function()
    {
        HX.GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX.GL.generateMipmap(HX.GL.TEXTURE_2D);
    },

    setFilter: function(filter)
    {
        this.bind();
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MIN_FILTER, filter.min);
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MAG_FILTER, filter.mag);
    },

    setWrapMode: function(mode)
    {
        this.bind();
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_S, mode.s);
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_T, mode.t);
    },

    setMaxAnisotropy: function(value)
    {
        if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC)
            HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
    },

    width: function() { return this._width; },
    height: function() { return this._height; },

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

        if (unitIndex > HX._numActiveTextures)
            HX._numActiveTextures = unitIndex;
    }
};

HX.FileTexture2D = function(url, generateMipmaps, onComplete, onError)
{
    HX.Texture2D.call(this);

    generateMipmaps = generateMipmaps === undefined? true : generateMipmaps;
    var image = new Image();
    var texture = this;

    image.onload = function() {
        texture.uploadImage(image, image.naturalWidth, image.naturalHeight, generateMipmaps);
        if (onComplete) onComplete();
    };

    image.onError = function() {
        console.warn("Failed loading texture '" + url + "'");
        if (onError) onError();
    };

    image.src = url;
};

HX.FileTexture2D.prototype = Object.create(HX.Texture2D.prototype);


/**
 *
 * @constructor
 */
HX.TextureCube = function()
{
    this._default = HX.DEFAULT_TEXTURE_CUBE;
    this._texture = HX.GL.createTexture();
    this._size = 0;

    this.bind();
    // set defaults
    HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MIN_FILTER, HX.TextureFilter.DEFAULT.min);
    HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MAG_FILTER, HX.TextureFilter.DEFAULT.mag);

    if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC && HX.DEFAULT_TEXTURE_MAX_ANISOTROPY > 0) {
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, HX.DEFAULT_TEXTURE_MAX_ANISOTROPY);
    }

    this._isReady = false;
};

HX.TextureCube.prototype =
{
    constructor: HX.TextureCube,

    dispose: function()
    {
        HX.GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX.GL.generateMipmap(HX.GL.TEXTURE_CUBE_MAP);
    },

    setFilter: function(filter)
    {
        this.bind();
        HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MIN_FILTER, filter.min);
        HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MAG_FILTER, filter.mag);
    },

    size: function() { return this._size; },

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

        if (unitIndex > HX._numActiveTextures)
            HX._numActiveTextures = unitIndex;
    }
};


/**
 *
 * @param urls
 * @param generateMipmaps
 * @param onComplete
 * @param onError
 * @constructor
 */
HX.FileTextureCube = function(urls, generateMipmaps, onComplete, onError)
{
    HX.TextureCube.call(this);

    generateMipmaps = generateMipmaps === undefined? true : generateMipmaps;
    var images = [];
    var texture = this;

    for (var i = 0; i < 6; ++i) {
        var image = new Image();
        image.nextID = i + 1;
        if (i < 5) {
            image.onload = function()
            {
                images[this.nextID].src = urls[this.nextID];
            }
        }
        // last image to load
        else {
            image.onload = function() {
                texture.uploadImages(images, this.naturalWidth, generateMipmaps);
                if (onComplete) onComplete();
            };
        }

        image.onError = function() {
            console.warn("Failed loading texture '" + url + "'");
            if (onError) onError();
        };

        images[i] = image;
    }

    images[0].src = urls[0];
};

HX.FileTextureCube.prototype = Object.create(HX.TextureCube.prototype);


/**
 * A MippedTextureCube that loads an entire mip-chain from files rather than generating it using generateMipmap. This is
 * useful for precomputed specular mip levels. The files are expected to be in a folder structure and with filenames as
 * such:
 * <path>/<mip-level>/posX.<extension>
 * <path>/<mip-level>/negX.<extension>
 * <path>/<mip-level>/posY.<extension>
 * <path>/<mip-level>/negY.<extension>
 * <path>/<mip-level>/posZ.<extension>
 * <path>/<mip-level>/negZ.<extension>
 * @param path The path to the mip-level subdirectories
 * @param extension The extension of the filenames
 * @param numMips The number of mips to be loaded
 * @param onComplete
 * @param onError
 * @constructor
 */
HX.MippedTextureCube = function(path, extension, numMips, onComplete, onError)
{
    HX.TextureCube.call(this);

    var images = [];
    var texture = this;
    var len = numMips * 6;
    var urls = [];
    var dirToken = path.charAt(-1) === "/"? "" : "/";
    path = path + dirToken;
    for (var i = 0; i < numMips; ++i) {
        var dir = path + i + "/";
        urls.push(dir + "posX." + extension);
        urls.push(dir + "negX." + extension);
        urls.push(dir + "posY." + extension);
        urls.push(dir + "negY." + extension);
        urls.push(dir + "posZ." + extension);
        urls.push(dir + "negZ." + extension);
    }

    for (var i = 0; i < len; ++i) {
        var image = new Image();
        image.nextID = i + 1;
        if (i < len - 1) {
            image.onload = function()
            {
                images[this.nextID].src = urls[this.nextID];
            }
        }
        // last image to load
        else {
            image.onload = function() {
                for (var m = 0; m < numMips; ++m)
                    texture.uploadImagesToMipLevel(images.slice(m*6, m*6 + 6), m);

                texture._isReady = true;
                if (onComplete) onComplete();
            };
        }

        image.onError = function() {
            console.warn("Failed loading texture '" + url + "'");
            if (onError) onError();
        };

        images[i] = image;
    }

    images[0].src = urls[0];
};

HX.MippedTextureCube.prototype = Object.create(HX.TextureCube.prototype);