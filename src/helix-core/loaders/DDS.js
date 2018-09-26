// References:
// https://docs.microsoft.com/en-gb/windows/desktop/direct3ddds/dx-graphics-dds-pguide
// https://blog.tojicode.com/2011/12/compressed-textures-in-webgl.html (used as a starting point guide for parsing here)

import {Texture2D} from "../texture/Texture2D";
import {Importer} from "./Importer";
import {DataStream} from "../core/DataStream";
import {capabilities} from "../Helix";

var DDS_CONSTANTS = {
	MAGIC: 0x20534444
};

var DDS_FLAGS = {
	DDSD_CAPS: 0x1,
	DDSD_HEIGHT: 0x2,
	DDSD_WIDTH: 0x4,
	DDSD_PITCH: 0x8,
	DDSD_PIXELFORMAT: 0x1000,
	DDSD_MIPMAPCOUNT: 0x20000,
	DDSD_LINEARSIZE: 0x80000,
	DDSD_DEPTH: 0x800000
};

var DDS_PIXEL_FORMAT_FLAGS = {
	DDPF_ALPHAPIXELS: 0x1,
	DDPF_ALPHA: 0x2,
	DDPF_FOURCC: 0x4,
	DDPF_RGB: 0x8,
	DDPF_YUV: 0x16,
	DDPF_LUMINANCE: 0x32
};

/**
 * @classdesc
 *
 * DDS is an importer for dxt compressed textures in Microsoft's DDS format. Yields a {@linkcode Texture2D} object.
 * Currently, only DXT1 and DXT5 encoding is supported.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DDS()
{
	Importer.call(this, Texture2D, Importer.TYPE_BINARY);
}

DDS.prototype = Object.create(Importer.prototype);

Object.defineProperties(DDS, {
	isSupported: {
		get: function()
		{
			return !!capabilities.EXT_COMPRESSED_TEXTURE_S3TC;
		}
	}
});

DDS.prototype.parse = function(data, target)
{
	if (!DDS.isSupported)
		throw new Error("DDS is not supported");

	this._stream = new DataStream(data);
	this._target = target;
	this._parseHeader();
	this._parseData();
	this._notifyComplete(target);
};

DDS.prototype._parseHeader = function()
{
	var data = this._stream.getUint32Array(30);

	// magic + struct of DWORDs shown here: https://docs.microsoft.com/en-gb/windows/desktop/direct3ddds/dds-header
	if (data[0] !== DDS_CONSTANTS.MAGIC)
		throw new Error("Not a DDS file!");

	// TODO: Support other formats in WebGL 2?
	if (!(data[20] & DDS_PIXEL_FORMAT_FLAGS.DDPF_FOURCC))
		throw new Error("Unsupported format. Texture must contain RGB data");

	// width and height are swapped!
	this._height = data[3];
	this._width = data[4];
	this._parseInternalFormat(data[21]);
	this._parseMipLevels(data);

	this._stream.offset = data[1] + 4;
};

DDS.prototype._parseMipLevels = function(header)
{
	if (header[2] & DDS_FLAGS.DDSD_MIPMAPCOUNT) {
		this._mipLevels = Math.max(1, header[7]);
	}
	else
		this._mipLevels = 1;
};

DDS.prototype._parseInternalFormat = function(fourCC)
{
	var str = String.fromCharCode(fourCC & 0xff);
	str += String.fromCharCode((fourCC >> 8) & 0xff);
	str += String.fromCharCode((fourCC >> 16) & 0xff);
	str += String.fromCharCode((fourCC >> 24) & 0xff);

	switch (str) {
		case "DXT1":
			this._blockSize = 8;
			this._internalFormat = capabilities.EXT_COMPRESSED_TEXTURE_S3TC.COMPRESSED_RGBA_S3TC_DXT1_EXT;
			break;

		case "DXT5":
			this._blockSize = 16;
			this._internalFormat = capabilities.EXT_COMPRESSED_TEXTURE_S3TC.COMPRESSED_RGBA_S3TC_DXT5_EXT;
			break;

		default:
			throw new Error("Unknown encoding method");
	}
};

DDS.prototype._parseData = function()
{
	var w = this._width;
	var h = this._height;
	var generateMipmaps = this._mipLevels === 1;


	for (var i = 0; i < this._mipLevels; ++i) {
		var dataLength = Math.max(1, ((w + 3) >> 2)) * Math.max(1, ((h + 3) >> 2)) * this._blockSize;
		var data = this._stream.getUint8Array(dataLength);
		this._target.uploadCompressedData(data, w, h, 0, generateMipmaps, this._internalFormat, i);
		w >>= 1;
		h >>= 1;
		if (w === 0) w = 1;
		if (h === 0) h = 1;
	}
};

export {DDS};