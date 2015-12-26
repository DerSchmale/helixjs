HX.JPG = function()
{
    HX.Importer.call(this, HX.Texture2D, HX.Importer.TYPE_IMAGE);
};

HX.JPG.prototype = Object.create(HX.Importer.prototype);

HX.JPG.prototype.parse = function(data, target)
{
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    target.uploadImage(data, data.naturalWidth, data.naturalHeight, generateMipmaps);
    this._notifyComplete(target);
};

HX.PNG = HX.JPG;