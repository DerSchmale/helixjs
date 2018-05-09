import {ArrayUtils} from './utils/ArrayUtils';
import {FrameTicker} from './utils/FrameTicker';
import {_clearGLStats, GL} from './core/GL';
import {HardDirectionalShadowFilter} from './light/filters/HardDirectionalShadowFilter';
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
import {FrameBuffer} from "./texture/FrameBuffer";
import {HardSpotShadowFilter} from "./light/filters/HardSpotShadowFilter";
import {HardPointShadowFilter} from "./light/filters/HardPointShadowFilter";
import {MaterialPass} from "./material/MaterialPass";

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
 * The {@linkcode Signal} that triggers rendering. Listen to this to call {@linkcode Renderer#render}
 */
export var onFrame = new Signal();

/**
 * The duration to update and render a frame.
 */
export var frameTime = 0;

/**
 * @ignore
 * @type {FrameTicker}
 */
export var frameTicker = new FrameTicker();

frameTicker.onTick.bind(_onFrameTick);

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
        WEBGL_2: false,

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
        EXT_ELEMENT_INDEX_UINT: null,
        EXT_COLOR_BUFFER_FLOAT: null,
        EXT_COLOR_BUFFER_HALF_FLOAT: null,

        DEFAULT_TEXTURE_MAX_ANISOTROPY: 0,
        HDR_FORMAT: 0
    };

/**
 * TextureFilter contains texture filtering presets.
 *
 * @namespace
 *
 * @property NEAREST Performs nearest neighbour filter with nearest mip level selection
 * @property NEAREST_NOMIP Performs nearest neighbour filter with mipmapping disabled
 * @property BILINEAR Performs bilinear filtering with nearest mip level selection
 * @property BILINEAR_NOMIP Performs bilinear filtering with mipmapping disabled
 * @property TRILINEAR Performs trilinear filtering (bilinear + linear mipmap interpolation)
 * @property TRILINEAR_ANISOTROPIC Performs anisotropic trilinear filtering. Only available if capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC is available.
 */
export var TextureFilter = {};

/**
 * TextureWrapMode defines how a texture should be samples when the coordinate is outside the [0, 1] range.
 *
 * @namespace
 *
 * @property DEFAULT The default texture wrap mode (REPEAT).
 * @property REPEAT The fractional part of the coordinate will be used as the coordinate, causing the texture to repeat.
 * @property CLAMP The coordinates will be clamped to 0 and 1.
 */
export var TextureWrapMode = {};

/**
 * CullMode defines the type of face culling used when rendering.
 *
 * @namespace
 *
 * @property NONE Doesn't perform any culling (both sides are rendered).
 * @property BACK Culls the faces pointing away from the screen
 * @property FRONT = Culls the faces pointing toward the screen
 * @property ALL = Culls both faces (nothing is rendered)
 */
export var CullMode = {
    NONE: null,
    BACK: 0x0405,
    FRONT: 0x0404,
    ALL: 0x0408
};

/**
 * StencilOp defines how the stencil buffer gets updated.
 *
 * @namespace
 *
 * @property KEEP Keeps the existing stencil value.
 * @property ZERO Sets the stencil value to 0.
 * @property REPLACE Replaces the stencil value with the reference value.
 * @property INCREMENT Increments the current stencil buffer value. Clamps to the maximum representable unsigned value.
 * @property INCREMENT_WRAP Increments the current stencil buffer value. Wraps stencil buffer value to zero when incrementing the maximum representable unsigned value.
 * @property DECREMENT Decrements the current stencil buffer value. Clamps to 0.
 * @property DECREMENT_WRAP Decrements the current stencil buffer value. Wraps stencil buffer value to the maximum representable unsigned value when decrementing a stencil buffer value of zero.
 * @property INVERT Bitwise inverts the current stencil buffer value.
 *
 * @see {@linkcode StencilState}
 */
export var StencilOp = {};

/**
 * Comparison represents comparison modes used in depth tests, stencil tests, etc
 *
 * @namespace
 *
 * @property DISABLED The given test is disabled.
 * @property ALWAYS The given test always succeeds.
 * @property NEVER The given test never succeeds.
 * @property LESS Less than
 * @property EQUAL Equal
 * @property LESS_EQUAL Less than or equal
 * @property GREATER Greater than.
 * @property GREATER_EQUAL Greater than or equal.
 * @property NOT_EQUAL Not equal.
 */
