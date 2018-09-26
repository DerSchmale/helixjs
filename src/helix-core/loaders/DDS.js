// References:
// https://docs.microsoft.com/en-gb/windows/desktop/direct3ddds/dx-graphics-dds-pguide
// https://blog.tojicode.com/2011/12/compressed-textures-in-webgl.html (used as a starting point guide for parsing here)

import {Texture2D} from "../texture/Texture2D";
import {Importer} from "./Importer";
import {DataStream} from "../core/DataStream";
import {capabilities, DataType, TextureFormat} from "../Helix";

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
 * Currently supported formats are:
 * - DXT1 (only if capabilities.EXT_COMPRESSED_TEXTURE_S3TC exists)
 * - DXT3 (only if capabilities.EXT_COMPRESSED_TEXTURE_S3TC exists)
 * - DXT5 (only if capabilities.EXT_COMPRESSED_TEXTURE_S3TC exists)
 * - Float16 RGBA
 * - Float32 RGBA
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

	this._internalFormat = null;
	this._dataType = null;

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
		case "DXT3":
			this._blockSize = 16;
			this._internalFormat = capabilities.EXT_COMPRESSED_TEXTURE_S3TC.COMPRESSED_RGBA_S3TC_DXT3_EXT;
			break;
		case "DXT5":
			this._blockSize = 16;
			this._internalFormat = capabilities.EXT_COMPRESSED_TEXTURE_S3TC.COMPRESSED_RGBA_S3TC_DXT5_EXT;
			break;
	}

	switch(fourCC) {
		case 113:
			this._internalFormat = TextureFormat.RGBA;
			this._dataType = DataType.HALF_FLOAT;
			break;
		case 116:
			this._internalFormat = TextureFormat.RGBA;
			this._dataType = DataType.FLOAT;
			break;
	}
};

DDS.prototype._parseData = function()
{
	var w = this._width;
	var h = this._height;
	var generateMipmaps = this._mipLevels === 1;


	for (var i = 0; i < this._mipLevels; ++i) {
		var data, dataLength;

		if (this._dataType) {
			dataLength = w * h * 4;
			switch (this._dataType) {
				case DataType.FLOAT:
					data = this._stream.getFloat32Array(dataLength);
					break;
				case DataType.HALF_FLOAT:
					data = this._stream.getFloat16Array(dataLength);
					break;
			}

			this._target.uploadData(data, w, h, generateMipmaps, this._internalFormat, this._dataType, i);
		}
		else {
			dataLength = Math.max(1, ((w + 3) >> 2)) * Math.max(1, ((h + 3) >> 2)) * this._blockSize;
			data = this._stream.getUint8Array(dataLength);
			this._target.uploadCompressedData(data, w, h, 0, generateMipmaps, this._internalFormat, i);
		}
		w >>= 1;
		h >>= 1;
		if (w === 0) w = 1;
		if (h === 0) h = 1;
	}
};

export {DDS};