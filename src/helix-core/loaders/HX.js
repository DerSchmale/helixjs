import {Importer} from "./Importer";
import {URLLoader} from "./URLLoader";
import {DataStream} from "../core/DataStream";
import {Scene} from "../scene/Scene";
import {Mesh} from "../mesh/Mesh";
import {DataType, ElementType, TextureFilter, TextureWrapMode} from "../Helix";
import {BasicMaterial} from "../material/BasicMaterial";
import {Material} from "../material/Material";
import {Entity} from "../entity/Entity";
import {Component} from "../entity/Component";
import {MeshInstance} from "../mesh/MeshInstance";
import {DirectionalLight} from "../light/DirectionalLight";
import {PointLight} from "../light/PointLight";
import {SpotLight} from "../light/SpotLight";
import {SceneNode} from "../scene/SceneNode";
import {SkeletonJoint} from "../animation/skeleton/SkeletonJoint";
import {PerspectiveCamera} from "../camera/PerspectiveCamera";
import {Color} from "../core/Color";
import {Float4} from "../math/Float4";
import {LightingModel} from "../render/LightingModel";
import {AmbientLight} from "../light/AmbientLight";
import {LightProbe} from "../light/LightProbe";
import {Texture2D} from "../texture/Texture2D";
import {AssetLibrary} from "./AssetLibrary";
import {JPG} from "./JPG_PNG";

/**
 * The data provided by the HX loader
 * @constructor
 */
function HXData()
{
	this.defaultScene = null;
	this.scenes = [];
}

var elementTypeLookUp = {
	1: ElementType.POINTS,
	2: ElementType.LINES,
	3: ElementType.LINE_STRIP,
	4: ElementType.LINE_LOOP,
	5: ElementType.TRIANGLES,
	6: ElementType.TRIANGLE_STRIP,
	7: ElementType.TRIANGLE_FAN
};

var dataTypeLook = {
	20: DataType.UNSIGNED_BYTE,
	21: DataType.UNSIGNED_SHORT,
	22: DataType.UNSIGNED_INT,
	30: DataType.FLOAT
};

var ObjectTypes = {
	NULL: 0, 	// used as an end-of-list marker
	SCENE: 1,
	SCENE_NODE: 2,
	ENTITY: 3,
	MESH: 4,
	MATERIAL: 5,
	MESH_INSTANCE: 6,
	SKELETON_JOINT: 7,
	DIR_LIGHT: 8,
	SPOT_LIGHT: 9,
	POINT_LIGHT: 10,
	AMBIENT_LIGHT: 11,
	LIGHT_PROBE: 12,
	PERSPECTIVE_CAMERA: 13,
	ORTHOGRAPHIC_CAMERA: 14,		// not currently supported
	TEXTURE_2D: 15,
	TEXTURE_CUBE: 16
};

var ObjectTypeMap = {
	2: SceneNode,
	3: Entity,
	4: Mesh,
	6: MeshInstance,
	7: SkeletonJoint,
	8: DirectionalLight,
	9: SpotLight,
	10: PointLight,
	11: AmbientLight,
	12: LightProbe,
	13: PerspectiveCamera
};

var PropertyTypes = {
	// Common props
	NULL: 0, // used as an end-of-list marker
	NAME: 1,
	URL: 2,
	CAST_SHADOWS: 3,
	COLOR: 4,

	// header (meta) props
	VERSION: 10,
	GENERATOR: 11,
	PAD_ARRAYS: 12,
	DEFAULT_SCENE_INDEX: 13,
	LIGHTING_MODE: 14,

	// Mesh data
	NUM_VERTICES: 20,
	NUM_INDICES: 21,
	ELEMENT_TYPE: 22,
	INDEX_TYPE: 23,
	INDEX_DATA: 24,
	VERTEX_ATTRIBUTE: 25,
	VERTEX_STREAM_DATA: 26,

	// Scene Node / Entity data
	POSITION: 30,
	ROTATION: 31,
	SCALE: 32,

	// Light data
	INTENSITY: 40,
	RADIUS: 41,
	SPOT_ANGLES: 42,

	// texture data
	WRAP_MODE: 50,
	FILTER: 51
};

var MaterialLinkMetaProp = {
	0: "colorMap",
	1: "normalMap",
	2: "specularMap",
	3: "occlusionMap",
	4: "emissionMap",
	5: "maskMap"
};

