import {URLLoader} from "./URLLoader";
import {Importer} from "./Importer";
import {Texture2D} from "../texture/Texture2D";
import {TextureCube} from "../texture/TextureCube";
import {EquirectangularTexture} from "../utils/EquirectangularTexture";
import {DataStream} from "../core/DataStream";
import {capabilities, DataType, TextureFormat} from "../Helix";
import {Color} from "../core/Color";
import {Endian} from "../utils/Endian";

/**
 * @classdesc
 *
 * HDR is an importer for Radiance RGBE (.hdr) images as textures. Yields a {@linkcode Texture2D} or
 * {@linkcode TextureCube} object.
 *
 * The options property supports the following settings:
 * <ul>
 * <li>equiToCube: This will assume the jpg contains an equirectangular texture that needs to be transformed to a cube map.
 * Yields a {@linkcode TextureCube} object.</li>
 * <li>cubeSize: An optional size for the cube map size.</li>
 * <li>generateMipmaps: This will cause mipmaps to be generated. Defaults to true.</li>
 * <li>ldr: Indicated the image should be loaded as low dynamic range (32bpp).</li>
 * <li>exposure: The amount of stops to apply to the image. Positive values make the image brighter, negative darker.</li>
 * </ul>
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HDR()
{
	Importer.call(this, URLLoader.DATA_BINARY);
}

HDR.prototype = Object.create(Importer.prototype);

HDR.prototype.parse = function(data, target)
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

	this._stream = new DataStream(data);
	this._stream.endian = Endian.BIG_ENDIAN;
	this._texture = tex2D;

	this._generateMips = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;

	this._flipY = false;
	this._gamma = 1.0;
	this._exposure = Math.pow(2, this.options.exposure || 0);
	this._colorCorr = new Color(1, 1, 1);

	this._parseHeader();
	this._parseData();

	if (this.options.equiToCube)
		EquirectangularTexture.toCube(tex2D, this.options.cubeSize, this._generateMips, target);

	this._notifyComplete(target);
};

HDR.prototype._parseHeader = function()
{
	var line = this._readLine();

	console.assert(line === "#?RADIANCE" || line === "#?RGBE", "Incorrect file format!");

	while (line !== "") {
		// empty line means there's only 1 line left, containing size info:
		line = this._readLine();
		var parts = line.split("=");
		switch (parts[0]) {
			case "GAMMA":
				this._gamma = parseFloat(parts[1]);
				break;
			case "FORMAT":
				console.assert(parts[1] === "32-bit_rle_rgbe" || parts[1] === "32-bit_rle_xyze", "Incorrect format!");
				break;
			case "EXPOSURE":
				this._exposure *= parseFloat(parts[1]);
				break;
			case "COLORCORR":
				var p = parts[1].replace(/^\s+|\s+$/g, "").split(" ");
				this._colorCorr.set(p[0], p[1], p[2]);
				break;
		}
	}

	line = this._readLine();
	parts = line.split(" ");
	this._parseSize(parts[0], parseInt(parts[1]));
	this._parseSize(parts[2], parseInt(parts[3]));
};

HDR.prototype._parseSize = function(label, value)
{
	switch(label) {
		case "+X":
			this._width = value;
			break;
		case "-X":
			this._width = value;
			console.warn("Flipping horizontal orientation not currently supported");
			break;
		case "-Y":
			this._height = value;
			break;
		case "+Y":
			this._height = value;
			console.warn("Flipping vertical orientation not currently supported");
			break;
	}
};

HDR.prototype._readLine = function()
{
	var ch, str = "";
	while ((ch = this._stream.getChar()) !== "\n") {
		str += ch;
	}
	return str;
};

HDR.prototype._parseData = function()
{
	var hash = this._stream.getUint16();
	var data;
	this._stream.offset -= 2;
	// backtrack, as there was no hash
	if (hash === 0x0202)
		data = this._parseNewRLE();
	else {
        this._notifyFailure("Obsolete HDR file version!");
        return;
	}

	this._texture.uploadData(data, this._width, this._height, this._generateMips, TextureFormat.RGB, capabilities.HDR_DATA_TYPE);
};

HDR.prototype._parseNewRLE = function()
{
	var hdr = !this.options.ldr && capabilities.HDR_DATA_TYPE !== DataType.UNSIGNED_BYTE;
	var numPixels = this._width * this._height;
	var w = this._width;
	var data = new (hdr? Float32Array : Uint8Array)(numPixels * 3);
	var i = 0;

	for (var y = 0; y < this._height; ++y) {
		console.assert(this._stream.getUint16(), "Invalid scanline hash!");
		console.assert(this._stream.getUint16() === this._width, "Scanline doesn't match picture dimension!");

		var numComps = w * 4;

		// read individual RLE components
		var comps = [];
		var x = 0;

		while (x < numComps) {
			var value = this._stream.getUint8();
			if (value > 128) {
				// RLE:
				var len = value - 128;
				value = this._stream.getUint8();
				for (var rle = 0; rle < len; ++rle) {
					comps[x++] = value;
				}
			}
			else {
				len = value;
				for (var n = 0; n < len; ++n) {
					comps[x++] = this._stream.getUint8();
				}
			}
		}

		for (x = 0; x < w; ++x) {
			var r = comps[x];
			var g = comps[x + w];
			var b = comps[x + w * 2];
			var e = comps[x + w * 3];

			// NOT -128 but -136!!! This allows encoding smaller values rather than higher ones (as you'd expect).
			e = e? Math.pow(2.0, e - 136) : 0;

			// encode in gamma space
			r = Math.sqrt(r * e * this._exposure * this._colorCorr.r);
			g = Math.sqrt(g * e * this._exposure * this._colorCorr.g);
			b = Math.sqrt(b * e * this._exposure * this._colorCorr.b);

			if (!hdr) {
				r = Math.min(r * 0xff, 0xff);
				g = Math.min(g * 0xff, 0xff);
				b = Math.min(b * 0xff, 0xff);
			}

			data[i++] = r;
			data[i++] = g;
			data[i++] = b;
		}
	}

	return data;
};

export { HDR };