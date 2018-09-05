import {ArrayUtils} from './utils/ArrayUtils';
import {FrameTicker} from './utils/FrameTicker';
import {_clearGLStats, GL} from './core/GL';
import {HardShadowFilter} from './light/filters/HardShadowFilter';
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
import {MaterialPass} from "./material/MaterialPass";
import {initGamepads, updateGamepads} from "./input/gamepads";
import {disableVR, isVRPresenting} from "./vr/vr";
import {ProgramCache} from "./shader/ProgramCache";

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
        TARGET_CANVAS: null,

        /**
         * The WebVR display (if enabled) used for rendering
         */
        VR_DISPLAY: null,

		/**
         * The WebVR left eye parameters (if enabled)
		 */
		VR_LEFT_EYE_PARAMS: null,

        /**
         * The WebVR right eye parameters (if enabled)
		 */
		VR_RIGHT_EYE_PARAMS: null,

		/**
         * The Audio Context used for audio playback
		 */
		AUDIO_CONTEXT: null,

		/**
         * The current frame mark. Used for usage checking in cached programs.
		 */
		CURRENT_FRAME_MARK: 0
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
        HDR_FORMAT: 0,

        VR_CAN_PRESENT: false
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
export var TextureWrapMode = {
	REPEAT: {s: 10497, t: 10497},
	CLAMP: {s: 33071, t: 33071},
	DEFAULT: {s: 10497, t: 10497}
};

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
export var StencilOp = {
	KEEP: 7680,
    ZERO: 0,
    REPLACE: 7681,
    INCREMENT: 7682,
    INCREMENT_WRAP: 34055,
    DECREMENT: 7683,
    DECREMENT_WRAP: 34056,
    INVERT: 5386
};

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
export var Comparison = {
	DISABLED: null,
    NEVER: 512,
    LESS: 513,
    EQUAL: 514,
    LESS_EQUAL: 515,
    GREATER: 516,
    NOT_EQUAL: 517,
    GREATER_EQUAL: 518,
	ALWAYS: 519
};

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
export var ElementType = {
	POINTS: 0,
    LINES: 1,
	LINE_LOOP: 2,
	LINE_STRIP: 3,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6

};

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
export var BlendFactor = {
	ZERO: 0,
    ONE: 1,
    SOURCE_COLOR: 768,
    ONE_MINUS_SOURCE_COLOR: 769,
	SOURCE_ALPHA: 770,
	ONE_MINUS_SOURCE_ALPHA: 771,
	DESTINATION_ALPHA: 772,
	ONE_MINUS_DESTINATION_ALPHA: 773,
	DESTINATION_COLOR: 774,
	ONE_MINUS_DESTINATION_COLOR: 775,
    SOURCE_ALPHA_SATURATE: 776,
    CONSTANT_ALPHA: 32771,
    ONE_MINUS_CONSTANT_ALPHA: 32772
};

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
export var BlendOperation = {
	ADD: 32774,
    SUBTRACT: 32778,
    REVERSE_SUBTRACT: 32779
};

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
export var ClearMask = {
	COLOR: 16384,
    STENCIL: 1024,
    DEPTH: 256,
    COMPLETE: 16384 | 1024 | 256
};

/**
 * TextureFormat defines which texture channels are used by a texture.
 *
 * @namespace
 *
 * @property RGBA A 4-channel color texture
 * @property RGB A 3-channel color texture (no alpha)
 */