/**
 * @classdesc
 * HX is an Importer for Helix' (binary) format. Yields a {@linkcode HXData} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HX()
{
	Importer.call(this, HXData, URLLoader.DATA_BINARY);
	this._objects = null;
	this._scenes = null;
	this._padArrays = true;
	this._defaultSceneIndex = 0;
	this._version = null;
	this._generator = null;
	this._lights = null;
	this._dependencyLib = null;
}

HX.prototype = Object.create(Importer.prototype);

HX.VERSION = "0.1.0";

HX.prototype.parse = function(data, target)
{
	this._target = target;
	this._stream = new DataStream(data);

	var hash = this._stream.getString(2);
	if (hash !== "HX")
		throw new Error("Invalid file hash!");

	this._defaultSceneIndex = 0;
	this._objects = [];
	this._scenes = [];
	this._lights = null;
	this._dependencyLib = new AssetLibrary(null, this.options.crossOrigin);

	this._parseHeader();

	// TODO: Should we make this asynchronous somehow?
	this._parseObjectList();

	target.scenes = this._scenes;
	target.defaultScene = this._scenes[this._defaultSceneIndex];

	this._dependencyLib.onComplete.bind(this._onDependenciesLoaded, this);
	this._dependencyLib.onProgress.bind(this._notifyProgress, this);
	this._dependencyLib.load();
};

HX.prototype._onDependenciesLoaded = function()
{
	this._parseLinkList();
	this._notifyComplete(this._target);
};

HX.prototype._parseHeader = function()
{
	var type;
	var data = this._stream;
	do {
		type = data.getUint32();

		switch (type) {
			case PropertyTypes.PAD_ARRAYS:
				this._padArrays = !!data.getUint8();
				break;
			case PropertyTypes.DEFAULT_SCENE_INDEX:
				this._defaultSceneIndex = data.getUint8();
				break;
			case PropertyTypes.LIGHTING_MODE:
				this._lightingMode = data.getUint8();
				if (this._lightingMode === 1)
					this._lights = [];
				break;
			case PropertyTypes.VERSION:
				this._version = data.getString();
				break;
			case PropertyTypes.GENERATOR:
				this._generator = data.getString();
				break;
		}
	} while (type !== PropertyTypes.NULL);

	if (this._version !== HX.VERSION)
		throw new Error("Incompatible file version!");
};

HX.prototype._parseObjectList = function()
{
	var type, object;
	var data = this._stream;

	do {
		type = data.getUint32();

		switch (type) {
			case ObjectTypes.SCENE:
				object = this._parseObject(Scene, data);
				this._scenes.push(object);
				break;
			case ObjectTypes.MATERIAL:
				object = this._parseMaterial(data);
				break;
			case ObjectTypes.TEXTURE_2D:
				object = this._parseTexture2D(data);
				break;
			case ObjectTypes.NULL:
				return;
			case ObjectTypes.DIR_LIGHT:
			case ObjectTypes.POINT_LIGHT:
			case ObjectTypes.SPOT_LIGHT:
			case ObjectTypes.AMBIENT_LIGHT:
			case ObjectTypes.LIGHT_PROBE:
				object = this._parseObject(ObjectTypeMap[type], data);
				if (this._lights && object)
					this._lights.push(object);
				break;
			default:
				var classType = ObjectTypeMap[type];
				if (classType)
					object = this._parseObject(classType, data);
				else
					throw new Error("Unknown object type " + type + " at 0x" + (data.offset - 4).toString(16));
		}


		if (object)
			this._objects.push(object);

	} while (type !== ObjectTypes.NULL);
};

HX.prototype._parseLinkList = function()
{
	var data = this._stream;
	while (data.bytesAvailable) {
		var parentId = data.getUint32();
		var childId = data.getUint32();
		var meta = data.getUint8();
		var parent = this._objects[parentId];
		var child = this._objects[childId];

		if (child instanceof Material)
			parent.material = child;
		else if (child instanceof Mesh)
			parent.mesh = child;
		else if (child instanceof Entity)
			parent.attach(child);
		else if (child instanceof Component)
			parent.addComponent(child);
		else if (child instanceof Texture2D) {
			if (parent instanceof BasicMaterial) {
				parent[MaterialLinkMetaProp[meta]] = child;
			}
			else
				console.warn("Only BasicMaterial is currently supported. How did you even get in here?");
		}
	}
};

HX.prototype._parseObject = function(type, data)
{
	var scene = new type();
	this._readProperties(data, scene);
	return scene;
};

HX.prototype._parseTexture2D = function(data)
{
	var texture = new Texture2D();
	this._readProperties(data, texture);
	return texture;
}

HX.prototype._parseMaterial = function(data)
{
	// TODO: May have to add to this in case it's a custom material
	var material = new BasicMaterial();
	material.roughness = .5;
	if (this._lightingMode) {
		material.lightingModel = LightingModel.GGX;
		// if fixed, lights !== null
		material.fixedLights = this._lights;
	}
	this._readProperties(data, material);
	return material;
};

HX.prototype._readProperties = function(data, target)
{
	var type;
	do {
		type = data.getUint32();

		switch (type) {
			case PropertyTypes.NAME:
				target.name = data.getString();
				break;
			case PropertyTypes.URL:
				this._handleURL(data.getString(), target);
				break;
			case PropertyTypes.CAST_SHADOWS:
				target.castShadows = !!data.getUint8();
				break;
			case PropertyTypes.NUM_VERTICES:
				target._numVertices = data.getUint32();
				break;
			case PropertyTypes.NUM_INDICES:
				target._numIndices = data.getUint32();
				break;
			case PropertyTypes.INDEX_TYPE:
				target._indexType = dataTypeLook[data.getUint8()];
				break;
			case PropertyTypes.INDEX_DATA:
				parseIndexData(data, target, this);
				break;
			case PropertyTypes.ELEMENT_TYPE:
				target.elementType = elementTypeLookUp[data.getUint8()];
				break;
			case PropertyTypes.VERTEX_ATTRIBUTE:
				parseVertexAttribute(data, target);
				break;
			case PropertyTypes.VERTEX_STREAM_DATA:
				parseVertexStreamData(data, target, this);
				break;
			case PropertyTypes.POSITION:
				parseVector3(data, target.position);
				break;
			case PropertyTypes.ROTATION:
				parseQuaternion(data, target.rotation);
				break;
			case PropertyTypes.SCALE:
				parseVector3(data, target.scale);
				break;
			case PropertyTypes.COLOR:
				target.color = parseColor(data);
				break;
			case PropertyTypes.INTENSITY:
				target.intensity = data.getFloat32();
				break;
			case PropertyTypes.RADIUS:
				target.radius = data.getFloat32();
				break;
			case PropertyTypes.SPOT_ANGLES:
				target.innerAngle = data.getFloat32();
				target.outerAngle = data.getFloat32();
				break;
			case PropertyTypes.WRAP_MODE:
				target.wrapMode = data.getUint8()? TextureWrapMode.REPEAT : TextureWrapMode.CLAMP;
				break;
			case PropertyTypes.FILTER:
				target.filter = [
					TextureFilter.NEAREST, TextureFilter.BILINEAR, TextureFilter.TRILINEAR,
					TextureFilter.TRILINEAR_ANISOTROPIC || TextureFilter.TRILINEAR,
					TextureFilter.NEAREST_NOMIP, TextureFilter.BILINEAR_NOMIP
				][data.getUint8()];
				break;
		}
	} while (type !== PropertyTypes.NULL)
};

HX.prototype._handleURL = function(url, target)
{
	var ext = url.toLowerCase().substr(url.lastIndexOf(".") + 1);
	var dependencyType;

	switch (ext) {
		case "jpg":
		case "jpeg":
		case "png":
			dependencyType = JPG;
	}

	this._dependencyLib.queueAsset(name, this._correctURL(url), AssetLibrary.Type.ASSET, dependencyType, null, target);
};

function parseColor(data, target)
{
	target = target || new Color();
	target.set(data.getFloat32(), data.getFloat32(), data.getFloat32());
	return target;
}

function parseVector3(data, target)
{
	target = target || new Float4();
	target.set(data.getFloat32(), data.getFloat32(), data.getFloat32());
	return target;
}

function parseQuaternion(data, target)
{
	target.set(data.getFloat32(), data.getFloat32(), data.getFloat32(), 0.0);
	target.w = Math.sqrt(1.0 - target.x * target.x + target.y * target.y + target.z * target.z);
}

function parseIndexData(data, target, parser)
{
	var indexData;
	if (target._indexType === DataType.UNSIGNED_SHORT) {
		if (parser._padArrays) data.skipAlign(2);
		indexData = data.getUint16Array(target._numIndices);
	}
	else {
		if (parser._padArrays) data.skipAlign(4);
		indexData = data.getUint32Array(target._numIndices);
	}

	target.setIndexData(indexData);
}

function parseVertexAttribute(data, target)
{
	var name = data.getString();
	var numComponents = data.getUint8();
	var dataType = dataTypeLook[data.getUint8()];
	var streamIndex = data.getUint8();
	console.assert(dataType === DataType.FLOAT, "HX only supports float32 vertex attribute data");
	target.addVertexAttribute(name, numComponents, streamIndex, name === "hx_normal" || name === "hx_tangent");
}

function parseVertexStreamData(data, target, parser)
{
	var dataLen = target._numVertices * target.getVertexStride(0);
	if (parser._padArrays)
		data.skipAlign(4);

	var streamData = data.getFloat32Array(dataLen);

	// get the first stream that doesn't have data yet
	var streamIndex = 0;
	while (target._vertexData[streamIndex])
		++streamIndex;

	target.setVertexData(streamData, streamIndex);
}

export {HX, HXData};