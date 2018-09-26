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
	this._stream = new DataStream(data);
	this._target = target;
	this._parseHeader();
	this._parseData();
	this._notifyComplete(target);
};

DDS.prototype._parseHeader = function()
{
	var data = this._stream.getUint32Array(30);

	this._format = null;
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
			this._format = capabilities.EXT_COMPRESSED_TEXTURE_S3TC.COMPRESSED_RGBA_S3TC_DXT1_EXT;
			break;
		case "DXT3":
			this._blockSize = 16;
			this._format = capabilities.EXT_COMPRESSED_TEXTURE_S3TC.COMPRESSED_RGBA_S3TC_DXT3_EXT;
			break;
		case "DXT5":
			this._blockSize = 16;
			this._format = capabilities.EXT_COMPRESSED_TEXTURE_S3TC.COMPRESSED_RGBA_S3TC_DXT5_EXT;
			break;
	}

	switch(fourCC) {
		case 111:
			this._blockSize = 1;
			this._format = TextureFormat.RED || TextureFormat.RGBA;
			this._dataType = DataType.HALF_FLOAT;
			break;
		case 112:
			this._blockSize = 2;
			this._format = TextureFormat.RG || TextureFormat.RGBA;
			this._dataType = DataType.HALF_FLOAT;
			break;
		case 113:
			this._blockSize = 4;
			this._format = TextureFormat.RGBA;
			this._dataType = DataType.HALF_FLOAT;
			break;
		case 114:
			this._blockSize = 1;
			this._format = TextureFormat.RED || TextureFormat.RGBA;
			this._dataType = DataType.FLOAT;
			break;
		case 112:
			this._blockSize = 2;
			this._format = TextureFormat.RG || TextureFormat.RGBA;
			this._dataType = DataType.FLOAT;
			break;
		case 116:
			this._blockSize = 4;
			this._format = TextureFormat.RGBA;
			this._dataType = DataType.FLOAT;
			break;
		default:
			console.log(fourCC);
			throw new Error("Unsupported format!");
	}
};

DDS.prototype._parseData = function()
{
	var w = this._width;
	var h = this._height;
	var generateMipmaps = this._mipLevels === 1;


	for (var i = 0; i < this._mipLevels; ++i) {
		if (this._dataType)
			this._parseUncompressedMipData(w, h, i, generateMipmaps);
		else {
			var dataLength = Math.max(1, ((w + 3) >> 2)) * Math.max(1, ((h + 3) >> 2)) * this._blockSize;
			var data = this._stream.getUint8Array(dataLength);
			this._target.uploadCompressedData(data, w, h, 0, generateMipmaps, this._format, i);
		}
		w >>= 1;
		h >>= 1;
		if (w === 0) w = 1;
		if (h === 0) h = 1;
	}
};

DDS.prototype._parseUncompressedMipData = function(width, height, level, generateMipmaps)
{
	var data;
	var dataLength = width * height * this._blockSize;

	if (this._blockSize < 4 && !capabilities.WEBGL_2)
		data = this._parseUnsupportedFormat(dataLength);
	else
		data = this._parseStraightDataBlock(dataLength);

	// half_float is replaced by float if it's not supported
	this._target.uploadData(data, width, height, generateMipmaps, this._format, this._dataType || TextureFormat.FLOAT, level);
};

DDS.prototype._parseUnsupportedFormat = function(dataLength)
{
	dataLength = dataLength / this._blockSize * 4;
	var data = new Float32Array(dataLength);

	var readFunc;

	switch (this._dataType) {
		case DataType.FLOAT:
			readFunc = this._stream.getFloat32.bind(this._stream);
			break;
		case DataType.HALF_FLOAT:
			readFunc = this._stream.getFloat16.bind(this._stream);
			break;
	}

	var j = 0;
	for (var i = 0; i < dataLength; ++i) {
		var b = i % 4;
		if (b < this._blockSize)
			data[j++] = readFunc();
		else if (b < 3)
			data[j++] = 0.0;
		else
			data[j++] = 1.0;
	}

	return data;
};

DDS.prototype._parseStraightDataBlock = function(dataLength)
{
	switch (this._dataType) {
		case DataType.FLOAT:
			return this._stream.getFloat32Array(dataLength);
		case DataType.HALF_FLOAT:
			return this._stream.getFloat16Array(dataLength);
	}
};

export {DDS};