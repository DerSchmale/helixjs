import {Texture2D} from "../texture/Texture2D";
import {Importer} from "./Importer";

/**
 * @classdesc
 *
 * JPG is an importer for JPG images as textures. Yields a {@linkcode Texture2D} object.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function JPG()
{
    Importer.call(this, Texture2D, Importer.TYPE_IMAGE);
}

JPG.prototype = Object.create(Importer.prototype);

JPG.prototype.parse = function(data, target)
{
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    target.uploadImage(data, data.naturalWidth, data.naturalHeight, generateMipmaps);
    this._notifyComplete(target);
};

/**
 * Synonymous to {@linkcode JPG}.
 */
var PNG = JPG;

export { JPG, PNG };