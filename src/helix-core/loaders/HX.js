import {Importer} from "./Importer";
import {URLLoader} from "./URLLoader";
import {DataStream} from "../core/DataStream";
import {Scene} from "../scene/Scene";
import {Mesh} from "../mesh/Mesh";
import {BlendFactor, BlendOperation, CullMode, DataType, ElementType, TextureFilter, TextureWrapMode} from "../Helix";
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
import {BlendState} from "../render/BlendState";
import {Quaternion} from "../math/Quaternion";
import {Matrix4x4} from "../math/Matrix4x4";
import {Skeleton} from "../animation/skeleton/Skeleton";
import {AnimationClip} from "../animation/AnimationClip";
import {SkeletonAnimation} from "../animation/skeleton/SkeletonAnimation";
import {SkeletonXFadeNode} from "../animation/skeleton/SkeletonXFadeNode";
import {SkeletonPose} from "../animation/skeleton/SkeletonPose";
import {KeyFrame} from "../animation/KeyFrame";
import {SkeletonJointPose} from "../animation/skeleton/SkeletonJointPose";
import {AsyncTaskQueue} from "../utils/AsyncTaskQueue";
import {NormalTangentGenerator} from "../utils/NormalTangentGenerator";
import {TextureCube} from "../texture/TextureCube";
import {EquirectangularTexture} from "../utils/EquirectangularTexture";
import {Skybox} from "../scene/Skybox";
import {OrthographicCamera} from "../camera/OrthographicCamera";
import {EntityProxy} from "../entity/EntityProxy";
import {Camera} from "../camera/Camera";

/**
 * The data provided by the HX loader
 *
 * @property defaultScene The default scene (if provided)
 * @property defaultCamera The default camera (if provided)
 * @property scenes A map containing all scenes by name
 * @property meshes A map containing all meshes by name
 * @property materials A map containing all materials by name
 * @property entities A map containing all entities by name
 *
 * @constructor
 */
function HXData()
{
	this.defaultScene = null;
	this.defaultCamera = null;
	this.scenes = {};
	this.meshes = {};
	this.materials = {};
	this.entities = {};
	this.cameras = {};
}

var elementTypeLookUp = [
	ElementType.POINTS,
	ElementType.LINES,
	ElementType.LINE_STRIP,
	ElementType.LINE_LOOP,
	ElementType.TRIANGLES,
	ElementType.TRIANGLE_STRIP,
	ElementType.TRIANGLE_FAN
];

var dataTypeLookUp = {
	20: DataType.UNSIGNED_BYTE,
	21: DataType.UNSIGNED_SHORT,
	22: DataType.UNSIGNED_INT,
	30: DataType.FLOAT
};

var cullModes = [CullMode.NONE, CullMode.FRONT, CullMode.BACK, CullMode.ALL];
var blendStates = [null, BlendState.ADD, BlendState.MULTIPLY, BlendState.ALPHA];
var blendFactors = [
	BlendFactor.ZERO, BlendFactor.ONE,
	BlendFactor.SOURCE_COLOR, BlendFactor.ONE_MINUS_SOURCE_COLOR,
	BlendFactor.SOURCE_ALPHA, BlendFactor.ONE_MINUS_SOURCE_ALPHA,
	BlendFactor.DESTINATION_COLOR, BlendFactor.ONE_MINUS_DESTINATION_COLOR,
    BlendFactor.DESTINATION_ALPHA, BlendFactor.ONE_MINUS_DESTINATION_ALPHA,
    BlendFactor.SOURCE_ALPHA_SATURATE, BlendFactor.CONSTANT_ALPHA, BlendFactor.ONE_MINUS_CONSTANT_ALPHA
];
var blendOps = [
	BlendOperation.ADD, BlendOperation.SUBTRACT, BlendOperation.REVERSE_SUBTRACT
];

