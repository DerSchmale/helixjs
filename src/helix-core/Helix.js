import {ArrayUtils} from './utils/ArrayUtils';
import {DirectionalLight} from './light/DirectionalLight';
import {FrameTicker} from './utils/FrameTicker';
import {_clearGLStats, GL} from './core/GL';
import {HardDirectionalShadowFilter} from './light/HardDirectionalShadowFilter';
import {LightingModel} from './render/LightingModel';
import {Signal} from './core/Signal';
import {GLSLIncludes} from "./shader/GLSLIncludes";
import {CopyChannelsShader} from "./render/UtilShaders";
import {RectMesh} from "./mesh/RectMesh";
import {Texture2D} from "./texture/Texture2D";
import {TextureCube} from "./texture/TextureCube";
import {BlendState} from "./render/BlendState";
import {PoissonDisk} from "./math/PoissonDisk";
import {MaterialPass} from "./material/MaterialPass";
import {PoissonSphere} from "./math/PoissonSphere";
import {Color} from "./core/Color";

export var META =
    {
        VERSION: "0.1",
        INITIALIZED: false,
        OPTIONS: null,
        TARGET_CANVAS: null
    };

export var onPreFrame = new Signal();
export var onFrame = new Signal();
export var frameTicker = new FrameTicker();

export var DEFAULTS =
    {
        COPY_SHADER: null,
        DEFAULT_2D_DITHER_TEXTURE: null,
        DEFAULT_SKINNING_TEXTURE: null
    };

export var capabilities =
    {
        // extensions:
        EXT_DRAW_BUFFERS: null,
        EXT_FLOAT_TEXTURES: null,
        EXT_HALF_FLOAT_TEXTURES: null,
        EXT_FLOAT_TEXTURES_LINEAR: null,
        EXT_HALF_FLOAT_TEXTURES_LINEAR: null,
        EXT_DEPTH_TEXTURE: null,
        EXT_STANDARD_DERIVATIVES: null,
        EXT_SHADER_TEXTURE_LOD: null,
        EXT_TEXTURE_FILTER_ANISOTROPIC: null,

        DEFAULT_TEXTURE_MAX_ANISOTROPY: 0,
        NUM_MORPH_TARGETS: 0
    };

// internal options
export var _HX_ = {
    GAMMA_CORRECT_LIGHTS: false,
    HDR_FORMAT: 0
};

// TODO: hardcode values?
export var TextureFilter = {};
export var TextureWrapMode = {};
export var CullMode = {};
export var StencilOp = {};
export var Comparison = {};
export var ElementType = {};
export var BlendFactor = {};
export var BlendOperation = {};
export var ClearMask = {};
export var TextureFormat = {};
export var DataType = {};
export var BufferUsage = {};

/**
 * Provides a set of options to configure Helix
 * @constructor
 */
export function InitOptions()
{
    this.maxBones = 64;

    this.useSkinningTexture = true;

    // rendering pipeline options
    this.hdr = false;   // only if available
    this.useGammaCorrection = true;
    this.usePreciseGammaCorrection = false;  // Uses pow 2.2 instead of 2 for gamma correction, only valid if useGammaCorrection is true
    this.defaultLightingModel = LightingModel.Unlit;

    this.maxPointLightsPerPass = 3;
    this.maxDirLightsPerPass = 1;

    // debug-related
    // this.debug = false;   // requires webgl-debug.js:
    this.ignoreAllExtensions = false;           // ignores all non-default extensions
    this.ignoreDrawBuffersExtension = false;     // forces multiple passes for the GBuffer
    this.ignoreDepthTexturesExtension = false;     // forces storing depth info explicitly
    this.ignoreTextureLODExtension = false;     // forces storing depth info explicitly
    this.ignoreHalfFloatTextureExtension = false;     // forces storing depth info explicitly
    this.throwOnShaderError = false;

    // will be assigned to HX.DirectionalLight.SHADOW_FILTER
    this.directionalShadowFilter = new HardDirectionalShadowFilter();
};

/**
 * Initializes Helix and creates a WebGL context from a given canvas
 * @param canvas The canvas to create the gl context from.
 */
