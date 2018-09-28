// References:
// https://docs.microsoft.com/en-gb/windows/desktop/direct3ddds/dx-graphics-dds-pguide
// https://blog.tojicode.com/2011/12/compressed-textures-in-webgl.html (used as a starting point guide for parsing here)

import {Texture2D} from "../texture/Texture2D";
import {Importer} from "./Importer";
import {DataStream} from "../core/DataStream";
import {capabilities, DataType, TextureFormat} from "../Helix";
import {TextureCube} from "../texture/TextureCube";

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
 * DDS is an importer for dxt compressed textures in Microsoft's DDS format. Yields a {@linkcode Texture2D} or {@linkcode
 * TextureCube} object.
 * Currently supported formats are:
 * - DXT1 (only if capabilities.EXT_COMPRESSED_TEXTURE_S3TC exists)
 * - DXT3 (only if capabilities.EXT_COMPRESSED_TEXTURE_S3TC exists)
 * - DXT5 (only if capabilities.EXT_COMPRESSED_TEXTURE_S3TC exists)
 * - Float16 RGBA, RG, RED
 * - Float32 RGBA, RG, RED
 *
 * For any uncompressed "unsigned byte" type formats, you should stick to JPG/PNG.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DDS()
{
	Importer.call(this, Importer.TYPE_BINARY);
}

DDS.prototype = Object.create(Importer.prototype);

DDS.prototype.parse = function(data, target)
{
	this._type = null;
	this._stream = new DataStream(data);
	this._parseHeader();

	var type = this._type || Texture2D;
	this._target = target || new type();

	this._parseData();
	this._notifyComplete(this._target);
};

DDS.prototype._parseHeader = function()
{
	var data = this._stream.getUint32Array(32);

	this._format = null;
	this._dataType = null;

	// magic + struct of DWORDs shown here: https://docs.microsoft.com/en-gb/windows/desktop/direct3ddds/dds-header
	if (data[0] !== DDS_CONSTANTS.MAGIC)
		throw new Error("Not a DDS file!");

	if (data[28] & 0x200) {
		if (!(data[28] & (0x400 | 0x800 | 0x1000 | 0x2000 | 0x4000 | 0x8000)))
			throw new Error("All faces must be defined!");

		this._type = TextureCube;
	}

	// TODO: Support other formats in WebGL 2?
	if (!(data[20] & DDS_PIXEL_FORMAT_FLAGS.DDPF_FOURCC))
		throw new Error("Unsupported format. Texture must contain RGB data");

	// width and height are swapped!
	this._height = data[3];
	this._width = data[4];
	this._parseInternalFormat(data[21]);
	this._parseMipLevels(data);
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
			return;
		case "DXT3":
			this._blockSize = 16;
			this._format = capabilities.EXT_COMPRESSED_TEXTURE_S3TC.COMPRESSED_RGBA_S3TC_DXT3_EXT;
			return;
		case "DXT5":
			this._blockSize = 16;
			this._format = capabilities.EXT_COMPRESSED_TEXTURE_S3TC.COMPRESSED_RGBA_S3TC_DXT5_EXT;
			return;
		case "DX10":
			this._blockSize = 16;
			this._parseDX10Header();
			return;
	}

	switch(fourCC) {
		case 111:
			this._blockSize = 1;
			this._format = TextureFormat.RED || TextureFormat.RGBA;
			this._dataType = DataType.HALF_FLOAT || "Float16";
			return;
		case 112:
			this._blockSize = 2;
			this._format = TextureFormat.RG || TextureFormat.RGBA;
			this._dataType = DataType.HALF_FLOAT || "Float16";
			return;
		case 113:
			this._blockSize = 4;
			this._format = TextureFormat.RGBA;
			this._dataType = DataType.HALF_FLOAT || "Float16";
			return;
		case 114:
			this._blockSize = 1;
			this._format = TextureFormat.RED || TextureFormat.RGBA;
			this._dataType = DataType.FLOAT;
			return;
		case 112:
			this._blockSize = 2;
			this._format = TextureFormat.RG || TextureFormat.RGBA;
			this._dataType = DataType.FLOAT;
			return;
		case 116:
			this._blockSize = 4;
			this._format = TextureFormat.RGBA;
			this._dataType = DataType.FLOAT;
			return;
		default:
			throw new Error("Unsupported format!");
	}
};