var ObjectTypes = {
	NULL: 0, 	// used as an end-of-list marker
	SCENE: 1,
	SCENE_NODE: 2,
	ENTITY: 3,
	MESH: 4,
	BASIC_MATERIAL: 5,
	MESH_INSTANCE: 6,
	SKELETON: 7,
	SKELETON_JOINT: 8,				// must be linked to SKELETON in order of their index!
	DIR_LIGHT: 9,
	SPOT_LIGHT: 10,
	POINT_LIGHT: 11,
	AMBIENT_LIGHT: 12,
	LIGHT_PROBE: 13,
	PERSPECTIVE_CAMERA: 14,
	ORTHOGRAPHIC_CAMERA: 15,		// not currently supported
	TEXTURE_2D: 16,
	TEXTURE_CUBE: 17,
	BLEND_STATE: 18,
	ANIMATION_CLIP: 19,
	SKELETON_ANIMATION: 20,
	SKELETON_POSE: 21,	// properties contain position, rotation, scale per joint
	KEY_FRAME: 22,
	SKYBOX: 23,
	ENTITY_PROXY: 24
};

var ObjectTypeMap = {
	2: SceneNode,
	3: Entity,
	6: MeshInstance,
	7: Skeleton,
	8: SkeletonJoint,
	9: DirectionalLight,
	10: SpotLight,
	11: PointLight,
	12: AmbientLight,
	13: LightProbe,
	14: PerspectiveCamera,
	15: OrthographicCamera,
	16: Texture2D,
	17: TextureCube,
	18: BlendState,
	19: AnimationClip,
	20: SkeletonAnimation,
	23: Skybox,
	24: EntityProxy
};

// most ommitted properties take on their default value in Helix.
var PropertyTypes = {
	// Common props						// value types (all string end with \0, bool are 0 or 1 uint8s)
	NULL: 0, 							// used as an end-of-list marker
	NAME: 1,							// string
	URL: 2,								// string, used to link to external assets (fe: textures)
	CAST_SHADOWS: 3,					// bool
	COLOR: 4,							// 3 floats: rgb
	COLOR_ALPHA: 5,						// 4 floats: rgba
	DATA_TYPE: 6,						// 1 uint8: see dataTypeLookUp
	VALUE_TYPE: 7,						// 1 uint8: 0: scalar, 1: Float3, 2: Float4, 3: Quaternion
	VALUE: 8,							// type depends on DATA_TYPE

	// header (meta) props
	VERSION: 10,						// string formatted as "#.#.#"
	GENERATOR: 11,						// string
	PAD_ARRAYS: 12,						// bool, indicates whether or not typed array data is aligned in memory to its own element size (pre-padded with 0s)
	DEFAULT_SCENE_INDEX: 13,			// uint8
	LIGHTING_MODE: 14,					// uint8: 0: OFF, 1: FIXED, 2: DYNAMIC

	// Mesh data
	NUM_VERTICES: 20,					// uint32
	NUM_INDICES: 21,					// uint32
	ELEMENT_TYPE: 22,					// uint8: index of elementTypeLookUp: if omitted, set to TRIANGLES
	INDEX_TYPE: 23,						// uint8, either 21 (uint16) or 22 (uint32) as defined by dataTypeLookUp
	INDEX_DATA: 24,						// list of length = numIndices and type defined by INDEX_TYPE. Must come after NUM_INDICES and INDEX_TYPES
	VERTEX_ATTRIBUTE: 25,				// value is tuplet <string name, uint8 numComponents, uint8 componentType [see DataTypes], uint8 streamIndex>
	VERTEX_STREAM_DATA: 26,				// raw data list, length depends on all the attributes for the current stream. Must come after NUM_VERTICES and all VERTEX_ATTRIBUTE fields and appear in order of their stream index.

	// Scene Node / Entity data
	POSITION: 30,						// 3 float32 (xyz)
	ROTATION: 31,						// 4 float32 (xyzw quaternion)
	SCALE: 32,							// 3 float32 (xyz)
	VISIBLE: 33,						// bool

	// Light data
	INTENSITY: 40,						// float32
	RADIUS: 41,							// float32
	SPOT_ANGLES: 42,					// 2 float32: inner and outer angle

	// texture data
	WRAP_MODE: 50,						// uint8: 0 = clamp, 1 = wrap
	FILTER: 51,							// uint8: 0 = nearest, 2 = bilinear, 3 = trilinear, 4, anisotropic, 5 = nearest no mip, 6 = bilinear no mip

	// material properties
	// COLOR: 4
	USE_VERTEX_COLORS: 60,				// bool
	ALPHA: 61,							// float32
	EMISSIVE_COLOR: 62,					// 3 float32 (rgb)
	SPECULAR_MAP_MODE: 63,				// uint8: 1 = roughness, 2 = roughness/normal reflectance/metallicness, 3 = share normal map, 4 = metallic/roughness
	METALLICNESS: 64,					// float32
	SPECULAR_REFLECTANCE: 65,			// float32
	ROUGHNESS: 66,						// float32
	ROUGHNESS_RANGE: 67,				// float32
	ALPHA_THRESHOLD: 68,				// float32
	LIGHTING_MODEL: 69,					// uint8: 0 = UNLIT, 1 = GGX, 2 = GGX_FULL, 3 = BLINN_PHONG. If omitted, uses InitOptions default
	CULL_MODE: 70,						// uint8: 0 = None, 1 = front, 2 = back, 3 = all
	BLEND_STATE: 71,					// uint8: 0 = None, 2 = Add, 3 = Multiply, 4 = Alpha. If omitted, blend state can still be linked from an object definition
	WRITE_DEPTH: 72,					// bool
	WRITE_COLOR: 73,					// bool

	// blend state properties
	BLEND_STATE_SRC_FACTOR: 80,			// uint8, see blendFactors index below
	BLEND_STATE_DST_FACTOR: 81,			// uint8, see blendFactors index below
	BLEND_STATE_OPERATOR: 82,			// uint8, see blendOperators index below
	BLEND_STATE_SRC_FACTOR_ALPHA: 83,  // uint8
	BLEND_STATE_DST_FACTOR_ALPHA: 84,	// uint8
	BLEND_STATE_OPERATOR_ALPHA: 85,		// uint8
	// COLOR_ALPHA: 5

	// camera properties:
	CLIP_DISTANCES: 90,					// 2 float32: near, far
	FOV: 91,							// float32: vertical fov
	HEIGHT: 92,							// float32: vertical height of orthographic projection

	// skeleton / bone properties:
	INVERSE_BIND_POSE: 100,				// 12 float32s: a matrix in column-major order ignoring the last row (affine matrix always contains 0, 0, 0, 1)

	// animation properties:
	TIME: 110,							// float32
	LOOPING: 111,						// uint8
	PLAYBACK_RATE: 112					// float32
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
    this._lightingMode = 0;
	this._objects = [];
	this._scenes = [];
	this._meshes = [];
	this._lights = null;
	this._dependencyLib = new AssetLibrary(null, this.options.crossOrigin);

	this._parseHeader();
	this._parseObjectList();

	target.defaultScene = this._scenes[this._defaultSceneIndex];

	this._calcMissingMeshData();
};

