/**
 * Loads a jpg or png equirectangular as a cubemap
 * @constructor
 */
HX.JPG_EQUIRECTANGULAR = function()
{
    HX.Importer.call(this, HX.TextureCube, HX.Importer.TYPE_IMAGE);
};

HX.JPG_EQUIRECTANGULAR.prototype = Object.create(HX.Importer.prototype);

HX.JPG_EQUIRECTANGULAR.prototype.parse = function(data, target)
{
    var texture2D = new HX.Texture2D();
    texture2D.wrapMode = HX.TextureWrapMode.REPEAT;
    texture2D.uploadImage(data, data.naturalWidth, data.naturalHeight, true);

    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    HX.TextureUtils.equirectangularToCube(texture2D, this.options.size, generateMipmaps, target);
    texture2D.dispose();
    this._notifyComplete(target);
};

HX.PNG_EQUIRECTANGULAR = HX.JPG_EQUIRECTANGULAR;