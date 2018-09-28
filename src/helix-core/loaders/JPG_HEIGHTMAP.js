import {Texture2D} from "../texture/Texture2D";
import {Importer} from "./Importer";
import {TextureWrapMode} from "../Helix";
import {HeightMap} from "../utils/HeightMap";

/**
 * @classdesc
 * JPG_HEIGHTMAP imports an 8-bit per channel image and smooths it out to serve as a height map. Otherwise, the limited
 * 8 bit precision would result in a stair-case effect. Yields a {@linkcode Texture2D} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function JPG_HEIGHTMAP()
{
    Importer.call(this, Importer.TYPE_IMAGE);
}

JPG_HEIGHTMAP.prototype = Object.create(Importer.prototype);

JPG_HEIGHTMAP.prototype.parse = function(data, target)
{
    target = target || new Texture2D();

    var texture2D = new Texture2D();
    texture2D.wrapMode = TextureWrapMode.REPEAT;
    texture2D.uploadImage(data, data.naturalWidth, data.naturalHeight, true);

    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    HeightMap.from8BitTexture(texture2D, generateMipmaps, target);
    this._notifyComplete(target);
};

var PNG_HEIGHTMAP = JPG_HEIGHTMAP;

export { JPG_HEIGHTMAP, PNG_HEIGHTMAP };