HX.prototype._calcMissingMeshData = function()
{
	var queue = new AsyncTaskQueue();
	var generator = new NormalTangentGenerator();
	for (var i = 0, len = this._meshes.length; i < len; ++i) {
		var mode = 0;
		var mesh = this._meshes[i];

		if (!mesh.hasVertexAttribute("hx_normal"))
			mode |= NormalTangentGenerator.MODE_NORMALS;

		if (!mesh.hasVertexAttribute("hx_tangent"))
			mode |= NormalTangentGenerator.MODE_TANGENTS;

		queue.queue(generator.generate.bind(generator, mesh, mode));
	}

	queue.onComplete.bind(this._loadDependencies, this);
	queue.execute();
};

HX.prototype._loadDependencies = function()
{
	this._dependencyLib.onComplete.bind(this._onDependenciesLoaded, this);
	this._dependencyLib.onProgress.bind(this._notifyProgress, this);
	this._dependencyLib.load();
}

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
				this._target.scenes[object.name] = object;
				break;
			case ObjectTypes.MESH:
				object = this._parseObject(Mesh, data);
				this._meshes.push(object);
				this._target.meshes[object.name] = object;
				break;
			case ObjectTypes.BASIC_MATERIAL:
				object = this._parseBasicMaterial(data);
				this._target.materials[object.name] = object;
				break;
			case ObjectTypes.SKELETON_POSE:
				object = this._parseSkeletonPose(data);
				break;
			case ObjectTypes.KEY_FRAME:
				object = this._parseKeyFrame(data);
				break;
			case ObjectTypes.PERSPECTIVE_CAMERA:
			case ObjectTypes.ORTHOGRAPHIC_CAMERA:
                object = this._parseObject(ObjectTypeMap[type], data);
                this._target.cameras[object.name] = object;
				break;
			case ObjectTypes.ENTITY:
            case ObjectTypes.ENTITY_PROXY:
				object = this._parseObject(ObjectTypeMap[type], data);

				while (this._target.entities[object.name])
                    object.name = object.name + "_";

				this._target.entities[object.name] = object;
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

