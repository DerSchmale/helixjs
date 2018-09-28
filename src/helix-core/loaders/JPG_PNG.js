import {Texture2D} from "../texture/Texture2D";
import {Importer} from "./Importer";

/**
 * @classdesc
 *
 * JPG is an importer for JPG images as textures. Yields a {@linkcode Texture2D} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function JPG()
{
    Importer.call(this, Importer.TYPE_IMAGE);
}

JPG.prototype = Object.create(Importer.prototype);

JPG.prototype.parse = function(data, target)
{
    target = target || new Texture2D();
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    target.uploadImage(data, data.naturalWidth, data.naturalHeight, generateMipmaps);
    this._notifyComplete(target);
};

/**
 * @classdesc
 * Synonymous to {@linkcode JPG}.
 *
 * @constructor
 */
var PNG = JPG;

export { JPG, PNG };