export var TextureFormat = {
	/**
     * This is mainly for WebGL 2 compatibility and floating point textures.
     * @ignore
	 */
	getDefaultInternalFormat: function(format, dataType)
    {
        if (!capabilities.WEBGL_2)
            return format;

        if (dataType === DataType.FLOAT) {
            if (format === TextureFormat.RGBA)
                return GL.gl.RGBA32F;
            if (format === TextureFormat.RGB)
                return GL.gl.RGB32F;
            if (format === TextureFormat.RG)
                return GL.gl.RG32F;
        }

        if (dataType === DataType.HALF_FLOAT) {
            if (format === TextureFormat.RGBA)
                return GL.gl.RGBA16F;
            if (format === TextureFormat.RGB)
                return GL.gl.RGB16F;
			if (format === TextureFormat.RG)
				return GL.gl.RG16F;
        }

        return format;
    }

};

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
export var DataType = {
	UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_INT: 5125,
    FLOAT: 5126,
    HALF_FLOAT: undefined    // possibly set later, if supported
};

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
export var BufferUsage = {
	STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048
};

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
export var CubeFace = {
	// notice that cube face has Y and Z flipped wrt opengl to match with Helix' RH Z-up coordinate system
	POSITIVE_X: 34069,
    NEGATIVE_X: 34070,
    POSITIVE_Y: 34073,
    NEGATIVE_Y: 34074,
    POSITIVE_Z: 34071,
    NEGATIVE_Z: 34072
};

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
     * Whether or not the drawing buffer is cleared or not between frames. Set this to true for VR mirroring.
     */
    this.preserveDrawingBuffer = false;

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
     * Maximum number of point / spot lights inside a dynamic WebGL 2.0 shader.
     */
    this.maxPointSpotLights = 20;

	/**
     * Number of cells for clustered rendering in WebGL 2.0
	 */
	this.numLightingCellsX = 16;

	/**
	 * Number of cells for clustered rendering in WebGL 2.0
	 */
	this.numLightingCellsY = 9;

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
    this.shadowFilter = new HardShadowFilter();

    /**
     * Indicates whether the back buffer should support transparency.
     */
    this.transparentBackground = false;

    /**
     * The default eye height for room-scale positions - in case the VR device does not support room-scale VR
     */
    this.vrUserHeight = 1.65;
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
    META.TARGET_CANVAS.requestPointerLock = META.TARGET_CANVAS.requestPointerLock || META.TARGET_CANVAS.mozRequestPointerLock;
    META.AUDIO_CONTEXT = window.hx_audioContext;

    _updateCanvasSize();
    initGamepads();

    META.OPTIONS = options = options || new InitOptions();

    var webglFlags = {
        antialias: false,   // we're rendering to texture by default, so native AA has no effect
        alpha: META.OPTIONS.transparentBackground,
        // we render offscreen, so no depth/stencil needed in backbuffer
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: META.OPTIONS.preserveDrawingBuffer
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
        MaterialPass.NUM_PASS_TYPES = 4;
    }
    else {
        // so the user can query it's not supported
        META.OPTIONS.webgl2 = false;
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

    capabilities.EXT_DRAW_BUFFERS = capabilities.WEBGL_2? true : _getExtension('WEBGL_draw_buffers');
    // can assume this exists
    capabilities.EXT_FLOAT_TEXTURES = capabilities.WEBGL_2? true : _getExtension('OES_texture_float');
    capabilities.EXT_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_float_linear');
    capabilities.EXT_HALF_FLOAT_TEXTURES = capabilities.WEBGL_2? true : _getExtension('OES_texture_half_float');
    capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_half_float_linear');

    // try webgl 2 extension first (will return null if no webgl 2 context is present anyway)
    capabilities.EXT_COLOR_BUFFER_FLOAT = _getExtension("EXT_color_buffer_float") || _getExtension('WEBGL_color_buffer_float');
    capabilities.EXT_COLOR_BUFFER_HALF_FLOAT = _getExtension('EXT_color_buffer_float') || _getExtension('EXT_color_buffer_half_float');
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
        DataType.HALF_FLOAT = capabilities.WEBGL_2? gl.HALF_FLOAT : capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES;
    }

    if (capabilities.WEBGL_2 || capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR)
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
	++META.CURRENT_FRAME_MARK;

	ProgramCache.purge(META.CURRENT_FRAME_MARK);

    var startTime = (performance || Date).now();

    updateGamepads();
    onPreFrame.dispatch(dt);

    // this needs to happen *after* preFrame, since stats are fetched on preframe
    _clearGLStats();

    // VR stopped presenting (present change event doesn't seem reliable)
    if (isVRPresenting() && !META.VR_DISPLAY.isPresenting) {
        console.log("VR device stopped presenting, disabling VR");
		disableVR();
	}

    if (!META.VR_DISPLAY)
		_updateCanvasSize();

    onFrame.dispatch(dt);

    if (META.VR_DISPLAY && META.VR_DISPLAY.isPresenting)
        META.VR_DISPLAY._display.submitFrame();

    frameTime = (performance || Date).now() - startTime;
}

function _updateCanvasSize()
{
    // helix does NOT adapt the size automatically, so you can have complete control over the resolution
    var dpr = window.devicePixelRatio || 1;

    var canvas = META.TARGET_CANVAS;

    var w = Math.round(canvas.clientWidth * dpr);
    var h = Math.round(canvas.clientHeight * dpr);

    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
	}
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
    DEFAULTS.DEFAULT_SKINNING_TEXTURE = new Texture2D();

    var data = [];
    for (var i = 0; i < META.OPTIONS.maxSkeletonJoints; ++i)
        data.push(1, 0, 0, 0);

    for (i = 0; i < META.OPTIONS.maxSkeletonJoints; ++i)
        data.push(0, 1, 0, 0);

    for (i = 0; i < META.OPTIONS.maxSkeletonJoints; ++i)
        data.push(0, 0, 1, 0);

    DEFAULTS.DEFAULT_SKINNING_TEXTURE.uploadData(new Float32Array(data), META.OPTIONS.maxSkeletonJoints, 3, false, TextureFormat.RGBA, DataType.FLOAT);
    DEFAULTS.DEFAULT_SKINNING_TEXTURE.filter = TextureFilter.NEAREST_NOMIP;
    DEFAULTS.DEFAULT_SKINNING_TEXTURE.wrapMode = TextureWrapMode.CLAMP;
}

function _init2DDitherTexture(width, height)
{
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
    data = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
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
    TextureFilter.DEFAULT = TextureFilter.TRILINEAR;

    TextureFormat.RGBA = gl.RGBA;
    TextureFormat.RGB = gl.RGB;
    TextureFormat.RG = gl.RG;   // only assigned if available (WebGL 2)
}

function _tryFBO(dataType)
{
    var tex = new Texture2D();
    tex.initEmpty(8, 8, null, dataType);
    var fbo = new FrameBuffer(tex);
    return fbo.init(true);
}