HX.prototype._parseObject = function(type, data)
{
	var object = new type();
	this._readProperties(data, object);
	return object;
};

HX.prototype._parseKeyFrame = function(data)
{
	var frame = new KeyFrame();
	var dataType = DataType.FLOAT;
	var valueType = 0;

	var type;
	do {
		type = data.getUint32();

		// it's legal to only provide fe: position data, but fields can't be "sparsely" omitted
		// if one joint pose contains it, all joint poses should contain it
		switch (type) {
			case PropertyTypes.TIME:
				frame.time = data.getFloat32();
				break;
			case PropertyTypes.DATA_TYPE:
				dataType = dataTypeLookUp[data.getUint8()];
				break;
			case PropertyTypes.VALUE_TYPE:
				valueType = data.getUint8();
				break;
			case PropertyTypes.VALUE:
				frame.value = parseValue(dataType, valueType, data);
				break;
		}
	} while (type !== PropertyTypes.NULL);

	return frame;
};

HX.prototype._parseSkeletonPose = function(data)
{
	var pose = new SkeletonPose();
	var posIndex = 0;
	var rotIndex = 0;
	var scaleIndex = 0;

	function getJointPose(index) {
		if (!pose.getJointPose(index))
			pose.setJointPose(index, new SkeletonJointPose());

		return pose.getJointPose(index);
	}

	var type;
	do {
		type = data.getUint32();

		// it's legal to only provide fe: position data, but fields can't be "sparsely" omitted
		// if one joint pose contains it, all joint poses should contain it
		switch (type) {
			case PropertyTypes.POSITION:
				parseVector3(data, getJointPose(posIndex++).position);
				break;
			case PropertyTypes.ROTATION:
				parseQuaternion(data, getJointPose(rotIndex++).rotation);
				break;
			case PropertyTypes.SCALE:
				parseVector3(data, getJointPose(scaleIndex++).scale);
				break;
		}
	} while (type !== PropertyTypes.NULL);

	return pose;
};

HX.prototype._parseBasicMaterial = function(data)
{
	// TODO: May have to add to this in case it's a custom material
	var material = new BasicMaterial();
	material.roughness = .5;
	if (this._lightingMode) {
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
				target._indexType = dataTypeLookUp[data.getUint8()];
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
			case PropertyTypes.VISIBLE:
				target.visible = !!data.getUint8();
				break;
			case PropertyTypes.COLOR:
				target.color = parseColor(data);
				break;
			case PropertyTypes.COLOR_ALPHA:
				target.color = parseColorRGBA(data);
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
			case PropertyTypes.USE_VERTEX_COLORS:
				target.useVertexColors = !!data.getUint8();
				break;
			case PropertyTypes.ALPHA:
				target.alpha = data.getFloat32();
				break;
			case PropertyTypes.EMISSIVE_COLOR:
				target.emissiveColor = parseColor(data);
				break;
			case PropertyTypes.SPECULAR_MAP_MODE:
				target.specularMapMode = data.getUint8();
				break;
			case PropertyTypes.METALLICNESS:
				target.metallicness = data.getFloat32();
				break;
			case PropertyTypes.SPECULAR_REFLECTANCE:
				target.normalSpecularReflectance = data.getFloat32();
				break;
			case PropertyTypes.ROUGHNESS:
				target.roughness = data.getFloat32();
				break;
			case PropertyTypes.ROUGHNESS_RANGE:
				target.roughnessRange = data.getFloat32();
				break;
			case PropertyTypes.ALPHA_THRESHOLD:
				target.alphaThreshold = data.getFloat32();
				break;
			case PropertyTypes.LIGHTING_MODEL:
				target.lightingModel = parseLightingModel(data);
				break;
			case PropertyTypes.CULL_MODE:
				target.cullMode = cullModes[data.getUint8()];
				break;
			case PropertyTypes.BLEND_STATE:
				target.blendState = blendStates[data.getUint8()];
				break;
			case PropertyTypes.WRITE_DEPTH:
				target.writeDepth = !!data.getUint8();
				break;
			case PropertyTypes.WRITE_COLOR:
				target.writeColor = !!data.getUint8();
				break;
			case PropertyTypes.BLEND_STATE_SRC_FACTOR:
				target.srcFactor = blendFactors[data.getUint8()];
				break;
			case PropertyTypes.BLEND_STATE_DST_FACTOR:
				target.dstFactor = blendFactors[data.getUint8()];
				break;
			case PropertyTypes.BLEND_STATE_OPERATOR:
				target.operator = blendOps[data.getUint8()];
				break;
			case PropertyTypes.BLEND_STATE_SRC_FACTOR_ALPHA:
				target.alphaSrcFactor = blendFactors[data.getUint8()];
				break;
			case PropertyTypes.BLEND_STATE_DST_FACTOR_ALPHA:
				target.alphaDstFactor = blendFactors[data.getUint8()];
				break;
			case PropertyTypes.BLEND_STATE_OPERATOR_ALPHA:
				target.alphaOperator = blendOps[data.getUint8()];
				break;
			case PropertyTypes.CLIP_DISTANCES:
				target.nearDistance = data.getFloat32();
				target.farDistance = data.getFloat32();
				break;
			case PropertyTypes.FOV:
				target.verticalFOV = data.getFloat32();
				break;
			case PropertyTypes.HEIGHT:
				target.height = data.getFloat32();
				break;
			case PropertyTypes.INVERSE_BIND_POSE:
				parseAffineMatrix(data, target.inverseBindPose);
				break;
			case PropertyTypes.LOOPING:
				target.looping = !!data.getUint8();
				break;
			case PropertyTypes.PLAYBACK_RATE:
				target.playbackRate = data.getFloat32();
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
			break;
		default:
			// fallbacks for missing extensions
            if (target instanceof Texture2D)
            	dependencyType = JPG;
	}

	this._dependencyLib.queueAsset(name, this._correctURL(url), AssetLibrary.Type.ASSET, dependencyType, null, target);
};

