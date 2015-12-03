HX.Texture2DLoader =
{
    /**
     * Loads default JPG or PNG images to a texture
     * @param url The url of the texture to load
     * @param generateMipmaps [optional] Whether or not to generate mipmaps. Defaults to true.
     * @param onComplete [optional] A callback called when the texture is loaded.
     * @param onError [optional] A callback when the texture loading failed.
     * @returns {HX.Texture2D} The texture, while it's still loading.
     */
    load: function(url, generateMipmaps, onComplete, onError)
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
    }
};
