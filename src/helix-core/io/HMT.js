/**
 * The HMT file format is for file-based materials (JSON)
 * @constructor
 */
import {Material} from "../material/Material";
import {Comparison, CullMode, ElementType, BlendFactor, BlendOperation, DEFAULTS} from "../Helix";
import {BlendState} from "../render/BlendState";
import {Texture2D} from "../texture/Texture2D";
import {JPG} from "./JPG_PNG";
import {Importer} from "./Importer";
import {AssetLibrary} from "./AssetLibrary";

function HMT()
{
    Importer.call(this, Material);
    HMT._initPropertyMap();
};

HMT.prototype = Object.create(Importer.prototype);

HMT.prototype.parse = function(data, target)
{
    data = JSON.parse(data);
    this._loadShaders(data, target);
};

HMT.prototype._gatherShaderFiles = function(data)
{
    var files = [];
    var geometry = data.geometry;

    var vertex = geometry.vertexShader;
    var fragment = geometry.fragmentShader;
    var lighting = data.lightingModel;
    if (files.indexOf(vertex) < 0) files.push(this._correctURL(vertex));
    if (files.indexOf(fragment) < 0) files.push(this._correctURL(fragment));
    if (lighting && files.indexOf(lighting) < 0) files.push(this._correctURL(lighting));

    return files;
};

HMT.prototype._loadShaders = function(data, material)
{
    // urls will already be correctURL'ed
    var shaderFiles = this._gatherShaderFiles(data);
    this._shaderLibrary = new AssetLibrary();

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


HMT.prototype._processMaterial = function(data, material)
{
    var defines = "";
    if (this.options.defines) {
        for (var key in this.options.defines) {
            if (this.options.defines.hasOwnProperty(key)) {
                defines += "#define " + key + " " + this.options.defines[key] + "\n";
            }
        }
    }

    var geometryVertex = defines + this._shaderLibrary.get(this._correctURL(data.geometry.vertexShader));
    var geometryFragment = defines + this._shaderLibrary.get(this._correctURL(data.geometry.fragmentShader));

    material._geometryVertexShader = geometryVertex;
    material._geometryFragmentShader = geometryFragment;
    material.init();

    if (data.lightingModel)
        material.lightingModel = this._shaderLibrary.get(this._correctURL(data.lightingModel));

    this._applyUniforms(data, material);

    // default pre-defined texture
    material.setTexture("hx_dither2D", DEFAULTS.DEFAULT_2D_DITHER_TEXTURE);

    if (data.hasOwnProperty("elementType"))
        material.elementType = HMT._PROPERTY_MAP[data.elementType];

    if (data.hasOwnProperty("cullMode"))
        material.cullMode = HMT._PROPERTY_MAP[data.cullMode];

    if (data.hasOwnProperty("writeDepth"))
        material.writeDepth = data.writeDepth;

    if (data.hasOwnProperty("blend")) {
        var blendState = new BlendState();
        var blend = data.blend;

        if (blend.hasOwnProperty("source"))
            blendState.srcFactor = HMT._PROPERTY_MAP[blend.source];

        if (blend.hasOwnProperty("destination"))
            blendState.dstFactor = HMT._PROPERTY_MAP[blend.destination];

        if (blend.hasOwnProperty("operator"))
            blendState.operator = HMT._PROPERTY_MAP[blend.operator];

        material.blendState = blendState;
    }
};

HMT.prototype._applyUniforms = function(data, material)
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

HMT.prototype._loadTextures = function(data, material)
{
    var files = [];

    for (var key in data.textures) {
        if (data.textures.hasOwnProperty(key)) {
            files.push(this._correctURL(data.textures[key]));
            material.setTexture(key, Texture2D.DEFAULT);
        }
    }

    this._textureLibrary = new AssetLibrary();

    for (var i = 0; i < files.length; ++i) {
        this._textureLibrary.queueAsset(files[i], files[i], AssetLibrary.Type.ASSET, JPG);
    }

    this._textureLibrary.onComplete.bind(function()
    {
        for (var key in data.textures) {
            if (data.textures.hasOwnProperty(key)) {
                material.setTexture(key, this._textureLibrary.get(this._correctURL(data.textures[key])));
            }
        }
        this._notifyComplete(material);
    }, this);
    // bulkLoader.onFail = function(message)
    // {
    //     self._notifyFailure(message);
    // };

    this._textureLibrary.load();
};


HMT._PROPERTY_MAP = null;

HMT._initPropertyMap = function() {
    HMT._PROPERTY_MAP = HMT._PROPERTY_MAP || {
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

export { HMT };