export var Comparison = {};

/**
 * ElementType described the type of geometry is described by the index buffer.
 *
 * @namespace
 *
 * @property POINTS Every index represents a point.
 * @property LINES Every two indices represent a line.
 * @property LINE_STRIP The indices represent a set of connected lines.
 * @property LINE_LOOP The indices represent a set of connected lines. The last index is also connected to the first.
 * @property TRIANGLES Every three indices represent a line.
 * @property TRIANGLE_STRIP The indices represent a set of connected triangles, in such a way that any consecutive 3 indices form a triangle.
 * @property TRIANGLE_FAN The indices represent a set of connected triangles, fanning out with the first index shared.
 */
export var ElementType = {};

/**
 * BlendFactor define the factors used by {@linkcode BlendState} to multiply with the source and destination colors.
 *
 * @namespace
 *
 * @property ZERO Multiplies by 0.
 * @property ONE Multiplies by 1.
 * @property SOURCE_COLOR Multiplies by the source color.
 * @property ONE_MINUS_SOURCE_COLOR Multiplies by one minus the source color.
 * @property DESTINATION_COLOR Multiplies by the destination color.
 * @property ONE_MINUS_DESTINATION_COLOR Multiplies by one minus the destination color.
 * @property SOURCE_ALPHA Multiplies by the source alpha.
 * @property ONE_MINUS_SOURCE_ALPHA Multiplies by one minus the source alpha.
 * @property DESTINATION_ALPHA Multiplies by the destination alpha.
 * @property ONE_MINUS_DESTINATION_ALPHA Multiplies by one minus the destination alpha.
 * @property SOURCE_ALPHA_SATURATE Multiplies by the minimum of the source and (1 – destination) alphas
 * @property CONSTANT_ALPHA Multiplies by the constant alpha value
 * @property ONE_MINUS_CONSTANT_ALPHA Multiplies by one minus the constant alpha value
 *
 * @see {@linkcode BlendState}
 */
export var BlendFactor = {};

/**
 * BlendOperation defines the operation used to combine the multiplied source and destination colors.
 * @namespace
 *
 * @property ADD Adds the two values.
 * @property SUBTRACT Subtracts the two values.
 * @property REVERSE_SUBTRACT Subtracts the two values in the reverse order.
 *
 * @see {@linkcode BlendState}
 */
export var BlendOperation = {};

/**
 * ClearMask defines which data needs to be cleared when calling {@linkcode GL#clear}
 *
 * @namespace
 *
 * @property COLOR Only clear the color buffer.
 * @property STENCIL Only clear the stencil buffer.
 * @property DEPTH Only clear the depth buffer.
 * @property COMPLETE Clear all buffers.
 *
 * @see {@linkcode GL#clear}
 */
export var ClearMask = {};

/**
 * TextureFormat defines which texture channels are used by a texture.
 *
 * @namespace
 *
 * @property RGBA A 4-channel color texture
 * @property RGB A 3-channel color texture (no alpha)
 */
export var TextureFormat = {};

/**
 * DataType represents the data type used by a gpu buffer (vertex buffer, index buffer, textures)
 *
 * @namespace
 *
 * @property UNSIGNED_BYTE Unsigned byte (8 bit integer)
 * @property UNSIGNED_SHORT Unsigned short (16 bit integer)
 * @property UNSIGNED_INT Unsigned short (32 bit integer)
 * @property FLOAT Floating point (32 bit float)
 */
export var DataType = {};

/**
 * BufferUsage describes the type of cpu <-> gpu interaction a vertex or index buffer requires.
 *
 * @namespace
 *
 * @property STATIC_DRAW The buffer is meant to be uploaded once (or rarely)
 * @property DYNAMIC_DRAW The buffer is meant to be updated often.
 *
 * @see {@linkcode Mesh#vertexUsage}
 * @see {@linkcode Mesh#indexUsage}
 */
export var BufferUsage = {};