export function init(canvas, options)
{
    if (META.INITIALIZED) throw new Error("Can only initialize Helix once!");


    META.TARGET_CANVAS = canvas;

    var webglFlags = {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false
    };

    var gl = canvas.getContext('webgl', webglFlags) || canvas.getContext('experimental-webgl', webglFlags);
    if (!gl) throw new Error("WebGL not supported");
    GL._setGL(gl);

    META.OPTIONS = options || new InitOptions();

    META.INITIALIZED = true;

    var glExtensions = gl.getSupportedExtensions();

    function _getExtension(name)
    {
        return glExtensions.indexOf(name) >= 0 ? gl.getExtension(name) : null;
    }

    // shortcuts
    _initGLProperties();

    _initLights();

    var options = META.OPTIONS;
    var defines = "";
    if (options.useGammaCorrection !== false)
        defines += META.OPTIONS.usePreciseGammaCorrection ? "#define HX_GAMMA_CORRECTION_PRECISE\n" : "#define HX_GAMMA_CORRECTION_FAST\n";

    defines += "#define HX_MAX_BONES " + META.OPTIONS.maxBones + "\n";

    options.ignoreDrawBuffersExtension = options.ignoreDrawBuffersExtension || options.ignoreAllExtensions;
    options.ignoreDepthTexturesExtension = options.ignoreDepthTexturesExtension || options.ignoreAllExtensions;
    options.ignoreTextureLODExtension = options.ignoreTextureLODExtension || options.ignoreAllExtensions;
    options.ignoreHalfFloatTextureExtension = options.ignoreHalfFloatTextureExtension || options.ignoreAllExtensions;

    if (!options.ignoreDrawBuffersExtension)
        capabilities.EXT_DRAW_BUFFERS = _getExtension('WEBGL_draw_buffers');

    if (capabilities.EXT_DRAW_BUFFERS && capabilities.EXT_DRAW_BUFFERS.MAX_DRAW_BUFFERS_WEBGL >= 3)
        defines += "#extension GL_EXT_draw_buffers : require\n";

    capabilities.EXT_FLOAT_TEXTURES = _getExtension('OES_texture_float');
    if (!capabilities.EXT_FLOAT_TEXTURES) {
        console.warn('OES_texture_float extension not supported!');
        options.useSkinningTexture = false;
    }

    if (!options.ignoreHalfFloatTextureExtension)
        capabilities.EXT_HALF_FLOAT_TEXTURES = _getExtension('OES_texture_half_float');

    if (!capabilities.EXT_HALF_FLOAT_TEXTURES) console.warn('OES_texture_half_float extension not supported!');

    capabilities.EXT_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_float_linear');
    if (!capabilities.EXT_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_float_linear extension not supported!');

    capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_half_float_linear');
    if (!capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_half_float_linear extension not supported!');

    // these SHOULD be implemented, but are not by Chrome
    //EXT_COLOR_BUFFER_FLOAT = _getExtension('WEBGL_color_buffer_float');
    //if (!EXT_COLOR_BUFFER_FLOAT) console.warn('WEBGL_color_buffer_float extension not supported!');

    //EXT_COLOR_BUFFER_HALF_FLOAT = _getExtension('EXT_color_buffer_half_float');
    //if (!EXT_COLOR_BUFFER_HALF_FLOAT) console.warn('EXT_color_buffer_half_float extension not supported!');

    if (!options.ignoreDepthTexturesExtension)
        capabilities.EXT_DEPTH_TEXTURE = _getExtension('WEBGL_depth_texture');

    if (!capabilities.EXT_DEPTH_TEXTURE) {
        console.warn('WEBGL_depth_texture extension not supported!');
        defines += "#define HX_NO_DEPTH_TEXTURES\n";
    }

    capabilities.EXT_STANDARD_DERIVATIVES = _getExtension('OES_standard_derivatives');
    if (!capabilities.EXT_STANDARD_DERIVATIVES) console.warn('OES_standard_derivatives extension not supported!');

    if (!options.ignoreTextureLODExtension)
        capabilities.EXT_SHADER_TEXTURE_LOD = _getExtension('EXT_shader_texture_lod');

    if (!capabilities.EXT_SHADER_TEXTURE_LOD)
        console.warn('EXT_shader_texture_lod extension not supported!');

    capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC = _getExtension('EXT_texture_filter_anisotropic');
    if (!capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC) console.warn('EXT_texture_filter_anisotropic extension not supported!');

    //EXT_SRGB = _getExtension('EXT_sRGB');
    //if (!EXT_SRGB) console.warn('EXT_sRGB extension not supported!');

    capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY = capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC ? gl.getParameter(capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;

    if (!capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR || !capabilities.EXT_HALF_FLOAT_TEXTURES)
        options.hdr = false;

    capabilities.HDR_FORMAT = options.hdr ? capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;

    // this causes lighting accumulation to happen in gamma space (only accumulation of lights within the same pass is linear)
    // This yields an incorrect gamma correction to be applied, but looks much better due to encoding limitation (otherwise there would be banding)
    if (options.useGammaCorrection && !options.hdr) {
        _HX_.GAMMA_CORRECT_LIGHTS = true;
        defines += "#define HX_GAMMA_CORRECT_LIGHTS\n";
    }

    if (options.useSkinningTexture) {
        defines += "#define HX_USE_SKINNING_TEXTURE\n";

        _initDefaultSkinningTexture();
    }

    // this cannot be defined by the user
    capabilities.NUM_MORPH_TARGETS = 8;

    GLSLIncludes.GENERAL = defines + GLSLIncludes.GENERAL;

    // default copy shader
    DEFAULTS.COPY_SHADER = new CopyChannelsShader();

    _initMaterialPasses();

    Texture2D._initDefault();
    TextureCube._initDefault();
    BlendState._initDefaults();
    RectMesh._initDefault();
    PoissonDisk._initDefault();
    PoissonSphere._initDefault();

    _init2DDitherTexture(32, 32);

    GL.setClearColor(Color.BLACK);

    start();

    onPreFrame.bind(function ()
    {
        _clearGLStats();
    })
}

export function start()
{
    frameTicker.start(function (dt)
    {
        onPreFrame.dispatch(dt);
        onFrame.dispatch(dt);
    });
};

export function stop()
{
    frameTicker.stop();
}

function _initMaterialPasses()
{
    var options = META.OPTIONS;
    MaterialPass.BASE_PASS = 0;
    MaterialPass.NORMAL_DEPTH_PASS = 1;
    MaterialPass.DIR_LIGHT_PASS = 2;
    // assume only one dir light with shadow per pass, since it's normally only the sun
    MaterialPass.DIR_LIGHT_SHADOW_PASS = MaterialPass.DIR_LIGHT_PASS + options.maxDirLightsPerPass;
    MaterialPass.POINT_LIGHT_PASS = MaterialPass.DIR_LIGHT_SHADOW_PASS + 1;
    MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS = MaterialPass.POINT_LIGHT_PASS + options.maxPointLightsPerPass;
    MaterialPass.NUM_PASS_TYPES = MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS + 1;
}

function _initLights()
{
    DirectionalLight.SHADOW_FILTER = META.OPTIONS.directionalShadowFilter;
}

function _initDefaultSkinningTexture()
{
    var gl = GL.gl;
    DEFAULTS.DEFAULT_SKINNING_TEXTURE = new Texture2D();

    var data = [];
    for (var i = 0; i < META.OPTIONS.maxBones; ++i)
        data.push(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0);

    // TODO: Provide a proper texture format enum
    DEFAULTS.DEFAULT_SKINNING_TEXTURE.uploadData(new Float32Array(data), META.OPTIONS.maxBones, 3, false, gl.RGBA, gl.FLOAT);
    DEFAULTS.DEFAULT_SKINNING_TEXTURE.filter = TextureFilter.NEAREST_NOMIP;
    DEFAULTS.DEFAULT_SKINNING_TEXTURE.wrapMode = TextureWrapMode.CLAMP;
}

function _init2DDitherTexture(width, height)
{
    var gl = GL.gl;
    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE = new Texture2D();
    var len = width * height;
    var minValue = 1.0 / len;
    var data = [];
    var k = 0;
    var values = [];
    var i;

    for (i = 0; i < len; ++i) {
        values.push(i / len);
    }

    ArrayUtils.shuffle(values);

    for (i = 0; i < len; ++i) {
        var angle = values[i] * Math.PI * 2.0;
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        // store rotation matrix
        // RGBA:
        data[k++] = cos;
        data[k++] = sin;
        data[k++] = minValue + values[i];
        data[k++] = 1.0;
    }

    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.uploadData(new Float32Array(data), width, height, false, gl.RGBA, gl.FLOAT);
    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.filter = TextureFilter.NEAREST_NOMIP;
    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.wrapMode = TextureWrapMode.REPEAT;
}


function _initGLProperties()
{
    var gl = GL.gl;
    TextureFilter.NEAREST = {min: gl.NEAREST_MIPMAP_NEAREST, mag: gl.NEAREST};
    TextureFilter.BILINEAR = {min: gl.LINEAR_MIPMAP_NEAREST, mag: gl.LINEAR};
    TextureFilter.TRILINEAR = {min: gl.LINEAR_MIPMAP_LINEAR, mag: gl.LINEAR};

    if (capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC)
        TextureFilter.TRILINEAR_ANISOTROPIC = {min: gl.LINEAR_MIPMAP_LINEAR, mag: gl.LINEAR};


    TextureFilter.NEAREST_NOMIP = {min: gl.NEAREST, mag: gl.NEAREST};
    TextureFilter.BILINEAR_NOMIP = {min: gl.LINEAR, mag: gl.LINEAR};

    TextureWrapMode.REPEAT = {s: gl.REPEAT, t: gl.REPEAT};
    TextureWrapMode.CLAMP = {s: gl.CLAMP_TO_EDGE, t: gl.CLAMP_TO_EDGE};

    // default settings:
    TextureWrapMode.DEFAULT = TextureWrapMode.REPEAT;
    TextureFilter.DEFAULT = TextureFilter.TRILINEAR;

    CullMode.NONE = null;
    CullMode.BACK = gl.BACK;
    CullMode.FRONT = gl.FRONT;
    CullMode.ALL = gl.FRONT_AND_BACK;

    StencilOp.KEEP = gl.KEEP;
    StencilOp.ZERO = gl.ZERO;
    StencilOp.REPLACE = gl.REPLACE;
    StencilOp.INCREMENT = gl.INCR;
    StencilOp.INCREMENT_WRAP = gl.INCR_WRAP;
    StencilOp.DECREMENT = gl.DECR;
    StencilOp.DECREMENT_WRAP = gl.DECR_WRAP;
    StencilOp.INVERT = gl.INVERT;

    Comparison.DISABLED = null;
    Comparison.ALWAYS = gl.ALWAYS;
    Comparison.NEVER = gl.NEVER;
    Comparison.LESS = gl.LESS;
    Comparison.EQUAL = gl.EQUAL;
    Comparison.LESS_EQUAL = gl.LEQUAL;
    Comparison.GREATER = gl.GREATER;
    Comparison.NOT_EQUAL = gl.NOTEQUAL;
    Comparison.GREATER_EQUAL = gl.GEQUAL;

    ElementType.POINTS = gl.POINTS;
    ElementType.LINES = gl.LINES;
    ElementType.LINE_STRIP = gl.LINE_STRIP;
    ElementType.LINE_LOOP = gl.LINE_LOOP;
    ElementType.TRIANGLES = gl.TRIANGLES;
    ElementType.TRIANGLE_STRIP = gl.TRIANGLE_STRIP;
    ElementType.TRIANGLE_FAN = gl.TRIANGLE_FAN;

    BlendFactor.ZERO = gl.ZERO;
    BlendFactor.ONE = gl.ONE;
    BlendFactor.SOURCE_COLOR = gl.SRC_COLOR;
    BlendFactor.ONE_MINUS_SOURCE_COLOR = gl.ONE_MINUS_SRC_COLOR;
    BlendFactor.DESTINATION_COLOR = gl.DST_COLOR;
    BlendFactor.ONE_MINUS_DESTINATION_COLOR = gl.ONE_MINUS_DST_COLOR;
    BlendFactor.SOURCE_ALPHA = gl.SRC_ALPHA;
    BlendFactor.ONE_MINUS_SOURCE_ALPHA = gl.ONE_MINUS_SRC_ALPHA;
    BlendFactor.DESTINATION_ALPHA = gl.DST_ALPHA;
    BlendFactor.ONE_MINUS_DESTINATION_ALPHA = gl.ONE_MINUS_DST_ALPHA;
    BlendFactor.SOURCE_ALPHA_SATURATE = gl.SRC_ALPHA_SATURATE;
    BlendFactor.CONSTANT_ALPHA = gl.CONSTANT_ALPHA;
    BlendFactor.ONE_MINUS_CONSTANT_ALPHA = gl.ONE_MINUS_CONSTANT_ALPHA;

    BlendOperation.ADD = gl.FUNC_ADD;
    BlendOperation.SUBTRACT = gl.FUNC_SUBTRACT;
    BlendOperation.REVERSE_SUBTRACT = gl.FUNC_REVERSE_SUBTRACT;

    ClearMask.COLOR = gl.COLOR_BUFFER_BIT;
    ClearMask.STENCIL = gl.STENCIL_BUFFER_BIT;
    ClearMask.BUFFER = gl.DEPTH_BUFFER_BIT;
    ClearMask.COMPLETE = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT;

    TextureFormat.RGBA = gl.RGBA;
    TextureFormat.RGB = gl.RGB;

    DataType.UNSIGNED_BYTE = gl.UNSIGNED_BYTE;
    DataType.FLOAT = gl.FLOAT;

    BufferUsage.STATIC_DRAW = gl.STATIC_DRAW;
}