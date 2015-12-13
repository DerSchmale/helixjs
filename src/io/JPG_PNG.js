HX.JPG = function()
{
    HX.AssetParser.call(this, HX.Texture2D, HX.AssetParser.IMAGE);
};

HX.JPG.prototype = Object.create(HX.AssetParser.prototype);

HX.JPG.prototype.parse = function(data, target)
{
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    target.uploadImage(data, data.naturalWidth, data.naturalHeight, generateMipmaps);
    this._notifyComplete(target);
};

HX.PNG = HX.JPG;