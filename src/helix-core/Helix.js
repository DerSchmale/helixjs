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
import {PoissonSphere} from "./math/PoissonSphere";
import {Color} from "./core/Color";
import {MaterialPass} from "./material/MaterialPass";
import {FrameBuffer} from "./texture/FrameBuffer";

/**
 * META contains some data about the Helix engine, such as the options it was initialized with.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
export var META =
    {
        /**
         * The current of the engine.
         */
        VERSION: "0.1.0",

        /**
         * Whether or not Helix has been initialized.
         */
        INITIALIZED: false,

        /**
         * The options passed to Helix when initializing. These are possibly updated to reflect the device's capabilties,
         * so it can be used to verify settings.
         */
        OPTIONS: null,

        /**
         * The canvas used to contain the to-screen renders.
         */
        TARGET_CANVAS: null
    };

/**
 * The {@linkcode Signal} that dispatched before a frame renders.
 */
export var onPreFrame = new Signal();

/**
 * The {@linkcode Signal} that triggers rendering. Listen to this to call {@linkcode Renderer.render}
 */
export var onFrame = new Signal();

/**
 * @ignore
 * @type {FrameTicker}
 */
export var frameTicker = new FrameTicker();

/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
export var DEFAULTS =
    {
        COPY_SHADER: null,
        DEFAULT_2D_DITHER_TEXTURE: null,
        DEFAULT_SKINNING_TEXTURE: null
    };

/**
 * capabilities contains the device-specific properties and supported extensions.
 *
 * @author derschmale <http://www.derschmale.com>
 */
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
        NUM_MORPH_TARGETS: 0,
        GBUFFER_MRT: false,
        HDR_FORMAT: 0,
        HALF_FLOAT_FBO: false
    };

// internal options
export var _HX_ = {
    GAMMA_CORRECT_LIGHTS: false
};

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
export var CubeFace = {};

/**
 * @classdesc
 * Provides a set of options to configure Helix at init. Once passed, the options get assigned to {@linkcode META.OPTIONS}
 * but the values may have changed to reflect the capabilities of the device. For example: hdr may be set to false if
 * floating point render targets aren't supported. It's important to check options like these through META.OPTIONS to
 * handle them correctly. (lack of hdr may require a different lighting setup).
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
export function InitOptions()
{
    /**
     * The maximum supported number of bones for skinning animations.
     *
     * TODO: rename to maxSkeletonJoints
     */
    this.maxBones = 64;

    /**
     * Whether or not to use a texture to store skinning data. May be forced to "false" if floating point textures are not supported.
     */
    this.useSkinningTexture = true;

    /**
     * Use high dynamic range for rendering. May be forced to "false" if floating point render targets are not supported.
     */
    this.hdr = false;   // only if available

    /**
     * Apply gamma correction. This allows lighting to happen in linear space, as it should.
     */
    this.useGammaCorrection = true;

    /**
     * If true, uses a gamma of 2.2 instead of 2. The latter is faster and generally "good enough".
     */
    this.usePreciseGammaCorrection = false;

    /**
     * The default {@codelink LightingModel} to use. This will cause non-blended materials using this lighting model to
     * use the deferred lighting path, which may improve lighting performance. If not, leave it set to Unlit and assign
     * lighting models explicitly through {@linkcode Material.lightingModel}.
     */
    this.defaultLightingModel = LightingModel.Unlit;

    /**
     * The amount of shadow cascades to use. Cascades split up the view frustum into areas with their own shadow maps,
     * increasing quality at the cost of performance.
     */
    this.numShadowCascades = 1;

    // debug stuff
    /**
     * Ignore any supported extensions.
     */
    this.ignoreAllExtensions = false;

    /**
     * Ignore the draw buffer extension. Forces multiple passes for the deferred GBuffer rendering.
     */
    this.ignoreDrawBuffersExtension = false;

    /**
     * Ignore the depth textures extension.
     */
    this.ignoreDepthTexturesExtension = false;

    /**
     * Ignores the texture LOD extension
     */
    this.ignoreTextureLODExtension = false;

    /**
     * Ignores the half float texture format extension
     */
    this.ignoreHalfFloatTextureExtension = false;     // forces storing depth info explicitly

    /**
     * Throws errors when shaders fail to compile.
     */
    this.throwOnShaderError = false;

    /**
     * The shadow filter to use when rendering directional light shadows.
     */
    this.directionalShadowFilter = new HardDirectionalShadowFilter();
}

/**
 * Initializes Helix and creates a WebGL context for a given canvas
 *
 * @param canvas The canvas to create the gl context from.
 * @param [options] An optional {@linkcode InitOptions} object.
 *
 * @author derschmale <http://www.derschmale.com>
 */
