HX = {
    VERSION: '0.1',
    TypedArray: (typeof Float32Array !== 'undefined') ? Float32Array : Array,
};

HX.InitOptions = function()
{
    this.useHDR = false;   // only if available
    this.useLinearSpace = true;
    this.ignoreDrawBuffers = false;     // for debug purposes, forces multiple passes for the GBuffer
};

HX.ShaderLibrary = {
    get: function(filename) {
        return HX.ShaderLibrary[filename];
    }
};

// properties to keep track of render state
HX._numActiveAttributes = 0;
HX._numActiveTextures = 0;

/**
 * Initializes the Helix engine. IMPORTANT! This needs to be called before any other Helix functionality.
 * @param glContext The webgl context to be used by the engine. Helix does not manage its own context, since you may use the context yourself for UI work etc.
 * @param options (optional) An instance of HX.InitOptions
 */
HX.initFromContext = function(glContext, options)
{
    HX.OPTIONS = options || new HX.InitOptions();
    HX.GL = glContext;

    if (HX.OPTIONS.useLinearSpace !== false)
        HX.GLSLIncludeDeferredPass = "#define HX_LINEAR_SPACE\n" + HX.GLSLIncludeDeferredPass;

    if (!options.ignoreDrawBuffers)
        HX.EXT_DRAW_BUFFERS = HX.GL.getExtension('WEBGL_draw_buffers');
    if (!HX.EXT_DRAW_BUFFERS) console.warn('WEBGL_draw_buffers extension not supported!');
    HX.MaterialPass.NUM_TOTAL_PASS_TYPES = HX.MaterialPass.NUM_PASS_TYPES + (HX.EXT_DRAW_BUFFERS ? 0 : 2);

    HX.EXT_FLOAT_TEXTURES = HX.GL.getExtension('OES_texture_float');
    if (!HX.EXT_FLOAT_TEXTURES) console.warn('OES_texture_float extension not supported!');

    HX.EXT_HALF_FLOAT_TEXTURES = HX.GL.getExtension('OES_texture_half_float');
    if (!HX.EXT_HALF_FLOAT_TEXTURES) console.warn('OES_texture_half_float extension not supported!');

    HX.EXT_FLOAT_TEXTURES_LINEAR = HX.GL.getExtension('OES_texture_float_linear');
    if (!HX.EXT_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_float_linear extension not supported!');

    HX.EXT_HALF_FLOAT_TEXTURES_LINEAR = HX.GL.getExtension('OES_texture_half_float_linear');
    if (!HX.EXT_HALF_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_half_float_linear extension not supported!');

    HX.EXT_DEPTH_TEXTURE = HX.GL.getExtension('WEBGL_depth_texture');
    if (!HX.EXT_DEPTH_TEXTURE) console.warn('WEBGL_depth_texture extension not supported!');

    HX.EXT_STANDARD_DERIVATIVES = HX.GL.getExtension('OES_standard_derivatives');
    if (!HX.EXT_STANDARD_DERIVATIVES) console.warn('OES_standard_derivatives extension not supported!');

    HX.EXT_SHADER_TEXTURE_LOD = HX.GL.getExtension('EXT_shader_texture_lod');
    if (!HX.EXT_SHADER_TEXTURE_LOD) console.warn('EXT_shader_texture_lod extension not supported!');

    HX.EXT_TEXTURE_FILTER_ANISOTROPIC = HX.GL.getExtension('EXT_texture_filter_anisotropic');
    if (!HX.EXT_TEXTURE_FILTER_ANISOTROPIC) console.warn('EXT_texture_filter_anisotropic extension not supported!');

    HX.DEFAULT_TEXTURE_MAX_ANISOTROPY = HX.EXT_TEXTURE_FILTER_ANISOTROPIC? HX.GL.getParameter(HX.EXT_TEXTURE_FILTER_ANISOTROPIC.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;

    if (!HX.EXT_HALF_FLOAT_TEXTURES_LINEAR || !HX.EXT_HALF_FLOAT_TEXTURES) {
        HX.OPTIONS.useHDR = false;
    }

    // shortcuts
    HX.TEXTURE_FILTER = {};
    HX.TEXTURE_FILTER.NEAREST = {min: HX.GL.NEAREST_MIPMAP_NEAREST, mag: HX.GL.NEAREST};
    HX.TEXTURE_FILTER.BILINEAR = {min: HX.GL.LINEAR_MIPMAP_NEAREST, mag: HX.GL.LINEAR};
    HX.TEXTURE_FILTER.TRILINEAR = {min: HX.GL.LINEAR_MIPMAP_LINEAR, mag: HX.GL.LINEAR};
    if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC) {
        HX.TEXTURE_FILTER.TRILINEAR_ANISOTROPIC = {min: HX.GL.LINEAR_MIPMAP_LINEAR, mag: HX.GL.LINEAR};
    }

    HX.TEXTURE_FILTER.NEAREST_NOMIP = { min: HX.GL.NEAREST, mag: HX.GL.NEAREST };
    HX.TEXTURE_FILTER.BILINEAR_NOMIP = { min: HX.GL.LINEAR, mag: HX.GL.LINEAR };

    HX.TEXTURE_WRAP_MODE = {};
    HX.TEXTURE_WRAP_MODE.REPEAT = { s: HX.GL.REPEAT, t: HX.GL.REPEAT };
    HX.TEXTURE_WRAP_MODE.CLAMP = { s: HX.GL.CLAMP_TO_EDGE, t: HX.GL.CLAMP_TO_EDGE };

    // default settings:
    HX.DEFAULT_TEXTURE_WRAP_MODE = HX.TEXTURE_WRAP_MODE.REPEAT;
    HX.DEFAULT_TEXTURE_FILTER = HX.TEXTURE_FILTER.TRILINEAR;

    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);

    HX.DEFAULT_TEXTURE_2D = new HX.Texture2D();
    HX.DEFAULT_TEXTURE_2D.uploadData(data, 1, 1);
    HX.DEFAULT_TEXTURE_2D.setFilter(HX.TEXTURE_FILTER.NEAREST_NOMIP);

    HX.DEFAULT_TEXTURE_CUBE = new HX.TextureCube();
    HX.DEFAULT_TEXTURE_CUBE.uploadData([data, data, data, data, data, data], 1);

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
};

/**
 * Creates a renderer best suited for the given hardware config.
 */
HX.createRenderer = function()
{
    return HX.EXT_DRAW_BUFFERS? new HX.MRTRenderer() : new HX.MultiPassRenderer();
}
/**
 * Initializes Helix and creates a WebGL context from a given canvas
 * @param canvas The canvas to create the gl context from.
 */
HX.initFromCanvas = function(canvas, options)
{
    var context = canvas.getContext('webgl', { antialias:false }) || canvas.getContext('experimental-webgl', { antialias:false });
    HX.initFromContext(context, options);

    if (!HX.GL) throw "WebGL not supported";

    HX.GL.clearColor(0, 0, 0, 1);
};


// convenience methods:

/**
 * Default clearing function. Can be called if no special clearing functionality is needed (or in case another api is used that clears)
 * Otherwise, you can manually clear using GL context.
 */
HX.clear = function()
{
    HX.GL.clear(HX.GL.COLOR_BUFFER_BIT | HX.GL.DEPTH_BUFFER_BIT);
};

HX.unbindTextures = function()
{
    for (var i = 0; i < HX._numActiveTextures; ++i) {
        HX.GL.activeTexture(HX.GL.TEXTURE0 + i);
        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    }

    HX._numActiveTextures = 0;
};

HX.setRenderTarget = function(frameBuffer)
{
    if (frameBuffer) {
        HX.GL.bindFramebuffer(HX.GL.FRAMEBUFFER, frameBuffer._fbo);

        if (frameBuffer._numColorTextures > 1)
            HX.EXT_DRAW_BUFFERS.drawBuffersWEBGL(frameBuffer._drawBuffers);
    }
    else
        HX.GL.bindFramebuffer(HX.GL.FRAMEBUFFER, null);
};

HX.enableAttributes = function(count)
{
    var numActiveAttribs = HX._numActiveAttributes;
    if (numActiveAttribs < count) {
        for (var i = numActiveAttribs; i < count; ++i)
            HX.GL.enableVertexAttribArray(i);
    }
    else if (numActiveAttribs > count) {
        // bug in WebGL/ANGLE? When rendering to a render target, disabling vertex attrib array 1 causes errors when using only up to the index below o_O
        // so for now + 1
        count += 1;
        for (var i = count; i < numActiveAttribs; ++i) {
            HX.GL.disableVertexAttribArray(i);
        }
    }

    HX._numActiveAttributes = 2;
}

HX._init2DDitherTexture = function(width, height)
{
    HX.DEFAULT_2D_DITHER_TEXTURE = new HX.Texture2D();
    var len = width * height;
    var data = [];
    var k = 0;
    var angles = [];

    for (var i = 0; i < len; ++i) {
        angles.push(i / len * Math.PI * 2.0);
    }

    HX.shuffle(angles);

    for (var i = 0; i < len; ++i) {
        var angle = angles[i];
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        // store rotation matrix
        // RGBA:
        data[k++] = cos;
        data[k++] = -sin;
        data[k++] = sin;
        data[k++] = cos;
    }

    HX.DEFAULT_2D_DITHER_TEXTURE.uploadData(new Float32Array(data), width, height, false, HX.GL.RGBA, HX.GL.FLOAT);
    HX.DEFAULT_2D_DITHER_TEXTURE.setFilter(HX.TEXTURE_FILTER.NEAREST_NOMIP);
    HX.DEFAULT_2D_DITHER_TEXTURE.setWrapMode(HX.TEXTURE_WRAP_MODE.REPEAT);
};