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
    assureSize: function(width, height, texture, fbo)
    {
        if (width === texture.width && height === texture.height)
            return false;

        texture.initEmpty(width, height);
        if (fbo) fbo.init();
        return true;
    },

    isPowerOfTwo: function(value)
    {
        return value? ((value & -value) === value) : false;
    },

    loadTexture2D: function(url, generateMipmaps, onComplete, onError)
    {
        var texture = new HX.Texture2D();

        generateMipmaps = generateMipmaps === undefined? true : generateMipmaps;
        var image = new Image();

        image.onload = function() {
            texture.uploadImage(image, image.naturalWidth, image.naturalHeight, generateMipmaps);
            if (onComplete) onComplete();
        };

        image.onError = function() {
            console.warn("Failed loading texture '" + url + "'");
            if (onError) onError();
        };

        image.src = url;

        return texture;
    },

    loadTextureCube: function(urls, generateMipmaps, onComplete, onError)
    {
        var texture = new HX.TextureCube();

        generateMipmaps = generateMipmaps === undefined? true : generateMipmaps;
        var images = [];

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
                    texture.uploadImages(images, generateMipmaps);
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

        return texture;
    },

    /**
     * Loads an entire mip-chain from files rather than generating it using generateMipmap. This is
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
    loadMipChain: function(path, extension, onComplete, onError)
    {
        var texture = new HX.TextureCube();

        var images = [];

        var numMips;
        var urls = [];
        var dirToken = path.charAt(-1) === "/"? "" : "/";
        path = path + dirToken;

        var firstImage = new Image();
        var firstURL = path + "0/posX." + extension;

        firstImage.onload = function()
        {
            if (firstImage.naturalWidth != firstImage.naturalHeight || !HX.TextureUtils.isPowerOfTwo(firstImage.naturalWidth)) {
                console.warn("Failed loading mipchain at '" + path + "': incorrect dimensions");
                onError();
            }
            else {
                numMips = HX.log2(firstImage.naturalWidth) + 1;
                loadTheRest();
                images[0] = firstImage;
            }
        };

        firstImage.onerror = function()
        {
            console.warn("Failed loading texture '" + firstURL + "'");
            if (onError) onError();
        };

        firstImage.src = firstURL;

        function loadTheRest()
        {
            var len = numMips * 6;
            for (var i = 0; i < numMips; ++i) {
                var dir = path + i + "/";
                urls.push(dir + "posX." + extension);
                urls.push(dir + "negX." + extension);
                urls.push(dir + "posY." + extension);
                urls.push(dir + "negY." + extension);
                urls.push(dir + "posZ." + extension);
                urls.push(dir + "negZ." + extension);
            }

            for (var i = 1; i < len; ++i) {
                var image = new Image();
                image.nextID = i + 1;
                if (i < len - 1) {
                    image.onload = function ()
                    {
                        images[this.nextID].src = urls[this.nextID];
                    }
                }
                // last image to load
                else {
                    image.onload = function ()
                    {
                        for (var m = 0; m < numMips; ++m)
                            texture.uploadImagesToMipLevel(images.slice(m * 6, m * 6 + 6), m);

                        texture._isReady = true;
                        if (onComplete) onComplete();
                    };
                }

                image.onError = function ()
                {
                    console.warn("Failed loading texture '" + url + "'");
                    if (onError) onError();
                };

                images[i] = image;
            }

            images[1].src = urls[1];
        }

        return texture;
    }
};