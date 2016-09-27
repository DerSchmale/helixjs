/**
 * Loads a jpg or png equirectangular as a cubemap
 * @constructor
 */
HX.JPG_HEIGHTMAP = function()
{
    HX.Importer.call(this, HX.Texture2D, HX.Importer.TYPE_IMAGE);
};

HX.JPG_HEIGHTMAP.prototype = Object.create(HX.Importer.prototype);

HX.JPG_HEIGHTMAP.prototype.parse = function(data, target)
{
    var texture2D = new HX.Texture2D();
    texture2D.wrapMode = HX.TextureWrapMode.REPEAT;
    texture2D.uploadImage(data, data.naturalWidth, data.naturalHeight, true);

    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    HX.HeightMap.from8BitTexture(texture2D, generateMipmaps, target);
    texture2D.dispose();
    this._notifyComplete(target);
};

HX.PNG_HEIGHTMAP = HX.JPG_HEIGHTMAP;