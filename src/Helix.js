HX = {
    VERSION: '0.1',
    TypedArray: (typeof Float32Array !== 'undefined') ? Float32Array : Array,
};

/**
 * Provides a set of options to configure Helix
 * @constructor
 */
HX.InitOptions = function()
{
    // rendering pipeline options
    this.useHDR = false;   // only if available
    this.useLinearSpace = true;

    // provide an array of light types if you wish to extend the direct lights with your own types
    this.customLights = [];

    // debug-related
    this.debug = false;   // requires webgl-debug.js:
    this.ignoreDrawBuffersExtension = false;     // forces multiple passes for the GBuffer
    this.ignoreDepthTexturesExtension = false;     // forces storing depth info explicitly
    this.ignoreTextureLODExtension = false;     // forces storing depth info explicitly
    this.ignoreHalfFloatTextureExtension = false;     // forces storing depth info explicitly
    this.throwOnShaderError = true;
    this.lightingModel = HX.BlinnPhongSimpleLightingModel;
};

/**
 * ShaderLibrary is an object that will store shader code processed by the build process: contents of glsl files stored
 * in the glsl folder will be stored here and can be retrieved using their original filename.
 */
HX.ShaderLibrary = {
    /**
     * Retrieves the shader code for a given filename.
     * @param filename The filename of the glsl code to retrieve
     * @param defines (Optional) An object containing variable names that need to be defined with the given value.
     * This should not be used for macros, which should be explicitly prepended
     * @param extensions (Optional) An array of extensions to be required
     * @returns A string containing the shader code from the files with defines prepended
     */
    get: function(filename, defines)
    {
        var defineString = "";

        for (var key in defines) {
            if (defines.hasOwnProperty(key)) {
                defineString += "#define " + key + " " + defines[key] + "\n";
            }
        }

        return defineString + HX.ShaderLibrary[filename];
    }
};

// properties to keep track of render state
HX._numActiveAttributes = 0;
HX._numActiveTextures = 0;

/**
 * Initializes Helix and creates a WebGL context from a given canvas
 * @param canvas The canvas to create the gl context from.
 */
