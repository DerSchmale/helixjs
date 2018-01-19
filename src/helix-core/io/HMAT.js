import {Material} from "../material/Material";
import {Comparison, CullMode, ElementType, BlendFactor, BlendOperation} from "../Helix";
import {BlendState} from "../render/BlendState";
import {Texture2D} from "../texture/Texture2D";
import {JPG} from "./JPG_PNG";
import {Importer} from "./Importer";
import {AssetLibrary} from "./AssetLibrary";
import {ArrayUtils} from "../utils/ArrayUtils";
import {BasicMaterial} from "../material/BasicMaterial";
import {Color} from "../core/Color";
import {Float2} from "../math/Float2";
import {Float4} from "../math/Float4";

/**
 * @classdesc
 * HCM is an Importer for Helix' json-based material formats. Yields a {@linkcode Material} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HMAT()
{
    Importer.call(this, Material);
    HMAT._initPropertyMap();
}

HMAT.prototype = Object.create(Importer.prototype);

HMAT.prototype.parse = function(data, target)
{
    data = JSON.parse(data);

    if (data.class) {
        this._isClass = true;
        // TODO: We already have a constructed Material
        this._applyClass(data.class, target);
    }
    else
        this._isClass = false;

    this._loadShaders(data, target);
};

HMAT.prototype._applyClass = function(className, target)
{
    var matClass;
    switch (className) {
        case "BasicMaterial":
            matClass = BasicMaterial;
            break;
        default:
            throw new Error("Unknown material class!");
    }

    // adds the required properties
    // Object assign does NOT copy getters/setters, just assigns the values returned by the getter!
    // it's a pretty dirty thing to do, but it works and makes the API much friendlier
    Object.assign(target, matClass.prototype);

    for (var key in matClass.prototype) {
        if (Object.prototype.hasOwnProperty.call(matClass.prototype, key)) {
            target[key] = matClass.prototype[key];
        }
    }

    var names = Object.getOwnPropertyNames(matClass.prototype);
    for (var i = 0; i < names.length; ++i) {
        var name = names[i];
        var desc =  Object.getOwnPropertyDescriptor(matClass.prototype, name);
        Object.defineProperty(target, name, desc);
    }
    // call the constructor
    matClass.call(target);
};

HMAT.prototype._gatherShaderFiles = function(data)
{
    var files = [];
    if (!this._isClass) {
        var geometry = data.geometry;

        var vertex = geometry.vertexShader;
        var fragment = geometry.fragmentShader;
        if (files.indexOf(vertex) < 0) files.push(this._correctURL(vertex));
        if (files.indexOf(fragment) < 0) files.push(this._correctURL(fragment));
    }
    var lighting = data.lightingModel;

    if (lighting && files.indexOf(lighting) < 0) files.push(this._correctURL(lighting));

    return files;
};

HMAT.prototype._loadShaders = function(data, material)
{
    // urls will already be correctURL'ed
    var shaderFiles = this._gatherShaderFiles(data);
    this._shaderLibrary = new AssetLibrary(null, this.options.crossOrigin);
    this._shaderLibrary.fileMap = this.fileMap;

    for (var i = 0; i < shaderFiles.length; ++i) {
        this._shaderLibrary.queueAsset(shaderFiles[i], shaderFiles[i], AssetLibrary.Type.PLAIN_TEXT);
    }

    this._shaderLibrary.onComplete.bind(function()
    {
        this._processMaterial(data, material);
        this._loadTextures(data, material);
    }, this);

    // this._shaderLibrary.onFail.bind(function(code)
    // {
    //     this._notifyFailure("Error loading shaders: " + code);
    // }, this);
    this._shaderLibrary.load();
};


HMAT.prototype._processMaterial = function(data, material)
{
    var defines = "";

    if (!this._isClass) {
        if (this.options.defines) {
            ArrayUtils.forEach(this.options.defines, (function(obj, key) {
                defines += "#define " + key + " " + obj + "\n";
            }).bind(this));
        }

        var geometryVertex = defines + this._shaderLibrary.get(this._correctURL(data.geometry.vertexShader));
        var geometryFragment = defines + this._shaderLibrary.get(this._correctURL(data.geometry.fragmentShader));

        material._geometryVertexShader = geometryVertex;
        material._geometryFragmentShader = geometryFragment;
        material.init();
    }

    if (data.lightingModel)
        material.lightingModel = this._shaderLibrary.get(this._correctURL(data.lightingModel));

    this._applyUniforms(data, material);
    if (this._isClass)
        this._applyProperties(data, material);

    if (data.hasOwnProperty("elementType"))
        material.elementType = HMAT._PROPERTY_MAP[data.elementType];

    if (data.hasOwnProperty("cullMode"))
        material.cullMode = HMAT._PROPERTY_MAP[data.cullMode];

    if (data.hasOwnProperty("writeDepth"))
        material.writeDepth = data.writeDepth;

    if (data.hasOwnProperty("blend")) {
        var blendState = new BlendState();
        var blend = data.blend;

        if (blend.hasOwnProperty("source"))
            blendState.srcFactor = HMAT._PROPERTY_MAP[blend.source];

        if (blend.hasOwnProperty("destination"))
            blendState.dstFactor = HMAT._PROPERTY_MAP[blend.destination];

        if (blend.hasOwnProperty("operator"))
            blendState.operator = HMAT._PROPERTY_MAP[blend.operator];

        material.blendState = blendState;
    }
};

HMAT.prototype._applyProperties = function(data, material)
{
    if (!data.properties) return;

    // how to know which type of properties to assign?
    for (var key in data.properties) {
        if (!data.properties.hasOwnProperty(key)) continue;

        var value = data.properties[key];
        var type = typeof material[key];
        if (type === "number" || type === "boolean")
            material[key] = value;
        else if (material[key] instanceof Color)
            material[key] = new Color(value[0], value[1], value[2], value[3]);
        else if (material[key] instanceof Float2)
            material[key] = new Color(value[0], value[1]);
        else if (material[key] instanceof Float4)
            material[key] = new Float4(value[0], value[1], value[2], value[3]);
        else
            throw new Error("Unsupport property format!");
    }
};

HMAT.prototype._applyUniforms = function(data, material)
{
    if (!data.uniforms) return;

    for (var key in data.uniforms) {
        if (!data.uniforms.hasOwnProperty(key)) continue;

        var value = data.uniforms[key];
        if (isNaN(value))
            material.setUniform(key, {
                x: value[0],
                y: value[1],
                z: value[2],
                w: value[3]
            }, false);
        else
            material.setUniform(key, value, false);
    }
};

HMAT.prototype._loadTextures = function(data, material)
{
    var files = [];

    for (var key in data.textures) {
        if (data.textures.hasOwnProperty(key)) {
            files.push(this._correctURL(data.textures[key]));
            material.setTexture(key, Texture2D.DEFAULT);
        }
    }

    this._textureLibrary = new AssetLibrary(null, this.options.crossOrigin);
    this._textureLibrary.fileMap = this.fileMap;

    for (var i = 0; i < files.length; ++i) {
        this._textureLibrary.queueAsset(files[i], files[i], AssetLibrary.Type.ASSET, JPG);
    }

    this._textureLibrary.onComplete.bind(function()
    {
        for (var key in data.textures) {
            if (data.textures.hasOwnProperty(key)) {
                // if it's a class, the textures need to be setters
                if (this._isClass)
                    material[key] = this._textureLibrary.get(this._correctURL(data.textures[key]));
                else
                    material.setTexture(key, this._textureLibrary.get(this._correctURL(data.textures[key])));
            }
        }
        this._notifyComplete(material);
    }, this);

    this._textureLibrary.load();
};


HMAT._PROPERTY_MAP = null;

HMAT._initPropertyMap = function() {
    HMAT._PROPERTY_MAP = HMAT._PROPERTY_MAP || {
        back: CullMode.BACK,
        front: CullMode.FRONT,
        both: CullMode.ALL,
        none: null,
        lines: ElementType.LINES,
        points: ElementType.POINTS,
        triangles: ElementType.TRIANGLES,
        one: BlendFactor.ONE,
        zero: BlendFactor.ZERO,
        sourceColor: BlendFactor.SOURCE_COLOR,
        oneMinusSourceColor: BlendFactor.ONE_MINUS_SOURCE_COLOR,
        sourceAlpha: BlendFactor.SOURCE_ALPHA,
        oneMinusSourceAlpha: BlendFactor.ONE_MINUS_SOURCE_ALPHA,
        destinationAlpha: BlendFactor.DST_ALPHA,
        oneMinusDestinationAlpha: BlendFactor.ONE_MINUS_DESTINATION_ALPHA,
        destinationColor: BlendFactor.DESTINATION_COLOR,
        sourceAlphaSaturate: BlendFactor.SOURCE_ALPHA_SATURATE,
        add: BlendOperation.ADD,
        subtract: BlendOperation.SUBTRACT,
        reverseSubtract: BlendOperation.REVERSE_SUBTRACT,

        // depth tests
        always: Comparison.ALWAYS,
        disabled: Comparison.DISABLED,
        equal: Comparison.EQUAL,
        greater: Comparison.GREATER,
        greaterEqual: Comparison.GREATER_EQUAL,
        less: Comparison.LESS,
        lessEqual: Comparison.LESS_EQUAL,
        never: Comparison.NEVER,
        notEqual: Comparison.NOT_EQUAL
    };
};

export { HMAT };