export function init(canvas, options)
{
    if (META.INITIALIZED) throw new Error("Can only initialize Helix once!");


    META.TARGET_CANVAS = canvas;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    var webglFlags = {
        antialias: false,   // we're rendering to texture by default, so native AA has no effect
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

    defines += "#define HX_NUM_SHADOW_CASCADES " + META.OPTIONS.numShadowCascades + "\n";
    defines += "#define HX_MAX_BONES " + META.OPTIONS.maxBones + "\n";

    options.ignoreDrawBuffersExtension = options.ignoreDrawBuffersExtension || options.ignoreAllExtensions;
    options.ignoreDepthTexturesExtension = options.ignoreDepthTexturesExtension || options.ignoreAllExtensions;
    options.ignoreTextureLODExtension = options.ignoreTextureLODExtension || options.ignoreAllExtensions;
    options.ignoreHalfFloatTextureExtension = options.ignoreHalfFloatTextureExtension || options.ignoreAllExtensions;

    if (!options.ignoreDrawBuffersExtension)
        capabilities.EXT_DRAW_BUFFERS = _getExtension('WEBGL_draw_buffers');

    if (capabilities.EXT_DRAW_BUFFERS && capabilities.EXT_DRAW_BUFFERS.MAX_DRAW_BUFFERS_WEBGL >= 3) {
        capabilities.GBUFFER_MRT = true;
        // remove the last (individual) gbuffer pass
        MaterialPass.NUM_PASS_TYPES = 8;
    }

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

    if (capabilities.EXT_SHADER_TEXTURE_LOD)
        defines += "#define HX_TEXTURE_LOD\n";
    else
        console.warn('EXT_shader_texture_lod extension not supported!');

    capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC = _getExtension('EXT_texture_filter_anisotropic');
    if (!capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC) console.warn('EXT_texture_filter_anisotropic extension not supported!');

    //EXT_SRGB = _getExtension('EXT_sRGB');
    //if (!EXT_SRGB) console.warn('EXT_sRGB extension not supported!');

    capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY = capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC ? gl.getParameter(capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;

    if (!capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR || !capabilities.EXT_HALF_FLOAT_TEXTURES)
        options.hdr = false;

    // try creating a HDR fbo
    if (options.hdr) {
        var tex = new Texture2D();
        tex.initEmpty(8, 8, null, capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES);
        var fbo = new FrameBuffer(tex);
        if (fbo.init(true)) {
            capabilities.HALF_FLOAT_FBO = true;
        } else {
            options.hdr = false;
            capabilities.HALF_FLOAT_FBO = false;
            console.warn("Half float FBOs not supported");
        }
    }

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

    Texture2D._initDefault();
    TextureCube._initDefault();
    BlendState._initDefaults();
    RectMesh._initDefault();
    PoissonDisk._initDefault();
    PoissonSphere._initDefault();

    _init2DDitherTexture(32, 32);

    GL.setClearColor(Color.BLACK);

    start();
}

/**
 * Starts the Helix loop (happens automatically).
 */
export function start()
{
    frameTicker.start(function (dt)
    {
        onPreFrame.dispatch(dt);
        _clearGLStats();
        onFrame.dispatch(dt);
    });
}

/**
 * Stops the Helix loop.
 */
export function stop()
{
    frameTicker.stop();
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

    DEFAULTS.DEFAULT_SKINNING_TEXTURE.uploadData(new Float32Array(data), META.OPTIONS.maxBones, 3, false, gl.RGBA, gl.FLOAT);
    DEFAULTS.DEFAULT_SKINNING_TEXTURE.filter = TextureFilter.NEAREST_NOMIP;
    DEFAULTS.DEFAULT_SKINNING_TEXTURE.wrapMode = TextureWrapMode.CLAMP;
}

function _init2DDitherTexture(width, height)
{
    var gl = GL.gl;
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

    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE = new Texture2D();
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
    DataType.UNSIGNED_SHORT = gl.UNSIGNED_SHORT;
    DataType.UNSIGNED_INT = gl.UNSIGNED_INT;
    DataType.FLOAT = gl.FLOAT;

    BufferUsage.STATIC_DRAW = gl.STATIC_DRAW;

    CubeFace.POSITIVE_X = gl.TEXTURE_CUBE_MAP_POSITIVE_X;
    CubeFace.NEGATIVE_X = gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
    CubeFace.POSITIVE_Y = gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
    CubeFace.NEGATIVE_Y = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
    CubeFace.POSITIVE_Z = gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
    CubeFace.NEGATIVE_Z = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
}