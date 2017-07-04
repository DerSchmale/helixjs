import {Texture2D} from "../texture/Texture2D";
import {Importer} from "./Importer";

function JPG()
{
    Importer.call(this, Texture2D, Importer.TYPE_IMAGE);
};

JPG.prototype = Object.create(Importer.prototype);

JPG.prototype.parse = function(data, target)
{
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    target.uploadImage(data, data.naturalWidth, data.naturalHeight, generateMipmaps);
    this._notifyComplete(target);
};

var PNG = JPG;

export { JPG, PNG };