HX.init = function(canvas, options)
{
    HX.TARGET_CANVAS = canvas;

    var webglFlags = {
        antialias:false,
        premultipliedAlpha: false
    };

    var glContext = canvas.getContext('webgl', webglFlags) || canvas.getContext('experimental-webgl', webglFlags);
    if (options && options.debug) {
        eval("context = WebGLDebugUtils.makeDebugContext(context);");
    }

    HX.OPTIONS = options || new HX.InitOptions();
    HX.GL = glContext;

    if (!HX.GL) throw "WebGL not supported";

    var extensions  = HX.GL.getSupportedExtensions();

    function _getExtension(name)
    {
        return extensions.indexOf(name) >= 0 ? HX.GL.getExtension(name) : null;
    }

    HX._initLights();
    HX.LIGHTING_MODEL = HX.OPTIONS.lightingModel;

    var defines = "";
    if (HX.OPTIONS.useLinearSpace !== false)
        defines += "#define HX_LINEAR_SPACE\n";

    if (!HX.OPTIONS.ignoreDrawBuffersExtension)
        HX.EXT_DRAW_BUFFERS = _getExtension('WEBGL_draw_buffers');

    if (HX.EXT_DRAW_BUFFERS && HX.EXT_DRAW_BUFFERS.MAX_DRAW_BUFFERS_WEBGL >= 3) {
        defines += "#extension GL_EXT_draw_buffers : require\n";
    }
    else {
        defines += "#define HX_SEPARATE_GEOMETRY_PASSES\n";
        console.warn('WEBGL_draw_buffers extension not supported!');
        HX.EXT_DRAW_BUFFERS = null;
    }

    // include individual geometry shaders
    HX.MaterialPass.NUM_PASS_TYPES += !!HX.EXT_DRAW_BUFFERS ? 0 : 2;

    HX.EXT_FLOAT_TEXTURES = _getExtension('OES_texture_float');
    if (!HX.EXT_FLOAT_TEXTURES) console.warn('OES_texture_float extension not supported!');

    if (!HX.OPTIONS.ignoreHalfFloatTextureExtension)
        HX.EXT_HALF_FLOAT_TEXTURES = _getExtension('OES_texture_half_float');
    if (!HX.EXT_HALF_FLOAT_TEXTURES) console.warn('OES_texture_half_float extension not supported!');

    HX.EXT_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_float_linear');
    if (!HX.EXT_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_float_linear extension not supported!');

    HX.EXT_HALF_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_half_float_linear');
    if (!HX.EXT_HALF_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_half_float_linear extension not supported!');

    if (!HX.OPTIONS.ignoreDepthTexturesExtension)
        HX.EXT_DEPTH_TEXTURE = _getExtension('WEBGL_depth_texture');

    if (!HX.EXT_DEPTH_TEXTURE) {
        console.warn('WEBGL_depth_texture extension not supported!');
        defines += "#define HX_NO_DEPTH_TEXTURES\n";
        HX.MaterialPass.SHADOW_MAP_PASS = HX.MaterialPass.NUM_PASS_TYPES++;
    }

    HX.EXT_STANDARD_DERIVATIVES = _getExtension('OES_standard_derivatives');
    if (!HX.EXT_STANDARD_DERIVATIVES) console.warn('OES_standard_derivatives extension not supported!');

    if (!HX.OPTIONS.ignoreTextureLODExtension)
        HX.EXT_SHADER_TEXTURE_LOD = _getExtension('EXT_shader_texture_lod');

    if (!HX.EXT_SHADER_TEXTURE_LOD) console.warn('EXT_shader_texture_lod extension not supported!');

    HX.EXT_TEXTURE_FILTER_ANISOTROPIC = _getExtension('EXT_texture_filter_anisotropic');
    if (!HX.EXT_TEXTURE_FILTER_ANISOTROPIC) console.warn('EXT_texture_filter_anisotropic extension not supported!');

    //HX.EXT_SRGB = _getExtension('EXT_sRGB');
    //if (!HX.EXT_SRGB) console.warn('EXT_sRGB extension not supported!');

    HX.DEFAULT_TEXTURE_MAX_ANISOTROPY = HX.EXT_TEXTURE_FILTER_ANISOTROPIC? HX.GL.getParameter(HX.EXT_TEXTURE_FILTER_ANISOTROPIC.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;

    if (!HX.EXT_HALF_FLOAT_TEXTURES_LINEAR || !HX.EXT_HALF_FLOAT_TEXTURES) {
        HX.OPTIONS.useHDR = false;
    }

    HX.HDR_FORMAT = HX.OPTIONS.useHDR? HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES : HX.GL.UNSIGNED_BYTE;

    HX.GLSLIncludeGeneral = defines + HX.GLSLIncludeGeneral;

    // shortcuts
    HX._initGLProperties();

    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);

    HX.DEFAULT_TEXTURE_2D = new HX.Texture2D();
    HX.DEFAULT_TEXTURE_2D.uploadData(data, 1, 1, true);
    HX.DEFAULT_TEXTURE_2D.setFilter(HX.TextureFilter.NEAREST_NOMIP);

    HX.DEFAULT_TEXTURE_CUBE = new HX.TextureCube();
    HX.DEFAULT_TEXTURE_CUBE.uploadData([data, data, data, data, data, data], 1, true);
    HX.DEFAULT_TEXTURE_CUBE.setFilter(HX.TextureFilter.NEAREST_NOMIP);

    // TODO: Pregenerate
    var poissonDisk = new HX.PoissonDisk();
    var poissonSphere = new HX.PoissonSphere();
    poissonDisk.generatePoints(64);
    poissonSphere.generatePoints(64);

    HX.DEFAULT_POISSON_DISK = new Float32Array(64 * 2);
    HX.DEFAULT_POISSON_SPHERE = new Float32Array(64 * 3);

    var diskPoints = poissonDisk.getPoints();
    var spherePoints = poissonSphere.getPoints();

    for (var i = 0; i < 64; ++i) {
        var p = diskPoints[i];
        HX.DEFAULT_POISSON_DISK[i * 2] = p.x;
        HX.DEFAULT_POISSON_DISK[i * 2 + 1] = p.y;

        p = spherePoints[i];
        HX.DEFAULT_POISSON_SPHERE[i * 3] = p.x;
        HX.DEFAULT_POISSON_SPHERE[i * 3 + 1] = p.y;
        HX.DEFAULT_POISSON_SPHERE[i * 3 + 2] = p.z;
    }

    HX._init2DDitherTexture(32, 32);

    HX.DEFAULT_RECT_MESH = HX.RectMesh.create();

    HX.pushRenderTarget(null);

    HX.GL.clearColor(0, 0, 0, 1);
};


HX._initLights = function()
{
    HX.LIGHT_TYPES = [ HX.AmbientLight, HX.DirectionalLight, HX.PointLight ].concat(HX.OPTIONS.customLights);

    for (var i = 0; i < HX.LIGHT_TYPES.length; ++i) {
        var type = HX.LIGHT_TYPES[i];
        var closure = function() {
            var j = i;
            return function() { return j; }
        };

        type.prototype.getTypeID = closure();
    }
};

HX._init2DDitherTexture = function(width, height)
{
    HX.DEFAULT_2D_DITHER_TEXTURE = new HX.Texture2D();
    var len = width * height;
    var minValue = 1.0 / len;
    var data = [];
    var k = 0;
    var values = [];

    for (var i = 0; i < len; ++i) {
        values.push(i / len);
    }

    HX.shuffle(values);

    for (var i = 0; i < len; ++i) {
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

    HX.DEFAULT_2D_DITHER_TEXTURE.uploadData(new Float32Array(data), width, height, false, HX.GL.RGBA, HX.GL.FLOAT);
    HX.DEFAULT_2D_DITHER_TEXTURE.setFilter(HX.TextureFilter.NEAREST_NOMIP);
    HX.DEFAULT_2D_DITHER_TEXTURE.setWrapMode(HX.TextureWrapMode.REPEAT);
};


HX._initGLProperties = function()
{
    HX.TextureFilter = {};
    HX.TextureFilter.NEAREST = {min: HX.GL.NEAREST_MIPMAP_NEAREST, mag: HX.GL.NEAREST};
    HX.TextureFilter.BILINEAR = {min: HX.GL.LINEAR_MIPMAP_NEAREST, mag: HX.GL.LINEAR};
    HX.TextureFilter.TRILINEAR = {min: HX.GL.LINEAR_MIPMAP_LINEAR, mag: HX.GL.LINEAR};

    if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC)
        HX.TextureFilter.TRILINEAR_ANISOTROPIC = {min: HX.GL.LINEAR_MIPMAP_LINEAR, mag: HX.GL.LINEAR};


    HX.TextureFilter.NEAREST_NOMIP = { min: HX.GL.NEAREST, mag: HX.GL.NEAREST };
    HX.TextureFilter.BILINEAR_NOMIP = { min: HX.GL.LINEAR, mag: HX.GL.LINEAR };

    HX.TextureWrapMode = {};
    HX.TextureWrapMode.REPEAT = { s: HX.GL.REPEAT, t: HX.GL.REPEAT };
    HX.TextureWrapMode.CLAMP = { s: HX.GL.CLAMP_TO_EDGE, t: HX.GL.CLAMP_TO_EDGE };

    // default settings:
    HX.TextureWrapMode.DEFAULT = HX.TextureWrapMode.REPEAT;
    HX.TextureFilter.DEFAULT = HX.TextureFilter.TRILINEAR;

    HX.CullMode = {
        NONE: null,
        BACK: HX.GL.BACK,
        FRONT: HX.GL.FRONT,
        ALL: HX.GL.FRONT_AND_BACK
    };

    HX.ElementType = {
        POINTS: HX.GL.POINTS,
        LINES: HX.GL.LINES,
        LINE_STRIP: HX.GL.LINE_STRIP,
        LINE_LOOP: HX.GL.LINE_LOOP,
        TRIANGLES: HX.GL.TRIANGLES,
        TRIANGLE_STRIP: HX.GL.TRIANGLE_STRIP,
        TRIANGLE_FAN: HX.GL.TRIANGLE_FAN
    };

    HX.BlendFactor = {
        ZERO: HX.GL.ZERO,
        ONE: HX.GL.ONE,
        SOURCE_COLOR: HX.GL.SRC_COLOR,
        ONE_MINUS_SOURCE_COLOR: HX.GL.ONE_MINUS_SRC_COLOR,
        DESTINATION_COLOR: HX.GL.DST_COLOR,
        ONE_MINUS_DESTINATION_COLOR: HX.GL.ONE_MINUS_DST_COLOR,
        SOURCE_ALPHA: HX.GL.SRC_ALPHA,
        ONE_MINUS_SOURCE_ALPHA: HX.GL.ONE_MINUS_SRC_ALPHA,
        DESTINATION_ALPHA: HX.GL.DST_ALPHA,
        ONE_MINUS_DESTINATION_ALPHA: HX.GL.ONE_MINUS_DST_ALPHA,
        SOURCE_ALPHA_SATURATE: HX.GL.SRC_ALPHA_SATURATE
    };

    HX.BlendOperation = {
        ADD: HX.GL.FUNC_ADD,
        SUBTRACT: HX.GL.FUNC_SUBTRACT,
        REVERSE_SUBTRACT: HX.GL.FUNC_REVERSE_SUBTRACT
    };
};