/**
 * CubeFace represents the sides of a cube, for example the faces of a cube texture.
 *
 * @namespace
 *
 * @property POSITIVE_X The positive X side.
 * @property NEGATIVE_X The negative X side.
 * @property POSITIVE_Y The positive Y side.
 * @property NEGATIVE_Y The negative Y side.
 * @property POSITIVE_Z The positive Z side.
 * @property NEGATIVE_Z The negative Z side.
 */
export var CubeFace = {};

/**
 * @classdesc
 * Provides a set of options to configure Helix at init. Once passed, the options get assigned to {@linkcode META#OPTIONS}
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
     * Use WebGL 2 if available.
     */
    this.webgl2 = false;

    /**
     * The maximum supported number of joints for skinning animations.
     */
    this.maxSkeletonJoints = 64;

    /**
     * Maximum number of directional lights inside a dynamic WebGL 2.0 shader.
     */
    this.maxDirLights = 3;

    /**
     * Maximum number of light probes inside a dynamic WebGL 2.0 shader.
     */
    this.maxLightProbes = 1;

    /**
     * Allows applying ambient occlusion ({@linkcode SSAO} or {@linkcode HBAO}) to the scene.
     */
    this.ambientOcclusion = null;

    /**
     * Whether or not to use a texture to store skinning data. May be forced to "false" if floating point textures are not supported.
     */
    this.useSkinningTexture = true;

    /**
     * Use high dynamic range for rendering. May be forced to "false" if floating point render targets are not supported.
     */
    this.hdr = false;

    /**
     * Apply gamma correction. This allows lighting to happen in linear space, as it should.
     */
    this.useGammaCorrection = true;

    /**
     * If true, uses a gamma of 2.2 instead of 2. The latter is faster and generally "good enough".
     */
    this.usePreciseGammaCorrection = false;

    /**
     * The default {@codelink LightingModel} to use.
     */
    this.defaultLightingModel = LightingModel.Unlit;

    /**
     * The amount of shadow cascades to use. Cascades split up the view frustum into areas with their own shadow maps,
     * increasing quality at the cost of performance.
     */
    this.numShadowCascades = 1;

    // debug stuff
    /**
     * This enables some error-checking (such as on shader compilation). This has a big performance impact on shader
     * initialisation.
     */
    this.debug = false;

    /**
     * Throws errors when shaders fail to compile.
     */
    this.throwOnShaderError = false;

    /**
     * The shadow filter to use when rendering directional light shadows.
     */
    this.directionalShadowFilter = new HardDirectionalShadowFilter();

    /**
     * The shadow filter to use when rendering spot light shadows.
     */
    this.spotShadowFilter = new HardSpotShadowFilter();

    /**
     * The shadow filter to use when rendering point light shadows.
     */
    this.pointShadowFilter = new HardPointShadowFilter();

    /**
     * Indicates whether the back buffer should support transparency.
     */
    this.transparentBackground = false;
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

    META.OPTIONS = options = options || new InitOptions();

    var webglFlags = {
        antialias: false,   // we're rendering to texture by default, so native AA has no effect
        alpha: META.OPTIONS.transparentBackground,
        // we render offscreen, so no depth/stencil needed in backbuffer
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false
    };

    var defines = "";
    var gl;

    if (options.webgl2)
        gl = canvas.getContext('webgl2', webglFlags);

    if (gl) {
        capabilities.WEBGL_2 = true;
        console.log("WebGL 2 supported!");
        GLSLIncludes.VERSION = "#version 300 es\n";
        defines += "#define HX_GLSL_300_ES\n";

        // throw away all the dynamic passes
        MaterialPass.NUM_PASS_TYPES = 5;
    }
    else {
        gl = canvas.getContext('webgl', webglFlags) || canvas.getContext('experimental-webgl', webglFlags);
    }

    if (!gl) throw new Error("WebGL not supported");
    GL._setGL(gl);

    META.INITIALIZED = true;

    var glExtensions = gl.getSupportedExtensions();

    function _getExtension(name)
    {

        var ext = glExtensions.indexOf(name) >= 0 ? gl.getExtension(name) : null;
        if (!ext) console.warn(name + ' extension not supported!');
        return ext;
    }

    // shortcuts
    _initGLProperties();

    if (options.useGammaCorrection !== false)
        defines += META.OPTIONS.usePreciseGammaCorrection ? "#define HX_GAMMA_CORRECTION_PRECISE\n" : "#define HX_GAMMA_CORRECTION_FAST\n";

    defines += "#define HX_NUM_SHADOW_CASCADES " + META.OPTIONS.numShadowCascades + "\n";
    defines += "#define HX_MAX_SKELETON_JOINTS " + META.OPTIONS.maxSkeletonJoints + "\n";

    capabilities.EXT_DRAW_BUFFERS = _getExtension('WEBGL_draw_buffers');
    // can assume this exists
    capabilities.EXT_FLOAT_TEXTURES = _getExtension('OES_texture_float');
    capabilities.EXT_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_float_linear');
    capabilities.EXT_HALF_FLOAT_TEXTURES = _getExtension('OES_texture_half_float');
    capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_half_float_linear');
    capabilities.EXT_COLOR_BUFFER_FLOAT = _getExtension("EXT_color_buffer_float") || _getExtension('WEBGL_color_buffer_float');
    capabilities.EXT_COLOR_BUFFER_HALF_FLOAT = _getExtension('EXT_color_buffer_half_float');
    capabilities.EXT_DEPTH_TEXTURE = _getExtension('WEBGL_depth_texture');
    capabilities.EXT_STANDARD_DERIVATIVES = _getExtension('OES_standard_derivatives');
    capabilities.EXT_SHADER_TEXTURE_LOD = _getExtension('EXT_shader_texture_lod');
    capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC = _getExtension('EXT_texture_filter_anisotropic');
    capabilities.EXT_ELEMENT_INDEX_UINT = _getExtension('OES_element_index_uint');
    capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY = capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC ? gl.getParameter(capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;

    if (capabilities.EXT_FLOAT_TEXTURES)
        defines += "#define HX_FLOAT_TEXTURES\n";
    else
        options.useSkinningTexture = false;

    if (capabilities.EXT_FLOAT_TEXTURES_LINEAR)
        defines += "#define HX_FLOAT_TEXTURES_LINEAR\n";

    if (capabilities.EXT_HALF_FLOAT_TEXTURES) {
        defines += "#define HX_HALF_FLOAT_TEXTURES\n";
        DataType.HALF_FLOAT = capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES;
    }

    if (capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR)
        defines += "#define HX_HALF_FLOAT_TEXTURES_LINEAR\n";
    else
        options.hdr = false;

    // Common WebGL 1 bug, where EXT_COLOR_BUFFER_FLOAT is false, but float render targets are in fact supported
    if (!capabilities.EXT_COLOR_BUFFER_FLOAT) {
        capabilities.EXT_COLOR_BUFFER_FLOAT = _tryFBO(DataType.FLOAT);
        if (!capabilities.EXT_COLOR_BUFFER_FLOAT)
            console.warn("Float FBOs not supported");
    }

    if (!capabilities.EXT_COLOR_BUFFER_HALF_FLOAT) {
        capabilities.EXT_COLOR_BUFFER_HALF_FLOAT = _tryFBO(DataType.HALF_FLOAT);
        if (!capabilities.EXT_COLOR_BUFFER_HALF_FLOAT)
            console.warn("HalfFloat FBOs not supported");
    }

    if (!capabilities.EXT_DEPTH_TEXTURE)
        defines += "#define HX_NO_DEPTH_TEXTURES\n";

    if (capabilities.EXT_SHADER_TEXTURE_LOD)
        defines += "#define HX_TEXTURE_LOD\n";

    //EXT_SRGB = _getExtension('EXT_sRGB');
    //if (!EXT_SRGB) console.warn('EXT_sRGB extension not supported!');

    capabilities.HDR_FORMAT = options.hdr ? DataType.HALF_FLOAT : gl.UNSIGNED_BYTE;

    if (options.useSkinningTexture) {
        defines += "#define HX_USE_SKINNING_TEXTURE\n";

        _initDefaultSkinningTexture();
    }

    Texture2D._initDefault();
    TextureCube._initDefault();
    BlendState._initDefaults();
    RectMesh._initDefault();
    PoissonDisk._initDefault();
    PoissonSphere._initDefault();

    _init2DDitherTexture(32, 32);

    if (options.ambientOcclusion) {
        defines += "#define HX_SSAO\n";
        options.ambientOcclusion.init();
    }

    GLSLIncludes.GENERAL = defines + GLSLIncludes.GENERAL;

    // default copy shader
    // TODO: Provide a default copy mechanic, can be replaced with blit in WebGL 2.0
    DEFAULTS.COPY_SHADER = new CopyChannelsShader();

    GL.setClearColor(Color.BLACK);

    start();
}

