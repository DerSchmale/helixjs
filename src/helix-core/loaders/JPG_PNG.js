import {Texture2D} from "../texture/Texture2D";
import {Importer} from "./Importer";
import {HeightMap} from "../utils/HeightMap";
import {TextureCube} from "../texture/TextureCube";
import {EquirectangularTexture} from "../utils/EquirectangularTexture";

/**
 * @classdesc
 *
 * JPG is an importer for JPG images as textures. Normally this yields a {@linkcode Texture2D} object.
 *
 * The options property supports the following settings:
 * <ul>
 * <li>equiToCube: This will assume the jpg contains an equirectangular texture that needs to be transformed to a cube map.
 * Yields a {@linkcode TextureCube} object.</li>
 * <li>cubeSize: An optional size for the cube map size.</li>
 * <li>heightMap: This will assume the jpg contains height map data that needs to be smoothed out to counter the staircase
 * effect exhibited by the limited 8-bit precision. The data will be encoded in 32-bit RGBA.</li>
 * <li>generateMipmaps: This will cause mipmaps to be generated. Defaults to true.</li>
 * </ul>
 *
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
    var tex2D;
    if (this.options.equiToCube) {
		tex2D = new Texture2D();
		target = target || new TextureCube();
    }
    else {
		target = target || new Texture2D();
		tex2D = this.options.heightMap? new Texture2D() : target;
	}

    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    tex2D.uploadImage(data, data.naturalWidth, data.naturalHeight, generateMipmaps);

    if (this.options.equiToCube)
		EquirectangularTexture.toCube(tex2D, this.options.cubeSize, generateMipmaps, target);
    else if (this.options.heightmap)
		HeightMap.from8BitTexture(tex2D, generateMipmaps, target);

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