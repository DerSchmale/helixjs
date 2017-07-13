/**
 * Loads a jpg or png equirectangular as a cubemap
 * @constructor
 */
import {Texture2D} from "../texture/Texture2D";
import {Importer} from "./Importer";
import {TextureWrapMode} from "../Helix";
import {HeightMap} from "../utils/HeightMap";

function JPG_HEIGHTMAP()
{
    Importer.call(this, Texture2D, Importer.TYPE_IMAGE);
};

JPG_HEIGHTMAP.prototype = Object.create(Importer.prototype);

JPG_HEIGHTMAP.prototype.parse = function(data, target)
{
    var texture2D = new Texture2D();
    texture2D.wrapMode = TextureWrapMode.REPEAT;
    texture2D.uploadImage(data, data.naturalWidth, data.naturalHeight, true);

    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    HeightMap.from8BitTexture(texture2D, generateMipmaps, target);
    texture2D.dispose();
    this._notifyComplete(target);
};

var PNG_HEIGHTMAP = JPG_HEIGHTMAP;

export { JPG_HEIGHTMAP, PNG_HEIGHTMAP };