function parseValue(dataType, valueType, data)
{
	var func;
	switch (dataType) {
		case DataType.UNSIGNED_BYTE:
			func = "getUint8";
			break;
		case DataType.UNSIGNED_SHORT:
			func = "getUint16";
			break;
		case DataType.UNSIGNED_INT:
			func = "getUint32";
			break;
		case DataType.FLOAT:
			func = "getFloat32";
			break;
	}

	if (valueType === 1)
		return new Float4(data[func](), data[func](), data[func]());

	if (valueType === 2)
		return new Float4(data[func](), data[func](), data[func](), data[func]());

	if (valueType === 3)
		return new Quaternion(data[func](), data[func](), data[func](), data[func]());

	return data[func]();
}

function parseLightingModel(data)
{
	var id = data.getUint8();
	if (id === 0) return LightingModel.Unlit;
	if (id === 1) return LightingModel.GGX;
	if (id === 2) return LightingModel.GGX_FULL;
	if (id === 3) return LightingModel.BlinnPhong;
}

function parseColor(data, target)
{
	target = target || new Color();
	target.set(data.getFloat32(), data.getFloat32(), data.getFloat32());
	return target;
}

function parseColorRGBA(data, target)
{
	target = parseColor(data, target);
	target.a = data.getFloat32();
	return target;
}

