import {Importer} from "./Importer";
import {URLLoader} from "./URLLoader";
import {DataStream} from "../core/DataStream";
import {Scene} from "../scene/Scene";
import {Mesh} from "../mesh/Mesh";
import {DataType, ElementType} from "../Helix";
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
	ORTHOGRAPHIC_CAMERA: 14		// not currently supported
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
	SPOT_ANGLES: 42
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
}

HX.prototype = Object.create(Importer.prototype);

HX.VERSION = "0.1.0";

HX.prototype.parse = function(data, target)
{
	var stream = new DataStream(data);

	var hash = stream.getString(2);
	if (hash !== "HX")
		throw new Error("Invalid file hash!");

	this._defaultSceneIndex = 0;
	this._objects = [];
	this._scenes = [];

	this._parseHeader(stream);
	this._parseObjectList(stream, target);
	this._parseLinkList(stream);

	target.scenes = this._scenes;
	target.defaultScene = this._scenes[this._defaultSceneIndex];
	this._notifyComplete(target);
};

HX.prototype._parseHeader = function(data)
{
	var type;
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

HX.prototype._parseObjectList = function(data)
{
	var type, object;

	do {
		type = data.getUint32();

		switch (type) {
			case ObjectTypes.SCENE:
				object = parseObject(Scene, data, this);
				this._scenes.push(object);
				break;
			case ObjectTypes.MATERIAL:
				object = parseMaterial(data, this);
				break;
			case ObjectTypes.NULL:
				return;
			case ObjectTypes.DIR_LIGHT:
			case ObjectTypes.POINT_LIGHT:
			case ObjectTypes.SPOT_LIGHT:
			case ObjectTypes.AMBIENT_LIGHT:
			case ObjectTypes.LIGHT_PROBE:
				object = parseObject(ObjectTypeMap[type], data, this);
				if (this._lights)
					this._lights.push(object);

				console.log(object);
				break;
			default:
				var classType = ObjectTypeMap[type];
				if (classType)
					object = parseObject(classType, data, this);
				else
					throw new Error("Unknown object type " + type + " at 0x" + (data.offset - 4).toString(16));
		}

		if (object)
			this._objects.push(object);

	} while (type !== ObjectTypes.NULL);
};

HX.prototype._parseLinkList = function(data)
{
	while (data.bytesAvailable) {
		var parentId = data.getUint32();
		var childId = data.getUint32();
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
	}
};

function parseObject(type, data, parser)
{
	var scene = new type();
	readProperties(data, scene, parser);
	return scene;
}

function parseMaterial(data, parser)
{
	// TODO: May have to add to this in case it's a custom material
	var material = new BasicMaterial();
	material.roughness = .5;
	if (parser._lightingMode) {
		material.lightingModel = LightingModel.GGX;
		// if fixed, lights !== null
		material.fixedLights = parser._lights;
	}
	readProperties(data, material, parser);
	return material;
}

function readProperties(data, target, parser)
{
	var type;
	do {
		type = data.getUint32();

		switch (type) {
			case PropertyTypes.NAME:
				target.name = data.getString();
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
				parseIndexData(data, target, parser);
				break;
			case PropertyTypes.ELEMENT_TYPE:
				target.elementType = elementTypeLookUp[data.getUint8()];
				break;
			case PropertyTypes.VERTEX_ATTRIBUTE:
				parseVertexAttribute(data, target);
				break;
			case PropertyTypes.VERTEX_STREAM_DATA:
				parseVertexStreamData(data, target, parser);
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
		}
	} while (type !== PropertyTypes.NULL)
}

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