function _onFrameTick(dt)
{
    var startTime = (performance || Date).now();
    onPreFrame.dispatch(dt);
    _clearGLStats();
    onFrame.dispatch(dt);
    frameTime = (performance || Date).now() - startTime;
}

/**
 * This destroys Helix. Any resources created will become invalid.
 */
export function destroy()
{
    stop();
    META.INITIALIZED = false;
    onFrame.unbindAll();
    onPreFrame.unbindAll();
    GL._setGL(null);
}

/**
 * Starts the Helix loop (happens automatically).
 */
export function start()
{
    frameTicker.start();
}

/**
 * Stops the Helix loop.
 */
export function stop()
{
    frameTicker.stop();
}

function _initDefaultSkinningTexture()
{
    var gl = GL.gl;
    DEFAULTS.DEFAULT_SKINNING_TEXTURE = new Texture2D();

    var data = [];
    for (var i = 0; i < META.OPTIONS.maxSkeletonJoints; ++i)
        data.push(1, 0, 0, 0);

    for (i = 0; i < META.OPTIONS.maxSkeletonJoints; ++i)
        data.push(0, 1, 0, 0);

    for (i = 0; i < META.OPTIONS.maxSkeletonJoints; ++i)
        data.push(0, 0, 1, 0);

    DEFAULTS.DEFAULT_SKINNING_TEXTURE.uploadData(new Float32Array(data), META.OPTIONS.maxSkeletonJoints, 3, false, gl.RGBA, gl.FLOAT);
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
    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.filter = TextureFilter.NEAREST_NOMIP;
    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.wrapMode = TextureWrapMode.REPEAT;

    if (capabilities.EXT_FLOAT_TEXTURES)
        DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.uploadData(new Float32Array(data), width, height, false, TextureFormat.RGBA, DataType.FLOAT);
    else {
        len = data.length;

        for (i = 0; i < len; ++i)
            data[i] = Math.round((data[i] * .5 + .5) * 0xff);

        DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.uploadData(new Uint8Array(data), width, height, false, TextureFormat.RGBA, DataType.UNSIGNED_BYTE);
    }

    // this one is used when dynamic light probes passes need to disable a map
    DEFAULTS.DARK_CUBE_TEXTURE = new TextureCube();
    var data = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    data = [ data, data, data, data, data, data ];
    DEFAULTS.DARK_CUBE_TEXTURE.uploadData(data, 1, true);
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
    ClearMask.DEPTH = gl.DEPTH_BUFFER_BIT;
    ClearMask.COMPLETE = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT;

    TextureFormat.RGBA = gl.RGBA;
    TextureFormat.RGB = gl.RGB;

    DataType.UNSIGNED_BYTE = gl.UNSIGNED_BYTE;
    DataType.UNSIGNED_SHORT = gl.UNSIGNED_SHORT;
    DataType.UNSIGNED_INT = gl.UNSIGNED_INT;
    DataType.FLOAT = gl.FLOAT;
    DataType.HALF_FLOAT = undefined;    // possibly set later, if supported

    BufferUsage.STATIC_DRAW = gl.STATIC_DRAW;
    BufferUsage.DYNAMIC_DRAW = gl.DYNAMIC_DRAW;

    // notice that cube face has Y and Z flipped to match with Helix' RH Z-up coordinate system
    CubeFace.POSITIVE_X = gl.TEXTURE_CUBE_MAP_POSITIVE_X;
    CubeFace.NEGATIVE_X = gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
    CubeFace.POSITIVE_Y = gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
    CubeFace.NEGATIVE_Y = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
    CubeFace.POSITIVE_Z = gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
    CubeFace.NEGATIVE_Z = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
}

function _tryFBO(dataType)
{
    var tex = new Texture2D();
    tex.initEmpty(8, 8, null, dataType);
    var fbo = new FrameBuffer(tex);
    return fbo.init(true);
}