function parseAffineMatrix(data, target)
{
	if (target)
		target.copyFrom(Matrix4x4.IDENTITY);
	else
		target = new Matrix4x4();

	for (var c = 0; c < 4; ++c) {
		for (var r = 0; r < 3; ++r) {
			target.setElement(r, c, data.getFloat32())
		}
	}
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
	target = target || new Quaternion();
	target.set(data.getFloat32(), data.getFloat32(), data.getFloat32(), data.getFloat32());
	return target;
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
	var dataType = dataTypeLookUp[data.getUint8()];
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

HX.prototype._parseLinkList = function()
{
	var data = this._stream;
	var skeletons = {};	// keeps track of which skeletons the bones belong to
	var skeletonLinks = [];
	var skeletonAnimationLinks = [];
	var deferredCommands = [];

	while (data.bytesAvailable) {
        var parentId = data.getUint32();
        var childId = data.getUint32();
        var meta = data.getUint8();
        var parent = this._objects[parentId];
        var child = this._objects[childId];

        // these have to be handled later because their assignment requires their own links to be complete first
        if (child instanceof Skeleton) {
            skeletonLinks.push({child: child, parent: parent, meta: meta});
            continue;
        }
        else if (child instanceof SkeletonAnimation) {
            skeletonAnimationLinks.push({child: child, parent: parent, meta: meta});
            continue;
    	}

		if (parent instanceof Scene) {
            linkToScene(parent, child, meta, this._target);
        }
        else if (parent instanceof EntityProxy && meta === 1)
		{
            parent.node = child;
		}
        else if (parent instanceof Entity)
            linkToEntity(parent, child, meta, this._target);
		else if (parent instanceof SceneNode)
			linkToSceneNode(parent, child, meta, this._target);
		else if (parent instanceof MeshInstance)
		    linkToMeshInstance(parent, child);
		else if (parent instanceof Material)
			linkToMaterial(parent, child, meta);
		else if (parent instanceof LightProbe)
            linkToLightProbe(parent, child, meta);
		else if (parent instanceof Skybox)
            linkToSkyBox(parent, child, meta);
		else if (parent instanceof Skeleton) {
			linkToSkeleton(parent, child, -1);
            skeletons[childId] = parent;
        }
        else if (parent instanceof SkeletonJoint) {
			var skeleton = skeletons[parentId];
            linkToSkeleton(skeleton, child, skeleton.joints.indexOf(parent));
            skeletons[childId] = skeleton;
        }
        else if (parent instanceof SkeletonAnimation) {
            linkToSkeletonAnimation(parent, child, meta, deferredCommands);
        }
		else if (parent instanceof KeyFrame) {
			parent.value = child;
        }
		else if (parent instanceof AnimationClip) {
			parent.addKeyFrame(child);
		}
	}

	// all joints are assigned now:
	for (var i = 0, len = skeletonLinks.length; i < len; ++i) {
		var link = skeletonLinks[i];
		parent = link.parent;
		child = link.child;
		parent.skeleton = child;
	}

	for (i = 0, len = skeletonAnimationLinks.length; i < len; ++i) {
		var link = skeletonAnimationLinks[i];
		parent = link.parent;
		child = link.child;
		parent.addComponent(child);
	}

	for (i = 0, len = deferredCommands.length; i < len; ++i)
		deferredCommands[i]();
};

function linkToSceneNode(node, child, meta, hx)
{
    if (child instanceof SceneNode) {
		node.attach(child);
		if (child instanceof Camera && meta === 1)
			hx.defaultCamera = child;
    }
}

function linkToEntity(entity, child, meta, hx)
{
    if (child instanceof Component) {
        entity.addComponent(child);
        return;
    }

    linkToSceneNode(entity, child, meta, hx);
}

function linkToScene(scene, child, meta, hx)
{
    if (child instanceof Skybox) {
        scene.skybox = child;
        return;
    }

    linkToEntity(scene, child, meta, hx);
}

var MaterialLinkMetaProp = {
    0: "colorMap",
    1: "normalMap",
    2: "specularMap",
    3: "occlusionMap",
    4: "emissionMap",
    5: "maskMap"
};

function linkToMaterial(material, child, meta)
{
	if (child instanceof BlendState)
        material.blendState = child;
	else if (child instanceof Texture2D)
        material[MaterialLinkMetaProp[meta]] = child;

}

function linkToMeshInstance(meshInstance, child)
{
    if (child instanceof Material)
        meshInstance.material = child;
    else if (child instanceof Mesh)
        meshInstance.mesh = child;
}
function linkToSkyBox(probe, child)
{
    if (child instanceof Texture2D)
        child = EquirectangularTexture.toCube(child, child.height, true);

    skybox.setTexture(child);
}

function linkToLightProbe(probe, child, meta)
{
	if (child instanceof Texture2D)
        child = EquirectangularTexture.toCube(child, child.height, true);

	if (meta === 0)
		parent.diffuseTexture = child;
	else
		parent.specularTexture = child;
}

function linkToSkeleton(skeleton, child, parentIndex)
{
    child.parentIndex = parentIndex;
    skeleton.joints.push(child);
}

function linkToSkeletonAnimation(animation, child, meta, deferredCommands)
{
    if (child instanceof AnimationClip) {
        if (!animation.animationNode)
            animation.animationNode = new SkeletonXFadeNode();

        console.assert(animation.animationNode instanceof SkeletonXFadeNode, "Can't assign clip directly to skeleton when also assigning blend trees");

        animation.animationNode.addClip(child);

        if (meta === 1)
            deferredCommands.push(animation.animationNode.fadeTo.bind(animation.animationNode, child.name, 0, false));
    }
}

export {HX, HXData};