DDS.prototype._parseData = function()
{
	var numFaces = this._type === TextureCube? 6 : 1;
	var mipLevels = [];

	for (var f = 0; f < numFaces; ++f) {
		var w = this._width;
		var h = this._height;
		var data = null;

		for (var i = 0; i < this._mipLevels; ++i) {
			if (!mipLevels[i])
				mipLevels[i] = [];

			if (this._dataType)
				data = this._parseUncompressedMipData(w, h);
			else {
				var dataLength = Math.max(1, ((w + 3) >> 2)) * Math.max(1, ((h + 3) >> 2)) * this._blockSize;
				data = this._stream.getUint8Array(dataLength);
			}

			mipLevels[i][f] = data;

			w >>= 1;
			h >>= 1;
			if (w === 0) w = 1;
			if (h === 0) h = 1;
		}
	}

	this._uploadData(mipLevels);
};

DDS.prototype._uploadData = function(mipLevels)
{
	var generateMipmaps = this._mipLevels === 1;
	var w = this._width;
	var h = this._height;

	// "Float16" is used to indicate unsupported half float support
	var dataType = this._dataType === "Float16"? DataType.FLOAT : this._dataType;

	for (var i = 0; i < this._mipLevels; ++i) {
		var data = mipLevels[i];

		if (this._type === TextureCube) {
			swapCubeFaces(mipLevels[i]);
			if (dataType)
				this._target.uploadData(data, w, generateMipmaps, this._format, dataType, i);
			else
				this._target.uploadCompressedData(data, w, generateMipmaps, this._format, i);
		}
		else {
			if (dataType)
				this._target.uploadData(data[0], w, h, generateMipmaps, this._format, dataType, i);
			else
				this._target.uploadCompressedData(data[0], w, h, generateMipmaps, this._format, i);
		}

		w >>= 1;
		h >>= 1;
		if (w === 0) w = 1;
		if (h === 0) h = 1;
	}
};

DDS.prototype._parseUncompressedMipData = function(width, height)
{
	var dataLength = width * height * this._blockSize;

	if (this._blockSize < 4 && !capabilities.WEBGL_2)
		return this._parseUnsupportedFormat(dataLength);
	else
		return this._parseStraightDataBlock(dataLength);
};

DDS.prototype._parseUnsupportedFormat = function(dataLength)
{
	dataLength = dataLength / this._blockSize * 4;
	var data;
	var readFunc;

	switch (this._dataType) {
		case DataType.FLOAT:
			data = new Float32Array(dataLength);
			readFunc = this._stream.getFloat32.bind(this._stream);
			break;
		case DataType.HALF_FLOAT:
			data = new Uint16Array(dataLength);
			readFunc = this._stream.getUint16.bind(this._stream);
			break;
		case "Float16":
			data = new Float32Array(dataLength);
			readFunc = this._stream.getFloat16.bind(this._stream);
			break;
		default:
			throw new Error("Impossible");
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
			return this._stream.getUint16Array(dataLength);
		case "Float16":
			return this._stream.getFloat16Array(dataLength);
	}
};

DDS.prototype._parseDX10Header = function()
{
	var data = this._stream.getUint32Array(5);

	if (data[2] & 0x4)
		this._type = TextureCube;

	if (data[3] !== 1)
		throw new Error("Texture arrays are not supported!");

	switch (data[0]) {
		case 6: // DXGI_FORMAT_R32G32B32_FLOAT
			this._blockSize = 4;
			this._format = TextureFormat.RGBA;
			this._dataType = DataType.FLOAT;
			break;
		case 10: // DXGI_FORMAT_R16G16B16A16_FLOAT
			this._blockSize = 4;
			this._format = TextureFormat.RGBA;
			this._dataType = DataType.HALF_FLOAT || "Float16";
			break;
		default:
			throw new Error("Unsupported DX10 format!");
	}
};

function swapCubeFaces(faces)
{
	function swap(i1, i2)
	{
		var tmp = faces[i1];
		faces[i1] = faces[i2];
		faces[i2] = tmp;
	}
	// faces[0] and faces[1] need to be rotated
	swap(2, 4);
	swap(3, 5);
}

export {DDS};