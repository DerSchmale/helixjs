/**
 * Loads a jpg or png equirectangular as a cubemap
 * @constructor
 */
import {Importer} from "./Importer";
import {TextureCube} from "../texture/TextureCube";
import {TextureWrapMode} from "../Helix";
import {Texture2D} from "../texture/Texture2D";
import {EquirectangularTexture} from "../utils/EquirectangularTexture";

function JPG_EQUIRECTANGULAR()
{
    Importer.call(this, TextureCube, Importer.TYPE_IMAGE);
}

JPG_EQUIRECTANGULAR.prototype = Object.create(Importer.prototype);

JPG_EQUIRECTANGULAR.prototype.parse = function(data, target)
{
    var texture2D = new Texture2D();
    texture2D.wrapMode = TextureWrapMode.REPEAT;
    texture2D.uploadImage(data, data.naturalWidth, data.naturalHeight, true);

    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    EquirectangularTexture.toCube(texture2D, this.options.size, generateMipmaps, target);
    texture2D.dispose();
    this._notifyComplete(target);
};

var PNG_EQUIRECTANGULAR = JPG_EQUIRECTANGULAR;

export { JPG_EQUIRECTANGULAR, PNG_EQUIRECTANGULAR };