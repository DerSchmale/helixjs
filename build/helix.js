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

    // debug-related
    this.debug = false;   // requires webgl-debug.js:
    this.ignoreDrawBuffersExtension = false;     // forces multiple passes for the GBuffer
    this.ignoreDepthTexturesExtension = false;     // forces storing depth info explicitly
    this.ignoreTextureLODExtension = false;     // forces storing depth info explicitly
    this.ignoreHalfFloatTextureExtension = false;     // forces storing depth info explicitly
    this.throwOnShaderError = false;
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
 * Initializes the Helix engine. IMPORTANT! This needs to be called before any other Helix functionality.
 * @param glContext The webgl context to be used by the engine. Helix does not manage its own context, since you may use the context yourself for UI work etc.
 * @param options (optional) An instance of HX.InitOptions
 */
HX.initFromContext = function(glContext, options)
{
    HX.OPTIONS = options || new HX.InitOptions();
    HX.GL = glContext;

    var defines = "";
    if (HX.OPTIONS.useLinearSpace !== false)
        defines += "#define HX_LINEAR_SPACE\n";

    if (!HX.OPTIONS.ignoreDrawBuffersExtension)
        HX.EXT_DRAW_BUFFERS = HX.GL.getExtension('WEBGL_draw_buffers');

    if (!HX.EXT_DRAW_BUFFERS) {
        defines += "#define HX_SEPARATE_GEOMETRY_PASSES\n";
        console.warn('WEBGL_draw_buffers extension not supported!');
    }
    else {
        defines += "#extension GL_EXT_draw_buffers : require\n";
    }

    HX.MaterialPass.NUM_TOTAL_PASS_TYPES = HX.MaterialPass.NUM_PASS_TYPES + (HX.EXT_DRAW_BUFFERS ? 0 : 2);

    HX.EXT_FLOAT_TEXTURES = HX.GL.getExtension('OES_texture_float');
    if (!HX.EXT_FLOAT_TEXTURES) console.warn('OES_texture_float extension not supported!');

    if (!HX.OPTIONS.ignoreHalfFloatTextureExtension)
        HX.EXT_HALF_FLOAT_TEXTURES = HX.GL.getExtension('OES_texture_half_float');
    if (!HX.EXT_HALF_FLOAT_TEXTURES) console.warn('OES_texture_half_float extension not supported!');

    HX.EXT_FLOAT_TEXTURES_LINEAR = HX.GL.getExtension('OES_texture_float_linear');
    if (!HX.EXT_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_float_linear extension not supported!');

    HX.EXT_HALF_FLOAT_TEXTURES_LINEAR = HX.GL.getExtension('OES_texture_half_float_linear');
    if (!HX.EXT_HALF_FLOAT_TEXTURES_LINEAR) console.warn('OES_texture_half_float_linear extension not supported!');

    if (!HX.OPTIONS.ignoreDepthTexturesExtension)
        HX.EXT_DEPTH_TEXTURE = HX.GL.getExtension('WEBGL_depth_texture');

    if (!HX.EXT_DEPTH_TEXTURE) {
        defines += "#define HX_STORE_EXPLICIT_DEPTH\n";
        console.warn('WEBGL_depth_texture extension not supported!');
    }

    HX.EXT_STANDARD_DERIVATIVES = HX.GL.getExtension('OES_standard_derivatives');
    if (!HX.EXT_STANDARD_DERIVATIVES) console.warn('OES_standard_derivatives extension not supported!');

    if (!HX.OPTIONS.ignoreTextureLODExtension)
        HX.EXT_SHADER_TEXTURE_LOD = HX.GL.getExtension('EXT_shader_texture_lod');

    if (!HX.EXT_SHADER_TEXTURE_LOD) console.warn('EXT_shader_texture_lod extension not supported!');

    HX.EXT_TEXTURE_FILTER_ANISOTROPIC = HX.GL.getExtension('EXT_texture_filter_anisotropic');
    if (!HX.EXT_TEXTURE_FILTER_ANISOTROPIC) console.warn('EXT_texture_filter_anisotropic extension not supported!');

    //HX.EXT_SRGB = HX.GL.getExtension('EXT_sRGB');
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
};

/**
 * Initializes Helix and creates a WebGL context from a given canvas
 * @param canvas The canvas to create the gl context from.
 */
HX.initFromCanvas = function(canvas, options)
{
    var webglFlags = {
        antialias:false,
        premultipliedAlpha: false
    };

    var context = canvas.getContext('webgl', webglFlags) || canvas.getContext('experimental-webgl', webglFlags);
    if (options && options.debug) {
        eval("context = WebGLDebugUtils.makeDebugContext(context);");
    }
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
HX.ShaderLibrary['lighting_blinn_phong_full.glsl'] = 'float hx_lightVisibility(in vec3 normal, in vec3 viewDir, float roughness, float nDotL)\n{\n	float nDotV = max(-dot(normal, viewDir), 0.0);\n	// roughness remapping, this is essentially: sqrt(2 * roughness * roughness / PI)\n	// this remaps beckman distribution roughness to SmithSchlick\n	roughness *= .63772;\n	float g1 = nDotV*(1.0 - roughness) + roughness;\n	float g2 = nDotL*(1.0 - roughness) + roughness;\n	return 1.0/(g1*g2);\n}\n\nfloat hx_blinnPhongDistribution(float roughness, vec3 normal, vec3 halfVector)\n{\n	float roughSqr = roughness*roughness;\n	roughSqr *= roughSqr;\n	float halfDotNormal = max(-dot(halfVector, normal), 0.0);\n	// the\n	return pow(halfDotNormal, 2.0/roughSqr - 2.0)/roughSqr;\n}\n\nvoid hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, out vec3 diffuseColor, out vec3 specularColor)\n{\n	float nDotL = max(-dot(lightDir, normal), 0.0);\n	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI\n\n	vec3 halfVector = normalize(lightDir + viewDir);\n\n	float distribution = hx_blinnPhongDistribution(roughness, normal, halfVector);\n\n	float visibility = hx_lightVisibility(normal, lightDir, roughness, nDotL);\n\n	float halfDotLight = dot(halfVector, lightDir);\n	float cosAngle = 1.0 - halfDotLight;\n	// to the 5th power\n	float power = cosAngle*cosAngle;\n	power *= power;\n	power *= cosAngle;\n	vec3 fresnel = specularNormalReflection + (1.0 - specularNormalReflection)*power;\n\n	//approximated fresnel-based energy conservation\n	diffuseColor = irradiance;\n\n	specularColor = .25 * irradiance * fresnel * distribution * visibility;\n}';

HX.ShaderLibrary['lighting_blinn_phong_simple.glsl'] = 'void hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, out vec3 diffuseColor, out vec3 specularColor)\n{\n	float nDotL = max(-dot(lightDir, normal), 0.0);\n	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI\n\n	vec3 halfVector = normalize(lightDir + viewDir);\n\n	highp float roughSqr = roughness*roughness;\n	roughSqr *= roughSqr;\n	highp float halfDotNormal = max(-dot(halfVector, normal), 0.0);\n	highp float distribution = pow(halfDotNormal, 2.0/roughSqr - 2.0)/roughSqr;\n\n	float halfDotLight = dot(halfVector, lightDir);\n	float cosAngle = 1.0 - halfDotLight;\n	// to the 5th power\n	float power = cosAngle*cosAngle;\n	power *= power;\n	power *= cosAngle;\n	vec3 fresnel = specularNormalReflection + (1.0 - specularNormalReflection)*power;\n\n	//approximated fresnel-based energy conservation\n	diffuseColor = irradiance;\n\n	specularColor = .25 * irradiance * fresnel * distribution;\n}';

HX.ShaderLibrary['lighting_ggx.glsl'] = 'float hx_lightVisibility(in vec3 normal, in vec3 viewDir, float roughness, float nDotL)\n{\n	float nDotV = max(-dot(normal, viewDir), 0.0);\n	// roughness remapping, this is essentially: sqrt(2 * roughness * roughness / PI)\n	// this remaps beckman distribution roughness to SmithSchlick\n	roughness *= .63772;\n	float g1 = nDotV*(1.0 - roughness) + roughness;\n	float g2 = nDotL*(1.0 - roughness) + roughness;\n	return 1.0/(g1*g2);\n}\n\nfloat hx_trowbridgeReitz(float roughness, vec3 normal, vec3 halfVector)\n{\n    float roughSqr = roughness*roughness;\n    float halfDotNormal = max(-dot(halfVector, normal), 0.0);\n    float denom = (halfDotNormal * halfDotNormal) * (roughSqr - 1.0) + 1.0;\n    return roughSqr / (denom * denom);\n}\n\nvoid hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, out vec3 diffuseColor, out vec3 specularColor)\n{\n	float nDotL = max(-dot(lightDir, normal), 0.0);\n	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI\n\n	vec3 halfVector = normalize(lightDir + viewDir);\n\n	float distribution = hx_trowbridgeReitzGGX(roughness, normal, halfVector);\n\n	float visibility = hx_lightVisibility(normal, lightDir, roughness, nDotL);\n\n	float halfDotLight = dot(halfVector, lightDir);\n	float cosAngle = 1.0 - halfDotLight;\n	// to the 5th power\n	float power = cosAngle*cosAngle;\n	power *= power;\n	power *= cosAngle;\n	vec3 fresnel = specularNormalReflection + (1.0 - specularNormalReflection)*power;\n\n	//approximated fresnel-based energy conservation\n	diffuseColor = irradiance;\n\n	specularColor = .25 * irradiance * fresnel * distribution * visibility;\n}';

HX.ShaderLibrary['ambient_light_fragment.glsl'] = 'uniform vec3 lightColor;\n\nuniform sampler2D hx_gbufferColor;\n\n#ifdef USE_AO\nuniform sampler2D hx_source;\n#endif\n\nvarying vec2 uv;\n\nvoid main()\n{\n	vec3 colorSample = texture2D(hx_gbufferColor, uv).xyz;\n#ifdef USE_AO\n	float occlusionSample = texture2D(hx_source, uv).w;\n	colorSample *= occlusionSample;\n#endif\n\n	colorSample = hx_gammaToLinear(colorSample);\n\n	gl_FragColor = vec4(lightColor * colorSample, 0.0);\n}';

HX.ShaderLibrary['ambient_light_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	uv = hx_texCoord;\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['directional_light_fragment.glsl'] = '// most stuff is in snippets_directional_lights.glsl\n\nvarying vec2 uv;\nvarying vec3 viewWorldDir;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\n\nvoid main()\n{\n	vec4 colorSample = hx_gammaToLinear(texture2D(hx_gbufferColor, uv));\n	vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n	vec3 normal = hx_decodeNormal(normalSample);\n	vec3 normalSpecularReflectance;\n	float roughness;\n	float metallicness;\n\n	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);\n\n	vec3 normalizedWorldView = normalize(viewWorldDir);\n\n	// hx_calculateLight must be the same for every object\n	vec3 totalReflection = hx_calculateLight(colorSample.xyz, normal, lightWorldDirection, viewWorldDir, normalSpecularReflectance, roughness, metallicness);\n\n	gl_FragColor = vec4(totalReflection, 0.0);\n\n}';

HX.ShaderLibrary['directional_light_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec3 viewWorldDir;\n\n#ifdef CAST_SHADOWS\nuniform mat4 hx_inverseProjectionMatrix;\nuniform mat4 hx_cameraWorldMatrix;\n#else\nuniform mat4 hx_inverseViewProjectionMatrix;\nuniform vec3 hx_cameraWorldPosition;\n#endif\n\nvoid main()\n{\n	uv = hx_texCoord;\n	#ifdef CAST_SHADOWS\n		vec4 unproj = hx_inverseProjectionMatrix * vec4(hx_position.xy, 0.0, 1.0);\n		vec3 viewDir = unproj.xyz / unproj.w;\n		viewDir /= viewDir.z;\n		viewWorldDir = mat3(hx_cameraWorldMatrix) * viewDir;\n	#else\n		vec4 unproj = hx_inverseViewProjectionMatrix * vec4(hx_position.xy, 0.0, 1.0);\n		unproj /= unproj.w;\n		viewWorldDir = unproj.xyz - hx_cameraWorldPosition;\n	#endif\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['global_irradiance_probe_fragment.glsl'] = 'varying vec3 viewWorldDir;\nvarying vec2 uv;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\n#ifdef USE_AO\nuniform sampler2D hx_source;\n#endif\n\nuniform samplerCube irradianceProbeSampler;\n\nvoid main()\n{\n	vec4 colorSample = texture2D(hx_gbufferColor, uv);\n	vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n\n	colorSample = hx_gammaToLinear(colorSample);\n\n	vec3 normal = hx_decodeNormal(normalSample);\n	vec3 totalLight = vec3(0.0);\n\n\n	#ifdef USE_AO\n		vec4 occlusionSample = texture2D(hx_source, uv);\n		colorSample.xyz *= occlusionSample.w;\n	#endif\n	vec4 irradianceSample = textureCube(irradianceProbeSampler, normal);\n	irradianceSample = hx_gammaToLinear(irradianceSample);\n	irradianceSample.xyz *= (1.0 - specularSample.z);\n	totalLight += irradianceSample.xyz * colorSample.xyz;\n\n	gl_FragColor = vec4(totalLight, 1.0);\n}';

HX.ShaderLibrary['global_irradiance_probe_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nuniform mat4 hx_inverseViewProjectionMatrix;\nuniform vec3 hx_cameraWorldPosition;\n\nvarying vec3 viewWorldDir;\nvarying vec2 uv;\n\n// using rect mesh for rendering skyboxes!\nvoid main()\n{\n	vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;\n	viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;\n	viewWorldDir.y = viewWorldDir.y;\n	vec4 pos = hx_position;\n	pos.z = 1.0;\n	gl_Position = pos;\n	uv = hx_texCoord;\n}';

HX.ShaderLibrary['global_specular_probe_fragment.glsl'] = 'varying vec3 viewWorldDir;\nvarying vec2 uv;\n\nuniform samplerCube specularProbeSampler;\nuniform float numMips;\nuniform float mipOffset;\nuniform float maxMipFactor;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\n\nvoid main()\n{\n	vec4 colorSample = texture2D(hx_gbufferColor, uv);\n	vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n	vec3 normal = hx_decodeNormal(normalSample);\n	vec3 totalLight = vec3(0.0);\n	colorSample = hx_gammaToLinear(colorSample);\n\n	vec3 reflectedViewDir = reflect(normalize(viewWorldDir), normal);\n	vec3 normalSpecularReflectance;\n	float roughness;\n	float metallicness;\n	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);\n	#ifdef USE_TEX_LOD\n	// knald method:\n		float power = 2.0/(roughness * roughness) - 2.0;\n		float factor = (exp2(-10.0/sqrt(power)) - K0)/K1;\n		float mipLevel = numMips*(1.0 - clamp(factor/maxMipFactor, 0.0, 1.0));\n		vec4 specProbeSample = textureCubeLodEXT(specularProbeSampler, reflectedViewDir, mipLevel);\n	#else\n		vec4 specProbeSample = textureCube(specularProbeSampler, reflectedViewDir);\n	#endif\n	specProbeSample = hx_gammaToLinear(specProbeSample);\n	vec3 fresnel = hx_fresnel(normalSpecularReflectance, reflectedViewDir, normal);\n	// not physically correct, but attenuation is required to look good\n	float attenuation = mix(1.0 - roughness, 1.0, metallicness);\n	fresnel *= attenuation;\n	totalLight += fresnel * specProbeSample.xyz;\n\n	gl_FragColor = vec4(totalLight, 1.0);\n}';

HX.ShaderLibrary['global_specular_probe_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nuniform mat4 hx_inverseViewProjectionMatrix;\nuniform vec3 hx_cameraWorldPosition;\n\nvarying vec3 viewWorldDir;\nvarying vec2 uv;\n\nvoid main()\n{\n	vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;\n	viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;\n	viewWorldDir.y = viewWorldDir.y;\n	vec4 pos = hx_position;\n	pos.z = 1.0;\n	gl_Position = pos;\n	uv = hx_texCoord;\n}';

HX.ShaderLibrary['point_light_fullscreen_fragment.glsl'] = 'varying vec2 uv;\nvarying vec3 viewWorldDir;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\nuniform sampler2D hx_gbufferDepth;\n\nuniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\nuniform vec3 hx_cameraWorldPosition;\n\nuniform vec3 lightColor[LIGHTS_PER_BATCH];\nuniform vec3 lightWorldPosition[LIGHTS_PER_BATCH];\nuniform vec2 attenuationFixFactors[LIGHTS_PER_BATCH];\n\nvoid main()\n{\n	vec4 colorSample = hx_gammaToLinear(texture2D(hx_gbufferColor, uv));\n	vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n	vec3 normal = hx_decodeNormal(normalSample);\n	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n	vec3 normalSpecularReflectance;\n	float roughness;\n	float metallicness;\n\n	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);\n\n	float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n	vec3 worldPosition = hx_cameraWorldPosition + absViewZ * viewWorldDir;\n\n	vec3 viewDir = normalize(viewWorldDir);\n\n\n	vec3 totalDiffuse = vec3(0.0);\n	vec3 totalSpecular = vec3(0.0);\n	vec3 diffuseReflection;\n	vec3 specularReflection;\n\n	for (int i = 0; i < LIGHTS_PER_BATCH; ++i) {\n		vec3 lightWorldDirection = worldPosition - lightWorldPosition[i];\n		float attenuation = 1.0/dot(lightWorldDirection, lightWorldDirection);\n		/* normalize:*/\n		lightWorldDirection *= sqrt(attenuation);\n\n		/*rescale attenuation so that irradiance at bounding edge really is 0*/\n		attenuation = max(0.0, (attenuation - attenuationFixFactors[i].x) * attenuationFixFactors[i].y);\n		hx_lighting(normal, lightWorldDirection, viewDir, lightColor[i] * attenuation, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);\n		totalDiffuse += diffuseReflection;\n		totalSpecular += specularReflection;\n	}\n	totalDiffuse *= colorSample.xyz * (1.0 - metallicness);\n	gl_FragColor = vec4(totalDiffuse + totalSpecular, 1.0);\n}';

HX.ShaderLibrary['point_light_fullscreen_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec3 viewWorldDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\nuniform mat4 hx_cameraWorldMatrix;\n\nvoid main()\n{\n		uv = hx_texCoord;\n		vec3 frustumVector = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n		viewWorldDir = mat3(hx_cameraWorldMatrix) * frustumVector;\n		gl_Position = hx_position;\n}';

HX.ShaderLibrary['point_light_spherical_fragment.glsl'] = 'varying vec2 uv;\nvarying vec3 viewWorldDir;\nvarying vec3 lightColorVar;\nvarying vec3 lightPositionVar;\nvarying vec2 attenuationFixVar;\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\nuniform sampler2D hx_gbufferDepth;\n\nuniform float hx_cameraFrustumRange;\nuniform vec3 hx_cameraWorldPosition;\n\n\nvoid main()\n{\n	vec4 colorSample = texture2D(hx_gbufferColor, uv);\n	vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n\n	float viewZ = -depth * hx_cameraFrustumRange;\n	vec3 worldPosition = hx_cameraWorldPosition + viewZ * viewWorldDir;\n\n	vec3 normal = hx_decodeNormal(normalSample);\n	colorSample = hx_gammaToLinear(colorSample);\n	vec3 viewDir = -normalize(viewWorldDir);\n\n	vec3 normalSpecularReflectance;\n	float roughness;\n	float metallicness;\n	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);\n	vec3 diffuseReflection;\n	vec3 specularReflection;\n\n	vec3 lightWorldDirection = worldPosition - lightPositionVar;\n	float attenuation = 1.0/dot(lightWorldDirection, lightWorldDirection);\n	/* normalize:*/\n	lightWorldDirection *= sqrt(attenuation);\n\n	/*rescale attenuation so that irradiance at bounding edge really is 0*/\n	attenuation = max(0.0, (attenuation - attenuationFixVar.x) * attenuationFixVar.y);\n	hx_lighting(normal, lightWorldDirection, viewDir, lightColorVar * attenuation, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);\n\n	diffuseReflection *= colorSample.xyz * (1.0 - metallicness);\n	gl_FragColor = vec4(diffuseReflection + specularReflection, 0.0);\n}';

HX.ShaderLibrary['point_light_spherical_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute float hx_instanceID;\n\nuniform mat4 hx_viewMatrix;\nuniform mat4 hx_cameraWorldMatrix;\nuniform mat4 hx_projectionMatrix;\n\nuniform float lightRadius[LIGHTS_PER_BATCH];\nuniform vec3 lightWorldPosition[LIGHTS_PER_BATCH];\nuniform vec3 lightColor[LIGHTS_PER_BATCH];\nuniform vec2 attenuationFixFactors[LIGHTS_PER_BATCH];\n\n\n\nvarying vec2 uv;\nvarying vec3 viewWorldDir;\nvarying vec3 lightColorVar;\nvarying vec3 lightPositionVar;\nvarying vec2 attenuationFixVar;\n\nvoid main()\n{\n	int instance = int(hx_instanceID);\n	vec4 worldPos = hx_position;\n	lightPositionVar = lightWorldPosition[instance];\n	lightColorVar = lightColor[instance];\n	attenuationFixVar = attenuationFixFactors[instance];\n	worldPos.xyz *= lightRadius[instance];\n	worldPos.xyz += lightPositionVar;\n\n	vec4 viewPos = hx_viewMatrix * worldPos;\n	vec4 proj = hx_projectionMatrix * viewPos;\n\n	viewWorldDir = mat3(hx_cameraWorldMatrix) * (viewPos.xyz / viewPos.z);\n\n	/* render as flat disk, prevent clipping */\n	proj /= proj.w;\n	proj.z = 0.0;\n	uv = proj.xy/proj.w * .5 + .5;\n	gl_Position = proj;\n}';

HX.ShaderLibrary['default_geometry_mrt_fragment.glsl'] = '#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(TRANSPARENT_REFRACT)\nvarying vec2 texCoords;\n#endif\n\nvarying vec3 normal;\n\n#ifdef COLOR_MAP\nuniform sampler2D colorMap;\n#else\nuniform vec3 color;\n#endif\n\n#ifdef NORMAL_MAP\nvarying vec3 tangent;\nvarying vec3 bitangent;\n\nuniform sampler2D normalMap;\n#endif\n\nuniform float roughness;\nuniform float specularNormalReflection;\nuniform float metallicness;\n\n#if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP)\nuniform sampler2D specularMap;\n#endif\n\n#ifdef TRANSPARENT_REFRACT\nvarying vec3 viewVector;\n\n// when used as TRANSPARENT_DIFFUSE, hx_source is a copy of the render target:\nuniform sampler2D hx_source;\nuniform sampler2D hx_gbufferDepth;\n\nuniform mat4 hx_projectionMatrix;\nuniform mat4 hx_viewProjectionMatrix;\nuniform vec3 hx_cameraWorldPosition;\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_cameraFrustumRange;\n\nuniform float refractiveRatio;   // the ratio of refractive indices\n#endif\n\nvoid main()\n{\n    vec4 outputColor;\n    #ifdef COLOR_MAP\n        outputColor = texture2D(colorMap, texCoords);\n    #else\n        outputColor = vec4(color, 1.0);\n    #endif\n\n    float metallicnessOut = metallicness;\n    float specNormalReflOut = specularNormalReflection;\n    float roughnessOut = roughness;\n\n    vec3 fragNormal = normal;\n    #ifdef NORMAL_MAP\n        vec4 normalSample = texture2D(normalMap, texCoords);\n        mat3 TBN;\n        TBN[2] = normalize(normal);\n        TBN[0] = normalize(tangent);\n        TBN[1] = normalize(bitangent);\n\n        fragNormal = TBN * (normalSample.xyz * 2.0 - 1.0);\n\n        #ifdef NORMAL_ROUGHNESS_MAP\n            roughnessOut = 1.0 - (1.0 - roughnessOut) * normalSample.w;\n        #endif\n    #endif\n\n    #if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP)\n          vec4 specSample = texture2D(specularMap, texCoords);\n          roughnessOut = 1.0 - (1.0 - roughnessOut) * specularMap.x;\n\n          #ifdef SPECULAR_MAP\n              specNormalReflOut *= specularMap.y;\n              metallicnessOut *= specularMap.z;\n          #endif\n    #endif\n\n    #ifdef TRANSPARENT_REFRACT\n        // use the immediate background depth value for a distance estimate\n        float depth = hx_sampleLinearDepth(hx_gbufferDepth, texCoords);\n\n        // this can be done in vertex shader\n        float viewZ = hx_depthToViewZ(gl_FragCoord.z, hx_projectionMatrix);\n\n        vec3 viewDir = normalize(-viewVector);\n        vec3 refractionVector = refract(viewDir, fragNormal, refractiveRatio);\n        float distance = depth * hx_cameraFrustumRange - viewZ - hx_cameraNearPlaneDistance;\n        vec3 refractedPoint = hx_cameraWorldPosition - viewVector + refractionVector * distance;\n        vec4 samplePos = hx_viewProjectionMatrix * vec4(refractedPoint, 1.0);\n        samplePos.xy = samplePos.xy / samplePos.w * .5 + .5;\n\n        vec4 background = texture2D(hx_source, samplePos.xy);\n        outputColor *= background;\n    #endif\n\n    // todo: should we linearize depth here instead?\n    hx_processGeometry(outputColor, fragNormal, gl_FragCoord.z, metallicnessOut, specNormalReflOut, roughnessOut);\n}';

HX.ShaderLibrary['default_geometry_mrt_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec3 hx_normal;\n\nuniform mat4 hx_wvpMatrix;\nuniform mat3 hx_normalWorldMatrix;\n\nvarying vec3 normal;\n\n#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(TRANSPARENT_REFRACT)\nattribute vec2 hx_texCoord;\nvarying vec2 texCoords;\n#endif\n\n#ifdef TRANSPARENT_REFRACT\nuniform vec3 hx_cameraWorldPosition;\n\nvarying vec3 viewVector;\n#endif\n\n#if defined(TRANSPARENT_REFRACT) || defined(NORMAL_MAP)\nuniform mat4 hx_worldMatrix;\n#endif\n\n#ifdef NORMAL_MAP\nattribute vec4 hx_tangent;\n\nvarying vec3 tangent;\nvarying vec3 bitangent;\n#endif\n\n\nvoid main()\n{\n    gl_Position = hx_wvpMatrix * hx_position;\n    normal = hx_normalWorldMatrix * hx_normal;\n\n#ifdef NORMAL_MAP\n    tangent = mat3(hx_worldMatrix) * hx_tangent.xyz;\n    bitangent = cross(tangent, normal) * hx_tangent.w;\n#endif\n\n#ifdef TRANSPARENT_REFRACT\n    viewVector = hx_cameraWorldPosition - (hx_worldMatrix * hx_position).xyz;\n#endif\n\n#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(TRANSPARENT_REFRACT)\n    texCoords = hx_texCoord;\n#endif\n}';

HX.ShaderLibrary['default_skybox_fragment.glsl'] = 'varying vec3 viewWorldDir;\n\nuniform samplerCube hx_skybox;\n\nvoid main()\n{\n    vec4 color = textureCube(hx_skybox, viewWorldDir);\n    gl_FragColor = hx_gammaToLinear(color);\n}';

HX.ShaderLibrary['default_skybox_vertex.glsl'] = 'attribute vec4 hx_position;\n\nuniform mat4 hx_inverseViewProjectionMatrix;\nuniform vec3 hx_cameraWorldPosition;\n\nvarying vec3 viewWorldDir;\n\n// using 2D quad for rendering skyboxes rather than 3D cube\nvoid main()\n{\n    vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;\n    viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;\n    vec4 pos = hx_position;\n    pos.z = 1.0;\n    gl_Position = pos;\n}';

HX.ShaderLibrary['bloom_blur_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sourceTexture;\n\nuniform float gaussianWeights[NUM_SAMPLES];\n\nvoid main()\n{\n	vec4 total = vec4(0.0);\n	vec2 sampleUV = uv;\n	vec2 stepSize = DIRECTION / SOURCE_RES;\n	float totalWeight = 0.0;\n	for (int i = 0; i < NUM_SAMPLES; ++i) {\n		total += texture2D(sourceTexture, sampleUV) * gaussianWeights[i];\n		sampleUV += stepSize;\n	}\n	gl_FragColor = total;\n}';

HX.ShaderLibrary['bloom_blur_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	uv = hx_texCoord - RADIUS * DIRECTION / SOURCE_RES;\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['bloom_composite_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_source;\nuniform sampler2D bloomTexture;\n\nvoid main()\n{\n	gl_FragColor = texture2D(hx_source, uv) + texture2D(bloomTexture, uv);\n}';

HX.ShaderLibrary['bloom_composite_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	   uv = hx_texCoord;\n	   gl_Position = hx_position;\n}';

HX.ShaderLibrary['bloom_threshold_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_source;\n\nuniform float threshold;\n\nvoid main()\n{\n        vec4 color = texture2D(hx_source, uv);\n        float originalLuminance = .05 + hx_luminance(color);\n        float targetLuminance = max(originalLuminance - threshold, 0.0);\n        gl_FragColor = color * targetLuminance / originalLuminance;\n}\n';

HX.ShaderLibrary['default_post_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	uv = hx_texCoord;\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['fog_fragment.glsl'] = 'varying vec2 uv;\nvarying vec3 viewWorldDir;\n\nuniform vec3 tint;\nuniform float density;\nuniform float startDistance;\nuniform float height;\n\nuniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\nuniform vec3 hx_cameraWorldPosition;\n\nuniform sampler2D hx_source;\nuniform sampler2D hx_gbufferDepth;\n\nvoid main()\n{\n	vec4 color = texture2D(hx_source, uv);\n	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n	// do not fog up skybox\n	if (depth == 1.0) depth = -1.0;\n	float viewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n	vec3 viewDir = viewWorldDir * viewZ;\n	float worldY = viewDir.y + hx_cameraWorldPosition.y;\n	float s = sign(hx_cameraWorldPosition.y - height);\n\n	float ratioUnder = clamp(s * (height - worldY) / abs(viewDir.y), 0.0, 1.0);\n\n	if (hx_cameraWorldPosition.y < height)\n		ratioUnder = 1.0 - ratioUnder;\n\n	float distance = length(viewDir) * ratioUnder;\n\n	distance -= startDistance;\n\n	float fog = clamp(exp2(-distance * density), 0.0, 1.0);\n	color.xyz = mix(tint, color.xyz, fog);\n	gl_FragColor = color;\n}';

HX.ShaderLibrary['fog_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec3 viewWorldDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\nuniform mat4 hx_cameraWorldMatrix;\n\nvoid main()\n{\n	uv = hx_texCoord;\n	vec3 frustumVector = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n	viewWorldDir = mat3(hx_cameraWorldMatrix) * frustumVector;\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['fxaa_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_source;\nuniform vec2 hx_rcpRenderTargetResolution;\nuniform float edgeThreshold;\nuniform float edgeThresholdMin;\nuniform float edgeSharpness;\n\nfloat luminanceHint(vec4 color)\n{\n	return .30/.59 * color.r + color.g;\n}\n\nvoid main()\n{\n	vec4 center = texture2D(hx_source, uv);\n	vec2 halfRes = vec2(hx_rcpRenderTargetResolution.x, hx_rcpRenderTargetResolution.y) * .5;\n	float topLeftLum = luminanceHint(texture2D(hx_source, uv + vec2(-halfRes.x, halfRes.y)));\n	float bottomLeftLum = luminanceHint(texture2D(hx_source, uv + vec2(-halfRes.x, -halfRes.y)));\n	float topRightLum = luminanceHint(texture2D(hx_source, uv + vec2(halfRes.x, halfRes.y)));\n	float bottomRightLum = luminanceHint(texture2D(hx_source, uv + vec2(halfRes.x, -halfRes.y)));\n\n	float centerLum = luminanceHint(center);\n	float minLum = min(min(topLeftLum, bottomLeftLum), min(topRightLum, bottomRightLum));\n	float maxLum = max(max(topLeftLum, bottomLeftLum), max(topRightLum, bottomRightLum));\n	float range = max(centerLum, maxLum) - min(centerLum, minLum);\n	float threshold = max(edgeThresholdMin, maxLum * edgeThreshold);\n	float applyFXAA = range < threshold? 0.0 : 1.0;\n\n	float diagDiff1 = bottomLeftLum - topRightLum;\n	float diagDiff2 = bottomRightLum - topLeftLum;\n	vec2 dir1 = normalize(vec2(diagDiff1 + diagDiff2, diagDiff1 - diagDiff2));\n	vec4 sampleNeg1 = texture2D(hx_source, uv - halfRes * dir1);\n	vec4 samplePos1 = texture2D(hx_source, uv + halfRes * dir1);\n\n	float minComp = min(abs(dir1.x), abs(dir1.y)) * edgeSharpness;\n	vec2 dir2 = clamp(dir1.xy / minComp, -2.0, 2.0) * 2.0;\n	vec4 sampleNeg2 = texture2D(hx_source, uv - hx_rcpRenderTargetResolution * dir2);\n	vec4 samplePos2 = texture2D(hx_source, uv + hx_rcpRenderTargetResolution * dir2);\n	vec4 tap1 = sampleNeg1 + samplePos1;\n	vec4 fxaa = (tap1 + sampleNeg2 + samplePos2) * .25;\n	float fxaaLum = luminanceHint(fxaa);\n	if ((fxaaLum < minLum) || (fxaaLum > maxLum))\n		fxaa = tap1 * .5;\n	gl_FragColor = mix(center, fxaa, applyFXAA);\n}';

HX.ShaderLibrary['hbao_fragment.glsl'] = 'uniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\nuniform vec2 hx_renderTargetResolution;\nuniform vec2 hx_rcpRenderTargetResolution;\nuniform mat4 hx_viewMatrix;\nuniform mat4 hx_projectionMatrix;\n\nuniform int numRays;\nuniform int numSamplesPerRay;\nuniform float strengthPerRay;\nuniform float halfSampleRadius;\nuniform float bias;\nuniform float rcpFallOffDistance;\n\nuniform sampler2D hx_gbufferDepth;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D sampleDirTexture;\nuniform sampler2D ditherTexture;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\nvarying vec3 frustumCorner;\n\nvec3 getViewPos(vec2 sampleUV)\n{\n    float depth = hx_sampleLinearDepth(hx_gbufferDepth, sampleUV);\n    float viewZ = depth * hx_cameraFrustumRange + hx_cameraNearPlaneDistance;\n    vec3 viewPos = frustumCorner * vec3(sampleUV * 2.0 - 1.0, 1.0);\n    return viewPos * viewZ;\n}\n\n// Retrieves the occlusion factor for a particular sample\nfloat getSampleOcclusion(vec2 sampleUV, vec3 centerViewPos, vec3 centerNormal, vec3 tangent, inout float topOcclusion)\n{\n    vec3 sampleViewPos = getViewPos(sampleUV);\n\n    // get occlusion factor based on candidate horizon elevation\n    vec3 horizonVector = sampleViewPos - centerViewPos;\n    float horizonVectorLength = length(horizonVector);\n\n    float occlusion;\n\n    // If the horizon vector points away from the tangent, make an estimate\n    if (dot(tangent, horizonVector) < 0.0)\n        occlusion = .5;\n    else\n        occlusion = dot(centerNormal, horizonVector) / horizonVectorLength;\n\n    // this adds occlusion only if angle of the horizon vector is higher than the previous highest one without branching\n    float diff = max(occlusion - topOcclusion, 0.0);\n    topOcclusion = max(occlusion, topOcclusion);\n\n    // attenuate occlusion contribution using distance function 1 - (d/f)^2\n    float distanceFactor = clamp(horizonVectorLength * rcpFallOffDistance, 0.0, 1.0);\n    distanceFactor = 1.0 - distanceFactor * distanceFactor;\n    return diff * distanceFactor;\n}\n\n// Retrieves the occlusion for a given ray\nfloat getRayOcclusion(vec2 direction, float jitter, vec2 projectedRadii, vec3 centerViewPos, vec3 centerNormal)\n{\n    // calculate the nearest neighbour sample along the direction vector\n    vec2 texelSizedStep = direction * hx_rcpRenderTargetResolution;\n    direction *= projectedRadii;\n\n    // gets the tangent for the current ray, this will be used to handle opposing horizon vectors\n    // Tangent is corrected with respect to face normal by projecting it onto the tangent plane defined by the normal\n    vec3 tangent = getViewPos(uv + texelSizedStep) - centerViewPos;\n    tangent -= dot(centerNormal, tangent) * centerNormal;\n\n    vec2 stepUV = direction.xy / float(NUM_SAMPLES_PER_RAY - 1);\n\n    // jitter the starting position for ray marching between the nearest neighbour and the sample step size\n    vec2 jitteredOffset = mix(texelSizedStep, stepUV, jitter);\n    //stepUV *= 1.0 + jitter * .1;\n    vec2 sampleUV = uv + jitteredOffset;\n\n    // top occlusion keeps track of the occlusion contribution of the last found occluder.\n    // set to bias value to avoid near-occluders\n    float topOcclusion = bias;\n    float occlusion = 0.0;\n\n    // march!\n    for (int step = 0; step < NUM_SAMPLES_PER_RAY; ++step) {\n        occlusion += getSampleOcclusion(sampleUV, centerViewPos, centerNormal, tangent, topOcclusion);\n        sampleUV += stepUV;\n    }\n\n    return occlusion;\n}\n\nvoid main()\n{\n    vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n    vec3 worldNormal = hx_decodeNormal(normalSample);\n    vec3 centerNormal = mat3(hx_viewMatrix) * worldNormal;\n    float centerDepth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n    float viewZ = centerDepth * hx_cameraFrustumRange + hx_cameraNearPlaneDistance;\n    vec3 centerViewPos = viewZ * viewDir;\n\n    vec2 projectedRadii = -halfSampleRadius * vec2(hx_projectionMatrix[0][0], hx_projectionMatrix[1][1]) / centerViewPos.z;\n\n    // do not take more steps than there are pixels\n    float totalOcclusion = 0.0;\n\n    vec2 randomFactors = texture2D(ditherTexture, uv * hx_renderTargetResolution * .25).xy;\n\n    vec2 rayUV = vec2(0.0);\n    for (int i = 0; i < NUM_RAYS; ++i) {\n        rayUV.x = (float(i) + randomFactors.x) / float(NUM_RAYS);\n        vec2 sampleDir = texture2D(sampleDirTexture, rayUV).xy * 2.0 - 1.0;\n        totalOcclusion += getRayOcclusion(sampleDir, randomFactors.y, projectedRadii, centerViewPos, centerNormal);\n    }\n\n    totalOcclusion = 1.0 - clamp(strengthPerRay * totalOcclusion, 0.0, 1.0);\n    gl_FragColor = vec4(totalOcclusion);\n}';

HX.ShaderLibrary['hbao_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\nvarying vec3 frustumCorner;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n    frustumCorner = hx_getLinearDepthViewVector(vec2(1.0, 1.0), hx_inverseProjectionMatrix);\n    gl_Position = hx_position;\n}';

HX.ShaderLibrary['ssao_fragment.glsl'] = 'uniform mat4 hx_projectionMatrix;\nuniform mat4 hx_viewMatrix;\nuniform mat4 hx_cameraWorldMatrix;\nuniform vec2 hx_renderTargetResolution;\nuniform float hx_cameraFrustumRange;\n\nuniform float strengthPerSample;\nuniform float rcpFallOffDistance;\nuniform float sampleRadius;\nuniform vec3 samples[NUM_SAMPLES]; // w contains bias\n\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferDepth;\nuniform sampler2D ditherTexture;\n\nvarying vec2 uv;\n\nvoid main()\n{\n    vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n    vec3 centerNormal = hx_decodeNormal(normalSample);\n    centerNormal = mat3(hx_viewMatrix) * centerNormal.xyz;\n    float centerDepth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n    float totalOcclusion = 0.0;\n    vec3 dither = texture2D(ditherTexture, uv * hx_renderTargetResolution * .25).xyz;\n    vec3 randomPlaneNormal = normalize(dither - .5);\n    float w = -centerDepth * hx_cameraFrustumRange * hx_projectionMatrix[2][3] + hx_projectionMatrix[3][3];\n    vec3 sampleRadii;\n    sampleRadii.x = sampleRadius * .5 * hx_projectionMatrix[0][0] / w;\n    sampleRadii.y = sampleRadius * .5 * hx_projectionMatrix[1][1] / w;\n    sampleRadii.z = sampleRadius;\n\n    for (int i = 0; i < NUM_SAMPLES; ++i) {\n        vec3 sampleOffset = reflect(samples[i], randomPlaneNormal);\n        vec3 normOffset = normalize(sampleOffset);\n        float cosFactor = dot(normOffset, centerNormal);\n        float sign = sign(cosFactor);\n        sampleOffset *= sign;\n        cosFactor *= sign;\n\n        vec3 scaledOffset = sampleOffset * sampleRadii;\n\n        vec2 samplePos = uv + scaledOffset.xy;\n        float occluderDepth = hx_sampleLinearDepth(hx_gbufferDepth, samplePos);\n        float diffZ = (centerDepth - occluderDepth) * hx_cameraFrustumRange;\n\n        // distanceFactor: from 1 to 0, near to far\n        float distanceFactor = clamp(diffZ * rcpFallOffDistance, 0.0, 1.0);\n        distanceFactor = 1.0 - distanceFactor;\n\n        // sampleOcclusion: 1 if occluding, 0 otherwise\n        float sampleOcclusion = float(diffZ > scaledOffset.z);\n        totalOcclusion += sampleOcclusion * distanceFactor * cosFactor;\n\n    }\n    gl_FragColor = vec4(1.0 - totalOcclusion * strengthPerSample);\n}';

HX.ShaderLibrary['tonemap_filmic_fragment.glsl'] = '// This approach is by Jim Hejl and Richard Burgess-Dawson\nvoid main()\n{\n	vec4 color = hx_getToneMapScaledColor();\n	vec3 x = max(vec3(0.0), color.xyz - 0.004);\n	gl_FragColor = vec4((x * (6.2 * x + .5))/(x * (6.2 * x + 1.7) + 0.06), 1.0);\n}';

HX.ShaderLibrary['tonemap_reference_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_source;\n\nvoid main()\n{\n	vec4 color = texture2D(hx_source, uv);\n	float l = log(.001 + hx_luminance(color));\n	gl_FragColor = vec4(l, l, l, 1.0);\n}';

HX.ShaderLibrary['tonemap_reinhard_fragment.glsl'] = 'void main()\n{\n	vec4 color = hx_getToneMapScaledColor();\n	gl_FragColor = color / (1.0 + color);\n}';

HX.ShaderLibrary['copy_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n    // extractChannel comes from a macro\n   gl_FragColor = vec4(extractChannels(texture2D(sampler, uv)));\n}\n';

HX.ShaderLibrary['copy_to_gamma_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n   gl_FragColor = hx_linearToGamma(texture2D(sampler, uv));\n}';

HX.ShaderLibrary['copy_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    gl_Position = hx_position;\n}';

HX.ShaderLibrary['debug_depth_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n   gl_FragColor = vec4(1.0 - hx_sampleLinearDepth(sampler, uv));\n}';

HX.ShaderLibrary['debug_normals_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n   vec4 data = texture2D(sampler, uv);\n   vec3 normal = hx_decodeNormal(data);\n   gl_FragColor = vec4(normal * .5 + .5, 1.0);\n}';

HX.ShaderLibrary['linearize_depth_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\nuniform mat4 hx_projectionMatrix;\nuniform float hx_rcpCameraFrustumRange;\n\nfloat readDepth(sampler2D sampler, vec2 uv)\n{\n	#ifdef HX_STORE_EXPLICIT_DEPTH\n		vec4 data = texture2D(sampler, uv);\n		return abs(hx_RG8ToFloat(data.zw) * 2.0 - 1.0);\n    #else\n    	return texture2D(sampler, uv).x;\n    #endif\n}\n\nvoid main()\n{\n	float depth = readDepth(sampler, uv);\n	float linear = hx_depthToViewZ(depth, hx_projectionMatrix) * hx_rcpCameraFrustumRange;\n	gl_FragColor = hx_floatToRGBA8(linear);\n}';

HX.ShaderLibrary['linearize_depth_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	uv = hx_texCoord;\n	gl_Position = hx_position;\n}';

HX.ShaderLibrary['snippets_directional_light.glsl'] = 'uniform vec3 lightColor;\nuniform vec3 lightWorldDirection;\n\n#ifdef CAST_SHADOWS\n	uniform sampler2D hx_gbufferDepth;\n	uniform sampler2D shadowMap;\n\n	uniform float hx_cameraFrustumRange;\n	uniform float hx_cameraWorldPosition;\n\n	uniform mat4 shadowMapMatrices[NUM_CASCADES];\n	uniform float splitDistances[NUM_CASCADES];\n	uniform float depthBias;\n\n	#if NUM_SHADOW_SAMPLES > 1\n		uniform vec2 hx_dither2DTextureScale;\n\n		uniform vec2 shadowMapSoftnesses[NUM_CASCADES];\n		uniform vec2 hx_poissonDisk[NUM_SHADOW_SAMPLES];\n	#endif\n\n	// view-space position\n	#if NUM_SHADOW_SAMPLES > 1\n	void getShadowMapCoord(in vec3 worldPos, in float viewZ, out vec4 coord, out vec2 softness)\n	#else\n	void getShadowMapCoord(in vec3 worldPos, in float viewZ, out vec4 coord)\n	#endif\n	{\n		mat4 shadowMapMatrix = shadowMapMatrices[NUM_CASCADES - 1];\n\n		for (int i = 0; i < NUM_CASCADES - 1; ++i) {\n			if (viewZ < splitDistances[i]) {\n				shadowMapMatrix = shadowMapMatrices[i];\n				#if NUM_SHADOW_SAMPLES > 1\n					softness = shadowMapSoftnesses[i];\n				#endif\n				break;\n			}\n		}\n		coord = shadowMapMatrix * vec4(worldPos, 1.0);\n	}\n#endif\n\n\n// all hx_calculateLight functions need to be the same\nvec3 hx_calculateLight(vec3 diffuseAlbedo, vec3 normal, vec3 lightDir, vec3 worldViewVector, vec3 normalSpecularReflectance, float roughness, float metallicness)\n{\n// not sure what this is about?\n	#ifdef CAST_SHADOWS\n		normal = -normal;\n	#endif\n\n// start extractable code (for fwd)\n	vec3 diffuseReflection;\n	vec3 specularReflection;\n\n	hx_lighting(normal, lightDir, worldViewVector, lightColor, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);\n\n	diffuseReflection *= diffuseAlbedo * (1.0 - metallicness);\n	vec3 totalReflection = diffuseReflection + specularReflection;\n\n	#ifdef CAST_SHADOWS\n		float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n		float viewZ = -depth * hx_cameraFrustumRange;\n		vec3 worldPos = hx_cameraWorldPosition + viewZ * worldViewVector;\n\n		vec4 shadowMapCoord;\n		#if NUM_SHADOW_SAMPLES > 1\n			vec2 radii;\n			getShadowMapCoord(worldPos, -viewZ, shadowMapCoord, radii);\n			float shadowTest = 0.0;\n			vec4 dither = texture2D(hx_dither2D, uv * hx_dither2DTextureScale);\n			dither *= radii.xxyy;  // add radius scale\n			for (int i = 0; i < NUM_SHADOW_SAMPLES; ++i) {\n				vec2 offset;\n				offset.x = dot(dither.xy, hx_poissonDisk[i]);\n				offset.y = dot(dither.zw, hx_poissonDisk[i]);\n				float shadowSample = texture2D(shadowMap, shadowMapCoord.xy + offset).x;\n				float diff = shadowMapCoord.z - shadowSample;\n				if (diff < depthBias) diff = -1.0;\n				shadowTest += float(diff < 0.0);\n			}\n			shadowTest /= float(NUM_SHADOW_SAMPLES);\n\n		#else\n			getShadowMapCoord(worldPos, -viewZ, shadowMapCoord);\n			float shadowSample = texture2D(shadowMap, shadowMapCoord.xy).x;\n			float diff = shadowMapCoord.z - shadowSample;\n			if (diff < .005) diff = -1.0;\n			float shadowTest = float(diff < 0.0);\n		#endif\n		totalReflection *= shadowTest;\n\n	#endif\n\n    return totalReflection;\n}';

HX.ShaderLibrary['snippets_general.glsl'] = '#if defined(NO_MRT_GBUFFER_COLOR)\n#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = color)\n#elif defined(NO_MRT_GBUFFER_NORMALS)\n#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = hx_encodeNormalDepth(normal, depth))\n#elif defined(NO_MRT_GBUFFER_SPECULAR)\n#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = hx_encodeSpecularData(metallicness, specularNormalReflection, roughness))\n#else\n#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) hx_processGeometryMRT(color, normal, depth, metallicness, specularNormalReflection, roughness, gl_FragData[0], gl_FragData[1], gl_FragData[2])\n#endif\n\n// see Aras\' blog post: http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/\n// Only for 0 - 1\nvec4 hx_floatToRGBA8(float value)\n{\n    vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * value;\n    enc = fract(enc);\n    return enc - enc.yzww * vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);\n}\n\nfloat hx_RGBA8ToFloat(vec4 rgba)\n{\n    return dot(rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));\n}\n\nvec2 hx_floatToRG8(float value)\n{\n    vec2 enc = vec2(1.0, 255.0) * value;\n    enc = fract(enc);\n    enc.x -= enc.y / 255.0;\n    return enc;\n}\n\nfloat hx_RG8ToFloat(vec2 rg)\n{\n    return dot(rg, vec2(1.0, 1.0/255.0));\n}\n\nvec4 hx_encodeNormalDepth(vec3 normal, float depth)\n{\n	#ifdef HX_STORE_EXPLICIT_DEPTH\n    	vec4 data;\n    	// xy contain normal\n		data.xy = normal.xy * .5 + .5;\n		// use some of the depth precision to encode store normal sign\n		data.zw = hx_floatToRG8(depth * sign(normal.z) * .5 + .5);\n		return data;\n	#else\n		return vec4(normal * .5 + .5, 1.0);\n    #endif\n}\n\nvec3 hx_decodeNormal(vec4 data)\n{\n    #ifdef HX_STORE_EXPLICIT_DEPTH\n    	vec3 normal;\n    	normal.xy = data.xy * 2.0 - 1.0;\n		normal.z = sqrt(1.0 - dot(normal.xy, normal.xy));\n		float depth = hx_RG8ToFloat(data.zw) * 2.0 - 1.0;\n		normal.z *= sign(depth);\n		return normal;\n    #else\n    	return normalize(data.xyz - .5);\n    #endif\n}\n\nvec4 hx_encodeSpecularData(float metallicness, float specularNormalReflection, float roughness)\n{\n	return vec4(roughness, specularNormalReflection * 5.0, metallicness, 1.0);\n}\n\nvoid hx_processGeometryMRT(vec4 color, vec3 normal, float depth, float metallicness, float specularNormalReflection, float roughness, out vec4 colorData, out vec4 normalData, out vec4 specularData)\n{\n    colorData = color;\n	normalData = hx_encodeNormalDepth(normal, depth);\n    specularData = hx_encodeSpecularData(metallicness, specularNormalReflection, roughness);\n}\n\nvec4 hx_gammaToLinear(vec4 color)\n{\n    #ifdef HX_LINEAR_SPACE\n        color.x = pow(color.x, 2.2);\n        color.y = pow(color.y, 2.2);\n        color.z = pow(color.z, 2.2);\n    #endif\n    return color;\n}\n\nvec3 hx_gammaToLinear(vec3 color)\n{\n    #ifdef HX_LINEAR_SPACE\n        color.x = pow(color.x, 2.2);\n        color.y = pow(color.y, 2.2);\n        color.z = pow(color.z, 2.2);\n    #endif\n    return color;\n}\n\nvec4 hx_linearToGamma(vec4 linear)\n{\n    #ifdef HX_LINEAR_SPACE\n        linear.x = pow(linear.x, 0.45);\n        linear.y = pow(linear.y, 0.45);\n        linear.z = pow(linear.z, 0.45);\n    #endif\n    return linear;\n}\n\nvec3 hx_linearToGamma(vec3 linear)\n{\n    #ifdef HX_LINEAR_SPACE\n        linear.x = pow(linear.x, 0.45);\n        linear.y = pow(linear.y, 0.45);\n        linear.z = pow(linear.z, 0.45);\n    #endif\n    return linear;\n}\n\nfloat hx_sampleLinearDepth(sampler2D tex, vec2 uv)\n{\n    return hx_RGBA8ToFloat(texture2D(tex, uv));\n}\n\nvec3 hx_getFrustumVector(vec2 position, mat4 unprojectionMatrix)\n{\n    vec4 unprojNear = unprojectionMatrix * vec4(position, -1.0, 1.0);\n    vec4 unprojFar = unprojectionMatrix * vec4(position, 1.0, 1.0);\n    return unprojFar.xyz/unprojFar.w - unprojNear.xyz/unprojNear.w;\n}\n\nvec3 hx_getLinearDepthViewVector(vec2 position, mat4 unprojectionMatrix)\n{\n    vec4 unproj = unprojectionMatrix * vec4(position, 0.0, 1.0);\n    unproj /= unproj.w;\n    return -unproj.xyz / unproj.z;\n}\n\n// THIS IS FOR NON_LINEAR DEPTH!\nfloat hx_depthToViewZ(float depthSample, mat4 projectionMatrix)\n{\n    return -projectionMatrix[3][2] / (depthSample * 2.0 - 1.0 + projectionMatrix[2][2]);\n}\n\n\nvec3 hx_getNormalSpecularReflectance(float metallicness, float insulatorNormalSpecularReflectance, vec3 color)\n{\n    return mix(vec3(insulatorNormalSpecularReflectance), color, metallicness);\n}\n\n// for use when sampling gbuffer data for lighting\nvoid hx_decodeReflectionData(in vec4 colorSample, in vec4 specularSample, out vec3 normalSpecularReflectance, out float roughness, out float metallicness)\n{\n    //prevent from being 0\n    roughness = clamp(specularSample.x, .01, 1.0);\n	metallicness = specularSample.z;\n    normalSpecularReflectance = mix(vec3(specularSample.y * .2), colorSample.xyz, metallicness);\n}\n\nvec3 hx_fresnel(vec3 normalSpecularReflectance, vec3 lightDir, vec3 halfVector)\n{\n    float cosAngle = 1.0 - max(dot(halfVector, lightDir), 0.0);\n    // to the 5th power\n    float power = pow(cosAngle, 5.0);\n    return normalSpecularReflectance + (1.0 - normalSpecularReflectance) * power;\n}\n\nfloat hx_luminance(vec4 color)\n{\n    return dot(color.xyz, vec3(.30, 0.59, .11));\n}\n\nfloat hx_luminance(vec3 color)\n{\n    return dot(color, vec3(.30, 0.59, .11));\n}\n\n';

HX.ShaderLibrary['snippets_tonemap.glsl'] = 'varying vec2 uv;\n\n#ifdef ADAPTIVE\nuniform sampler2D hx_luminanceMap;\nuniform float hx_luminanceMipLevel;\n#endif\n\nuniform float hx_exposure;\n\nuniform sampler2D hx_source;\n\n\nvec4 hx_getToneMapScaledColor()\n{\n    #ifdef ADAPTIVE\n    float referenceLuminance = exp(texture2DLodEXT(hx_luminanceMap, uv, hx_luminanceMipLevel).x);\n	float key = 1.03 - (2.0 / (2.0 + log(referenceLuminance + 1.0)/log(10.0)));\n	float exposure = key / referenceLuminance * hx_exposure;\n	#else\n	float exposure = hx_exposure;\n	#endif\n    return texture2D(hx_source, uv) * exposure;\n}';

/**
 * Creates a new Float2 object
 * @class
 * @constructor
 */
HX.Float2 = function(x, y)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
};


/**
 * Returns the angle between two vectors
 */
HX.Float2.angle = function(a, b)
{
    return Math.acos(HX.dot2(a, b) / (a.length() * b.length()));
};

HX.Float2.distance = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Returns the angle between two vectors, assuming they are normalized
 */
HX.Float2.angleNormalized = function(a, b)
{
    return Math.acos(HX.dot2(a, b));
};

HX.Float2.sum = function(a, b)
{
    return new HX.Float2(
        a.x + b.x,
        a.y + b.y
    );
};

HX.Float2.scale = function(a, s)
{
    return new HX.Float2(
        a.x * s,
        a.y * s
    );
}

HX.Float2.prototype = {
    constructor: HX.Float2,

    set: function(x, y)
    {
        this.x = x;
        this.y = y;
    },

    lengthSqr: function()
    {
        return this.x * this.x + this.y * this.y;
    },

    length: function()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    normalize: function()
    {
        var rcpLength = 1.0/this.length();
        this.x *= rcpLength;
        this.y *= rcpLength;
    },

    clone: function()
    {
        return new HX.Float2(this.x, this.y);
    },

    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
    },

    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
    },

    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
    },

    sum: function(a, b)
    {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
    },

    difference: function(a, b)
    {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
    },

    scaled: function(s, a)
    {
        this.x = s*a.x;
        this.y = s*a.y;
    },

    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
    },

    /**
     * Component-wise multiplication
     */
    multiply: function(v)
    {
        this.x *= v.x;
        this.y *= v.y;
    },

    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
    },

    lerp: function(a, b, t)
    {
        var ax = a.x, ay = a.y;

        this.x = ax + (b.x - ax) * factor;
        this.y = ay + (b.y - ay) * factor;
    },

    fromPolarCoordinates: function(radius, angle)
    {
        this.x = radius*Math.cos(angle);
        this.y = radius*Math.sin(angle);
    },

    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
    },

    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
    },

    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
    }
}

HX.Float2.ZERO = new HX.Float2(0, 0);
HX.Float2.X_AXIS = new HX.Float2(1, 0);
HX.Float2.Y_AXIS = new HX.Float2(0, 1);
HX.PlaneSide = {
    FRONT: 1,
    BACK: -1,
    INTERSECTING: 0
};

/**
 * Creates a new Float4 object, which can be used as a vector (w = 0), a point (w = 1) or a homogeneous coordinate.
 * @class
 * @constructor
 */
HX.Float4 = function(x, y, z, w)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w === undefined? 1 : w;
}


/**
 * Returns the angle between two vectors
 */
HX.Float4.angle = function(a, b)
{
    return Math.acos(HX.dot3(a, b) / (a.length() * b.length()));
};

HX.Float4.distance = function(a, b)
{
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Returns the angle between two vectors, assuming they are normalized
 */
HX.Float4.angleNormalized = function(a, b)
{
    return Math.acos(HX.dot3(a, b));
};

HX.Float4.sum = function(a, b)
{
    return new HX.Float4(
            a.x + b.x,
            a.y + b.y,
            a.z + b.z,
            a.w + b.w
    );
};

HX.Float4.scale = function(a, s)
{
    return new HX.Float4(
        a.x * s,
        a.y * s,
        a.z * s,
        a.w * s
    );
}

HX.Float4.prototype = {
    constructor: HX.Float4,

    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    },

    lengthSqr: function()
    {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    },

    length: function()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },

    normalize: function()
    {
        var rcpLength = 1.0/this.length();
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
    },

    normalizeAsPlane: function()
    {
        var rcpLength = 1.0/this.length();
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
        this.w *= rcpLength;
    },

    clone: function()
    {
        return new HX.Float4(this.x, this.y, this.z, this.w);
    },

    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
    },

    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
    },

    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
    },

    sum: function(a, b)
    {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
        this.z = a.z + b.z;
        this.w = a.w + b.w;
    },

    difference: function(a, b)
    {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
        this.w = a.w - b.w;
    },

    scaled: function(s, a)
    {
        this.x = s*a.x;
        this.y = s*a.y;
        this.z = s*a.z;
        this.w = s*a.w;
    },

    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
    },

    /**
     * Component-wise multiplication
     */
    multiply: function(v)
    {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        this.w *= v.w;
    },

    /**
     * Project to carthesian 3D space by dividing by w
     */
    homogeneousProject: function()
    {
        var rcpW = 1.0/w;
        this.x *= rcpW;
        this.y *= rcpW;
        this.z *= rcpW;
        this.w = 1.0;
    },

    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);
        this.w = Math.abs(this.w);
    },

    cross: function(a, b)
    {
        // safe to use self as parameter
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;

        this.x = ay*bz - az*by;
        this.y = az*bx - ax*bz;
        this.z = ax*by - ay*bx;
    },

    lerp: function(a, b, factor)
    {
        var ax = a.x, ay = a.y, az = a.z, aw = a.w;

        this.x = ax + (b.x - ax) * factor;
        this.y = ay + (b.y - ay) * factor;
        this.z = az + (b.z - az) * factor;
        this.w = aw + (b.w - aw) * factor;
    },

    fromSphericalCoordinates: function(radius, azimuthalAngle, polarAngle)
    {
        this.x = radius*Math.sin(polarAngle)*Math.cos(azimuthalAngle);
        this.y = radius*Math.cos(polarAngle);
        this.z = radius*Math.sin(polarAngle)*Math.sin(azimuthalAngle);
        this.w = 0.0;
    },

    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.w = b.w;
    },

    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
        if (b.w > this.w) this.w = b.w;
    },

    maximize3: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
    },

    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
        if (b.w < this.w) this.w = b.w;
    },

    minimize3: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
    }
}

HX.Float4.ORIGIN_POINT = new HX.Float4(0, 0, 0, 1);
HX.Float4.ZERO = new HX.Float4(0, 0, 0, 0);
HX.Float4.X_AXIS = new HX.Float4(1, 0, 0, 0);
HX.Float4.Y_AXIS = new HX.Float4(0, 1, 0, 0);
HX.Float4.Z_AXIS = new HX.Float4(0, 0, 1, 0);
HX.Gaussian =
{
    estimateGaussianRadius: function (variance, epsilon)
    {
        return Math.sqrt(-2.0 * variance * Math.log(epsilon));
    }
};

HX.CenteredGaussianCurve = function(variance)
{
    this._amplitude = 1.0 / Math.sqrt(2.0 * variance * Math.PI);
    this._expScale = -1.0 / (2.0 * variance);
};

HX.CenteredGaussianCurve.prototype =
{
    getValueAt: function(x)
    {
        return this._amplitude * Math.pow(Math.E, x*x*this._expScale);
    }
};

HX.CenteredGaussianCurve.fromRadius = function(radius, epsilon)
{
    epsilon = epsilon || .01;
    var standardDeviation = radius / Math.sqrt(-2.0 * Math.log(epsilon));
    return new HX.CenteredGaussianCurve(standardDeviation*standardDeviation);
};
/**
 * Calculates the vector dot product for any object with x y and z, ignoring the w-component.
 */
HX.dot2 = function(a, b)
{
    return a.x * b.x + a.y * b.y;
};

/**
 * Calculates the vector dot product for any object with x y and z, ignoring the w-component.
 */
HX.dot3 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z;
};

/**
 * Calculates the full 4-component dot product.
 */
HX.dot4 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
};

HX.clamp = function(value, min, max)
{
    return  value < min?    min :
            value > max?    max :
                            value;
};

HX.saturate = function(value)
{
    return HX.clamp(value, 0.0, 1.0);
};
/**
 * Creates a new Matrix4x4 object
 * @class
 * @constructor
 */
// row-major order of passing
HX.Matrix4x4 = function (m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33)
{
    this._m = new HX.TypedArray(16);

    this._m[0] = m00 === undefined ? 1 : 0;
    this._m[1] = m10 || 0;
    this._m[2] = m20 || 0;
    this._m[3] = m30 || 0;
    this._m[4] = m01 || 0;
    this._m[5] = m11 === undefined ? 1 : 0;
    this._m[6] = m21 || 0;
    this._m[7] = m31 || 0;
    this._m[8] = m02 || 0;
    this._m[9] = m12 || 0;
    this._m[10] = m22 === undefined ? 1 : 0;
    this._m[11] = m32 || 0;
    this._m[12] = m03 || 0;
    this._m[13] = m13 || 0;
    this._m[14] = m23 || 0;
    this._m[15] = m33 === undefined ? 1 : 0;
};

HX.Matrix4x4.prototype = {
    constructor: HX.Matrix4x4,

    /**
     * Transforms a Float4 object (use for homogeneous general case of Float4)
     */
    transform: function (v)
    {
        var x = v.x, y = v.y, z = v.z, w = v.w;

        return new HX.Float4(
                this._m[0] * x + this._m[4] * y + this._m[8] * z + this._m[12] * w,
                this._m[1] * x + this._m[5] * y + this._m[9] * z + this._m[13] * w,
                this._m[2] * x + this._m[6] * y + this._m[10] * z + this._m[14] * w,
                this._m[3] * x + this._m[7] * y + this._m[11] * z + this._m[15] * w
        );
    },

    /**
     * Transforms a Float4 object, treating it as a point. Slightly faster than transform for points.
     */
    transformPoint: function (v)
    {
        var x = v.x, y = v.y, z = v.z;

        return new HX.Float4(
                this._m[0] * x + this._m[4] * y + this._m[8] * z + this._m[12],
                this._m[1] * x + this._m[5] * y + this._m[9] * z + this._m[13],
                this._m[2] * x + this._m[6] * y + this._m[10] * z + this._m[14],
                1.0
        );
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation). Slightly faster than transform for vectors.
     */
    transformVector: function (v)
    {
        var x = v.x, y = v.y, z = v.z;

        return new HX.Float4(
                this._m[0] * x + this._m[4] * y + this._m[8] * z,
                this._m[1] * x + this._m[5] * y + this._m[9] * z,
                this._m[2] * x + this._m[6] * y + this._m[10] * z,
                0.0
        );
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation) containing a size (so always abs)! Slightly faster than transform for vectors.
     */
    transformExtent: function (v)
    {
        var x = v.x, y = v.y, z = v.z;

        var m00 = this._m[0], m10 = this._m[1], m20 = this._m[2];
        var m01 = this._m[4], m11 = this._m[5], m21 = this._m[6];
        var m02 = this._m[8], m12 = this._m[9], m22 = this._m[10];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;

        return new HX.Float4(
            m00 * x + m01 * y + m02 * z,
            m10 * x + m11 * y + m12 * z,
            m20 * x + m21 * y + m22 * z,
            0.0
        );
    },

    /**
     * Transforms a Float4 object (use for homogeneous general case of Float4)
     */
    transformTo: function (v, target)
    {
        var x = v.x, y = v.y, z = v.z, w = v.w;

        var tx = this._m[0] * x + this._m[4] * y + this._m[8] * z + this._m[12] * w;
        var ty = this._m[1] * x + this._m[5] * y + this._m[9] * z + this._m[13] * w;
        var tz = this._m[2] * x + this._m[6] * y + this._m[10] * z + this._m[14] * w;
        var tw = this._m[3] * x + this._m[7] * y + this._m[11] * z + this._m[15] * w;
        target.x = tx;
        target.y = ty;
        target.z = tz;
        target.w = tw;
    },

    /**
     * Transforms a Float4 object, treating it as a point. Slightly faster than transform for points.
     */
    transformPointTo: function (v, target)
    {
        var x = v.x, y = v.y, z = v.z, w = v.w;

        var tx = this._m[0] * x + this._m[4] * y + this._m[8] * z + this._m[12];
        var ty = this._m[1] * x + this._m[5] * y + this._m[9] * z + this._m[13];
        var tz = this._m[2] * x + this._m[6] * y + this._m[10] * z + this._m[14];
        target.x = tx;
        target.y = ty;
        target.z = tz;
        target.w = 1.0;
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation). Slightly faster than transform for vectors.
     */
    transformVectorTo: function (v, target)
    {
        var x = v.x, y = v.y, z = v.z;

        var tx = m00 * x + m01 * y + m02 * z;
        var ty = m10 * x + m11 * y + m12 * z;
        var tz = m20 * x + m21 * y + m22 * z;

        target.x = tx;
        target.y = ty;
        target.z = tz;
        target.w = 0.0;
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation) containing a size! Slightly faster than transform for vectors.
     */
    transformExtentTo: function (v, target)
    {
        var x = v.x, y = v.y, z = v.z;

        var m00 = this._m[0], m10 = this._m[1], m20 = this._m[2];
        var m01 = this._m[4], m11 = this._m[5], m21 = this._m[6];
        var m02 = this._m[8], m12 = this._m[9], m22 = this._m[10];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;

        target.x = m00 * x + m01 * y + m02 * z;
        target.y = m10 * x + m11 * y + m12 * z;
        target.z = m20 * x + m21 * y + m22 * z;
        target.w = 0.0;
    },

    copyFrom: function(m)
    {
        this._m[0] = m._m[0];
        this._m[1] = m._m[1];
        this._m[2] = m._m[2];
        this._m[3] = m._m[3];
        this._m[4] = m._m[4];
        this._m[5] = m._m[5];
        this._m[6] = m._m[6];
        this._m[7] = m._m[7];
        this._m[8] = m._m[8];
        this._m[9] = m._m[9];
        this._m[10] = m._m[10];
        this._m[11] = m._m[11];
        this._m[12] = m._m[12];
        this._m[13] = m._m[13];
        this._m[14] = m._m[14];
        this._m[15] = m._m[15];
    },

    fromQuaternion: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;

        this._m[0] = 1 - 2 * (y * y + z * z);
        this._m[1] = 2 * (x * y + w * z);
        this._m[2] = 2 * (x * z - w * y);
        this._m[3] = 0;
        this._m[4] = 2 * (x * y - w * z);
        this._m[5] = 1 - 2 * (x * x + z * z);
        this._m[6] = 2 * (y * z + w * x);
        this._m[7] = 0;
        this._m[8] = 2 * (x * z + w * y);
        this._m[9] = 2 * (y * z - w * x);
        this._m[10] = 1 - 2 * (x * x + y * y);
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    product: function (a, b)
    {
        var a_m00 = a._m[0], a_m10 = a._m[1], a_m20 = a._m[2], a_m30 = a._m[3];
        var a_m01 = a._m[4], a_m11 = a._m[5], a_m21 = a._m[6], a_m31 = a._m[7];
        var a_m02 = a._m[8], a_m12 = a._m[9], a_m22 = a._m[10], a_m32 = a._m[11];
        var a_m03 = a._m[12], a_m13 = a._m[13], a_m23 = a._m[14], a_m33 = a._m[15];
        var b_m00 = b._m[0], b_m10 = b._m[1], b_m20 = b._m[2], b_m30 = b._m[3];
        var b_m01 = b._m[4], b_m11 = b._m[5], b_m21 = b._m[6], b_m31 = b._m[7];
        var b_m02 = b._m[8], b_m12 = b._m[9], b_m22 = b._m[10], b_m32 = b._m[11];
        var b_m03 = b._m[12], b_m13 = b._m[13], b_m23 = b._m[14], b_m33 = b._m[15];

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20 + a_m03 * b_m30;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20 + a_m13 * b_m30;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20 + a_m23 * b_m30;
        this._m[3] = a_m30 * b_m00 + a_m31 * b_m10 + a_m32 * b_m20 + a_m33 * b_m30;
        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21 + a_m03 * b_m31;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21 + a_m13 * b_m31;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21 + a_m23 * b_m31;
        this._m[7] = a_m30 * b_m01 + a_m31 * b_m11 + a_m32 * b_m21 + a_m33 * b_m31;
        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22 + a_m03 * b_m32;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22 + a_m13 * b_m32;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22 + a_m23 * b_m32;
        this._m[11] = a_m30 * b_m02 + a_m31 * b_m12 + a_m32 * b_m22 + a_m33 * b_m32;
        this._m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03 * b_m33;
        this._m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13 * b_m33;
        this._m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23 * b_m33;
        this._m[15] = a_m30 * b_m03 + a_m31 * b_m13 + a_m32 * b_m23 + a_m33 * b_m33;
    },

    productAffine: function (a, b)
    {
        var a_m00 = a._m[0], a_m10 = a._m[1], a_m20 = a._m[2];
        var a_m01 = a._m[4], a_m11 = a._m[5], a_m21 = a._m[6];
        var a_m02 = a._m[8], a_m12 = a._m[9], a_m22 = a._m[10];
        var a_m03 = a._m[12], a_m13 = a._m[13], a_m23 = a._m[14];
        var b_m00 = b._m[0], b_m10 = b._m[1], b_m20 = b._m[2];
        var b_m01 = b._m[4], b_m11 = b._m[5], b_m21 = b._m[6];
        var b_m02 = b._m[8], b_m12 = b._m[9], b_m22 = b._m[10];
        var b_m03 = b._m[12], b_m13 = b._m[13], b_m23 = b._m[14];

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        this._m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03;
        this._m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13;
        this._m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23;

    },

    sum: function (a, b)
    {
        this._m[0] = a._m[0] + b._m[0];
        this._m[1] = a._m[1] + b._m[1];
        this._m[2] = a._m[2] + b._m[3];
        this._m[3] = a._m[3] + b._m[3];
        this._m[4] = a._m[4] + b._m[4];
        this._m[5] = a._m[5] + b._m[5];
        this._m[6] = a._m[6] + b._m[6];
        this._m[7] = a._m[7] + b._m[7];
        this._m[8] = a._m[8] + b._m[8];
        this._m[9] = a._m[9] + b._m[9];
        this._m[10] = a._m[10] + b._m[10];
        this._m[11] = a._m[11] + b._m[11];
        this._m[12] = a._m[12] + b._m[12];
        this._m[13] = a._m[13] + b._m[13];
        this._m[14] = a._m[14] + b._m[14];
        this._m[15] = a._m[15] + b._m[15];
    },

    sumAffine: function (a, b)
    {
        this._m[0] = a._m[0] + b._m[0];
        this._m[1] = a._m[1] + b._m[1];
        this._m[2] = a._m[2] + b._m[3];
        this._m[4] = a._m[4] + b._m[4];
        this._m[5] = a._m[5] + b._m[5];
        this._m[6] = a._m[6] + b._m[6];
        this._m[8] = a._m[8] + b._m[8];
        this._m[9] = a._m[9] + b._m[9];
        this._m[10] = a._m[10] + b._m[10];
    },

    difference: function (a, b)
    {
        this._m[0] = a._m[0] - b._m[0];
        this._m[1] = a._m[1] - b._m[1];
        this._m[2] = a._m[2] - b._m[3];
        this._m[3] = a._m[3] - b._m[3];
        this._m[4] = a._m[4] - b._m[4];
        this._m[5] = a._m[5] - b._m[5];
        this._m[6] = a._m[6] - b._m[6];
        this._m[7] = a._m[7] - b._m[7];
        this._m[8] = a._m[8] - b._m[8];
        this._m[9] = a._m[9] - b._m[9];
        this._m[10] = a._m[10] - b._m[10];
        this._m[11] = a._m[11] - b._m[11];
        this._m[12] = a._m[12] - b._m[12];
        this._m[13] = a._m[13] - b._m[13];
        this._m[14] = a._m[14] - b._m[14];
        this._m[15] = a._m[15] - b._m[15];
    },

    differenceAffine: function (a, b)
    {
        this._m[0] = a._m[0] - b._m[0];
        this._m[1] = a._m[1] - b._m[1];
        this._m[2] = a._m[2] - b._m[3];
        this._m[4] = a._m[4] - b._m[4];
        this._m[5] = a._m[5] - b._m[5];
        this._m[6] = a._m[6] - b._m[6];
        this._m[8] = a._m[8] - b._m[8];
        this._m[9] = a._m[9] - b._m[9];
        this._m[10] = a._m[10] - b._m[10];
    },

    rotationX: function (radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);

        this._m[0] = 1;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = cos;
        this._m[6] = sin;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = -sin;
        this._m[10] = cos;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    rotationY: function (radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);

        this._m[0] = cos;
        this._m[1] = 0;
        this._m[2] = -sin;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = 1;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = sin;
        this._m[9] = 0;
        this._m[10] = cos;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    rotationZ: function (radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);

        this._m[0] = cos;
        this._m[1] = sin;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = -sin;
        this._m[5] = cos;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = 1;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    rotationAxisAngle: function (axis, radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length();


        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        this._m[0] = oneMinCos * x * x + cos;
        this._m[1] = oneMinCos * x * y + sin * z;
        this._m[2] = oneMinCos * x * z - sin * y;
        this._m[3] = 0;
        this._m[4] = oneMinCos * x * y - sin * z;
        this._m[5] = oneMinCos * y * y + cos;
        this._m[6] = oneMinCos * y * z + sin * x;
        this._m[7] = 0;
        this._m[8] = oneMinCos * x * z + sin * y;
        this._m[9] = oneMinCos * y * z - sin * x;
        this._m[10] = oneMinCos * z * z + cos;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    rotationXYZ: function (x, y, z)
    {
        var cosX = Math.cos(x);
        var sinX = Math.sin(x);
        var cosY = Math.cos(y);
        var sinY = Math.sin(y);
        var cosZ = Math.cos(z);
        var sinZ = Math.sin(z);

        this._m[0] = cosY * cosZ;
        this._m[1] = sinX * sinY * cosZ - cosX * sinZ;
        this._m[2] = cosX * sinY * cosZ + sinX * sinZ;
        this._m[3] = 0;
        this._m[4] = cosY * sinZ;
        this._m[5] = sinX * sinY * sinZ + cosX * cosZ;
        this._m[6] = cosX * sinY * sinZ - sinX * cosZ;
        this._m[7] = 0;
        this._m[8] = -sinY;
        this._m[9] = sinX * cosY;
        this._m[10] = cosX * cosY;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    rotationPitchYawRoll: function (pitch, yaw, roll)
    {
        var cosP = Math.cos(-pitch);
        var cosY = Math.cos(-yaw);
        var cosR = Math.cos(roll);
        var sinP = Math.sin(-pitch);
        var sinY = Math.sin(-yaw);
        var sinR = Math.sin(roll);

        var zAxisX = -sinY * cosP;
        var zAxisY = -sinP;
        var zAxisZ = cosY * cosP;

        var yAxisX = -cosY * sinR - sinY * sinP * cosR;
        var yAxisY = cosP * cosR;
        var yAxisZ = -sinY * sinR + sinP * cosR * cosY;

        var xAxisX = yAxisY * zAxisZ - yAxisZ * zAxisY;
        var xAxisY = yAxisZ * zAxisX - yAxisX * zAxisZ;
        var xAxisZ = yAxisX * zAxisY - yAxisY * zAxisX;

        this._m[0] = xAxisX;
        this._m[1] = xAxisY;
        this._m[2] = xAxisZ;
        this._m[3] = 0;
        this._m[4] = yAxisX;
        this._m[5] = yAxisY;
        this._m[6] = yAxisZ;
        this._m[7] = 0;
        this._m[8] = zAxisX;
        this._m[9] = zAxisY;
        this._m[10] = zAxisZ;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    translation: function (x, y, z)
    {
        this._m[0] = 1;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = 1;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = 1;
        this._m[11] = 0;
        this._m[12] = x;
        this._m[13] = y;
        this._m[14] = z;
        this._m[15] = 1;
    },

    scaleMatrix: function (x, y, z)
    {
        this._m[0] = x;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = y;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = z;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 0;
        this._m[15] = 1;
    },

    perspectiveProjection: function (vFOV, aspectRatio, nearDistance, farDistance)
    {
        var yMax = 1.0 / Math.tan(vFOV * .5);
        var xMax = yMax / aspectRatio;
        var rcpFrustumDepth = 1.0 / (nearDistance - farDistance);

        this._m[0] = xMax;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;

        this._m[4] = 0;
        this._m[5] = yMax;
        this._m[6] = 0;
        this._m[7] = 0;

        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = (farDistance + nearDistance) * rcpFrustumDepth;
        this._m[11] = -1;

        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = 2 * nearDistance * farDistance * rcpFrustumDepth;
        this._m[15] = 0;
    },

    orthographicOffCenterProjection: function (left, right, top, bottom, nearDistance, farDistance)
    {
        var rcpWidth = 1.0 / (right - left);
        var rcpHeight = 1.0 / (top - bottom);
        var rcpDepth = 1.0 / (nearDistance - farDistance);

        this._m[0] = 2.0 * rcpWidth;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = 2.0 * rcpHeight;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = 2.0 * rcpDepth;
        this._m[11] = 0;
        this._m[12] = -(left + right) * rcpWidth;
        this._m[13] = -(top + bottom) * rcpHeight;
        this._m[14] = (farDistance + nearDistance) * rcpDepth;
        this._m[15] = 1;
    },

    orthographicProjection: function (width, height, nearDistance, farDistance)
    {
        var yMax = Math.tan(vFOV * .5);
        var xMax = yMax * aspectRatio;
        var rcpFrustumDepth = 1.0 / (nearDistance - farDistance);

        this._m[0] = 1 / xMax;
        this._m[1] = 0;
        this._m[2] = 0;
        this._m[3] = 0;
        this._m[4] = 0;
        this._m[5] = 1 / yMax;
        this._m[6] = 0;
        this._m[7] = 0;
        this._m[8] = 0;
        this._m[9] = 0;
        this._m[10] = 2 * rcpFrustumDepth;
        this._m[11] = 0;
        this._m[12] = 0;
        this._m[13] = 0;
        this._m[14] = (farDistance + nearDistance) * rcpFrustumDepth;
        this._m[15] = 1;
    },

    scaled: function (s, m)
    {
        this._m[0] = m._m[0] * s;
        this._m[1] = m._m[1] * s;
        this._m[2] = m._m[2] * s;
        this._m[3] = m._m[3] * s;
        this._m[4] = m._m[4] * s;
        this._m[5] = m._m[5] * s;
        this._m[6] = m._m[6] * s;
        this._m[7] = m._m[7] * s;
        this._m[8] = m._m[8] * s;
        this._m[9] = m._m[9] * s;
        this._m[10] = m._m[10] * s;
        this._m[11] = m._m[11] * s;
        this._m[12] = m._m[12] * s;
        this._m[13] = m._m[13] * s;
        this._m[14] = m._m[14] * s;
        this._m[15] = m._m[15] * s;
    },

    add: function (m)
    {
        this._m[0] += m._m[0];
        this._m[1] += m._m[1];
        this._m[2] += m._m[2];
        this._m[3] += m._m[3];
        this._m[4] += m._m[4];
        this._m[5] += m._m[5];
        this._m[6] += m._m[6];
        this._m[7] += m._m[7];
        this._m[8] += m._m[8];
        this._m[9] += m._m[9];
        this._m[10] += m._m[10];
        this._m[11] += m._m[11];
        this._m[12] += m._m[12];
        this._m[13] += m._m[13];
        this._m[14] += m._m[14];
        this._m[15] += m._m[15];
    },

    subtract: function (m)
    {
        this._m[0] -= m._m[0];
        this._m[1] -= m._m[1];
        this._m[2] -= m._m[2];
        this._m[3] -= m._m[3];
        this._m[4] -= m._m[4];
        this._m[5] -= m._m[5];
        this._m[6] -= m._m[6];
        this._m[7] -= m._m[7];
        this._m[8] -= m._m[8];
        this._m[9] -= m._m[9];
        this._m[10] -= m._m[10];
        this._m[11] -= m._m[11];
        this._m[12] -= m._m[12];
        this._m[13] -= m._m[13];
        this._m[14] -= m._m[14];
        this._m[15] -= m._m[15];
    },

    clone: function ()
    {
        return new HX.Matrix4x4(
            this._m[0], this._m[4], this._m[8], this._m[12],
            this._m[1], this._m[5], this._m[9], this._m[13],
            this._m[2], this._m[6], this._m[10], this._m[14],
            this._m[3], this._m[7], this._m[11], this._m[15]
        );
    },

    transpose: function ()
    {
        var m1 = this._m[1];
        var m2 = this._m[2];
        var m3 = this._m[3];
        var m6 = this._m[6];
        var m7 = this._m[7];
        var m11 = this._m[11];

        this._m[1] = this._m[4];
        this._m[2] = this._m[8];
        this._m[3] = this._m[12];

        this._m[4] = m1;
        this._m[6] = this._m[9];
        this._m[7] = this._m[13];

        this._m[8] = m2;
        this._m[9] = m6;
        this._m[11] = this._m[14];

        this._m[12] = m3;
        this._m[13] = m7;
        this._m[14] = m11;
    },

    /**
     * The determinant of a 3x3 minor matrix (matrix created by removing a given row and column)
     * @private
     */
    determinant3x3: function (row, col)
    {
        // todo: can this be faster?
        // columns are the indices * 4 (to form index for row 0)
        var c1 = col == 0 ? 4 : 0;
        var c2 = col < 2 ? 8 : 4;
        var c3 = col == 3 ? 8 : 12;
        var r1 = row == 0 ? 1 : 0;
        var r2 = row < 2 ? 2 : 1;
        var r3 = row == 3 ? 2 : 3;

        var m21 = this._m[c1 | r2], m22 = this._m[r2 | c2], m23 = this._m[c3 | r2];
        var m31 = this._m[c1 | r3], m32 = this._m[c2 | r3], m33 = this._m[r3 | c3];

        return      this._m[c1 | r1] * (m22 * m33 - m23 * m32)
            - this._m[c2 | r1] * (m21 * m33 - m23 * m31)
            + this._m[c3 | r1] * (m21 * m32 - m22 * m31);
    },

    cofactor: function (row, col)
    {
        // should be able to xor sign bit instead
        var sign = 1 - (((row + col) & 1) << 1);
        return sign * this.determinant3x3(row, col);
    },

    getCofactorMatrix: function (row, col)
    {
        var target = new HX.Matrix4x4();

        for (var i = 0; i < 16; ++i)
            target._m[i] = this.cofactor(i & 3, i >> 2);

        return target;
    },

    getAdjugate: function (row, col)
    {
        var target = new HX.Matrix4x4();

        for (var i = 0; i < 16; ++i)
            target._m[i] = this.cofactor(i >> 2, i & 3);    // transposed!

        return target;
    },

    determinant: function ()
    {
        return this._m[0] * this.determinant3x3(0, 0) - this._m[4] * this.determinant3x3(0, 1) + this._m[8] * this.determinant3x3(0, 2) - this._m[12] * this.determinant3x3(0, 3);
    },

    inverseOf: function (m)
    {
        // this can be much more efficient, but I'd like to keep it readable for now. The full inverse is not required often anyway.
        var rcpDet = 1.0 / m.determinant();

        this._m[0] = rcpDet * m.cofactor(0, 0);
        this._m[1] = rcpDet * m.cofactor(0, 1);
        this._m[2] = rcpDet * m.cofactor(0, 2);
        this._m[3] = rcpDet * m.cofactor(0, 3);
        this._m[4] = rcpDet * m.cofactor(1, 0);
        this._m[5] = rcpDet * m.cofactor(1, 1);
        this._m[6] = rcpDet * m.cofactor(1, 2);
        this._m[7] = rcpDet * m.cofactor(1, 3);
        this._m[8] = rcpDet * m.cofactor(2, 0);
        this._m[9] = rcpDet * m.cofactor(2, 1);
        this._m[10] = rcpDet * m.cofactor(2, 2);
        this._m[11] = rcpDet * m.cofactor(2, 3);
        this._m[12] = rcpDet * m.cofactor(3, 0);
        this._m[13] = rcpDet * m.cofactor(3, 1);
        this._m[14] = rcpDet * m.cofactor(3, 2);
        this._m[15] = rcpDet * m.cofactor(3, 3);
    },

    /**
     * If you know it's an affine matrix (such as general transforms rather than perspective projection matrices), use this.
     * @param m
     */
    inverseAffineOf: function (m)
    {
        var m0 = m._m[0], m1 = m._m[1], m2 = m._m[2];
        var m4 = m._m[4], m5 = m._m[5], m6 = m._m[6];
        var m8 = m._m[8], m9 = m._m[9], m10 = m._m[10];
        var m12 = m._m[12], m13 = m._m[13], m14 = m._m[14];
        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        var n0 = (m5 * m10 - m9 * m6) * rcpDet;
        var n1 = (m9 * m2 - m1 * m10) * rcpDet;
        var n2 = (m1 * m6 - m5 * m2) * rcpDet;
        var n4 = (m8 * m6 - m4 * m10) * rcpDet;
        var n5 = (m0 * m10 - m8 * m2) * rcpDet;
        var n6 = (m4 * m2 - m0 * m6) * rcpDet;
        var n8 = (m4 * m9 - m8 * m5) * rcpDet;
        var n9 = (m8 * m1 - m0 * m9) * rcpDet;
        var n10 = (m0 * m5 - m4 * m1) * rcpDet;

        this._m[0] = n0;
        this._m[1] = n1;
        this._m[2] = n2;
        this._m[3] = 0;
        this._m[4] = n4;
        this._m[5] = n5;
        this._m[6] = n6;
        this._m[7] = 0;
        this._m[8] = n8;
        this._m[9] = n9;
        this._m[10] = n10;
        this._m[11] = 0;
        this._m[12] = -n0 * m12 - n4 * m13 - n8 * m14;
        this._m[13] = -n1 * m12 - n5 * m13 - n9 * m14;
        this._m[14] = -n2 * m12 - n6 * m13 - n10 * m14;
        this._m[15] = 1;
    },

    /**
     * Writes the inverse transpose into an array for upload (must support 9 elements)
     */
    writeNormalMatrix: function (array)
    {
        var m0 = this._m[0], m1 = this._m[1], m2 = this._m[2];
        var m4 = this._m[4], m5 = this._m[5], m6 = this._m[6];
        var m8 = this._m[8], m9 = this._m[9], m10 = this._m[10];

        var determinant = m0 * (m5 * m10 - m9 * m6) - this._m[4] * (m1 * m10 - m9 * m2) + this._m[8] * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        array[0] = (m5 * m10 - m9 * m6) * rcpDet;
        array[1] = (m8 * m6 - m4 * m10) * rcpDet;
        array[2] = (m4 * m9 - m8 * m5) * rcpDet;
        array[3] = (m9 * m2 - m1 * m10) * rcpDet;
        array[4] = (m0 * m10 - m8 * m2) * rcpDet;
        array[5] = (m8 * m1 - m0 * m9) * rcpDet;
        array[6] = (m1 * m6 - m5 * m2) * rcpDet;
        array[7] = (m4 * m2 - m0 * m6) * rcpDet;
        array[8] = (m0 * m5 - m4 * m1) * rcpDet;
    },

    invert: function ()
    {
        // this can be much more efficient, but I'd like to keep it readable for now. The full inverse is not required often anyway.
        var rcpDet = 1.0 / this.determinant();

        var m0 = rcpDet * this.cofactor(0, 0);
        var m1 = rcpDet * this.cofactor(0, 1);
        var m2 = rcpDet * this.cofactor(0, 2);
        var m3 = rcpDet * this.cofactor(0, 3);
        var m4 = rcpDet * this.cofactor(1, 0);
        var m5 = rcpDet * this.cofactor(1, 1);
        var m6 = rcpDet * this.cofactor(1, 2);
        var m7 = rcpDet * this.cofactor(1, 3);
        var m8 = rcpDet * this.cofactor(2, 0);
        var m9 = rcpDet * this.cofactor(2, 1);
        var m10 = rcpDet * this.cofactor(2, 2);
        var m11 = rcpDet * this.cofactor(2, 3);
        var m12 = rcpDet * this.cofactor(3, 0);
        var m13 = rcpDet * this.cofactor(3, 1);
        var m14 = rcpDet * this.cofactor(3, 2);
        var m15 = rcpDet * this.cofactor(3, 3);

        this._m[0] = m0;
        this._m[1] = m1;
        this._m[2] = m2;
        this._m[3] = m3;
        this._m[4] = m4;
        this._m[5] = m5;
        this._m[6] = m6;
        this._m[7] = m7;
        this._m[8] = m8;
        this._m[9] = m9;
        this._m[10] = m10;
        this._m[11] = m11;
        this._m[12] = m12;
        this._m[13] = m13;
        this._m[14] = m14;
        this._m[15] = m15;
    },

    invertAffine: function ()
    {
        var m0 = this._m[0], m1 = this._m[1], m2 = this._m[2];
        var m4 = this._m[4], m5 = this._m[5], m6 = this._m[6];
        var m8 = this._m[8], m9 = this._m[9], m10 = this._m[10];
        var m12 = this._m[12], m13 = this._m[13], m14 = this._m[14];

        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        var n0 = (m5 * m10 - m9 * m6) * rcpDet;
        var n1 = (m9 * m2 - m1 * m10) * rcpDet;
        var n2 = (m1 * m6 - m5 * m2) * rcpDet;
        var n4 = (m8 * m6 - m4 * m10) * rcpDet;
        var n5 = (m0 * m10 - m8 * m2) * rcpDet;
        var n6 = (m4 * m2 - m0 * m6) * rcpDet;
        var n8 = (m4 * m9 - m8 * m5) * rcpDet;
        var n9 = (m8 * m1 - m0 * m9) * rcpDet;
        var n10 = (m0 * m5 - m4 * m1) * rcpDet;

        this._m[0] = n0;
        this._m[1] = n1;
        this._m[2] = n2;
        this._m[4] = n4;
        this._m[5] = n5;
        this._m[6] = n6;
        this._m[8] = n8;
        this._m[9] = n9;
        this._m[10] = n10;
        this._m[12] = -n0 * m12 - n4 * m13 - n8 * m14;
        this._m[13] = -n1 * m12 - n5 * m13 - n9 * m14;
        this._m[14] = -n2 * m12 - n6 * m13 - n10 * m14;
    },


    append: function (m)
    {
        this.product(this, m);
    },

    prepend: function (m)
    {
        this.product(m, this);
    },

    appendAffine: function (m)
    {
        this.productAffine(m, this);
    },

    prependAffine: function (m)
    {
        this.productAffine(this, m);
    },

    add: function (m)
    {
        this._m[0] += m._m[0];
        this._m[1] += m._m[1];
        this._m[2] += m._m[2];
        this._m[3] += m._m[3];
        this._m[4] += m._m[4];
        this._m[5] += m._m[5];
        this._m[6] += m._m[6];
        this._m[7] += m._m[7];
        this._m[8] += m._m[8];
        this._m[9] += m._m[9];
        this._m[10] += m._m[10];
        this._m[11] += m._m[11];
        this._m[12] += m._m[12];
        this._m[13] += m._m[13];
        this._m[14] += m._m[14];
        this._m[15] += m._m[15];
    },

    addAffine: function (m)
    {
        this._m[0] += m._m[0];
        this._m[1] += m._m[1];
        this._m[2] += m._m[2];
        this._m[4] += m._m[4];
        this._m[5] += m._m[5];
        this._m[6] += m._m[6];
        this._m[8] += m._m[8];
        this._m[9] += m._m[9];
        this._m[10] += m._m[10];
    },

    subtract: function (m)
    {
        this._m[0] -= m._m[0];
        this._m[1] -= m._m[1];
        this._m[2] -= m._m[2];
        this._m[3] -= m._m[3];
        this._m[4] -= m._m[4];
        this._m[5] -= m._m[5];
        this._m[6] -= m._m[6];
        this._m[7] -= m._m[7];
        this._m[8] -= m._m[8];
        this._m[9] -= m._m[9];
        this._m[10] -= m._m[10];
        this._m[11] -= m._m[11];
        this._m[12] -= m._m[12];
        this._m[13] -= m._m[13];
        this._m[14] -= m._m[14];
        this._m[15] -= m._m[15];
    },

    subtractAffine: function (m)
    {
        this._m[0] -= m._m[0];
        this._m[1] -= m._m[1];
        this._m[2] -= m._m[2];
        this._m[4] -= m._m[4];
        this._m[5] -= m._m[5];
        this._m[6] -= m._m[6];
        this._m[8] -= m._m[8];
        this._m[9] -= m._m[9];
        this._m[10] -= m._m[10];
    },

    appendScale: function (x, y, z)
    {
        this._m[0] *= x;
        this._m[1] *= y;
        this._m[2] *= z;
        this._m[4] *= x;
        this._m[5] *= y;
        this._m[6] *= z;
        this._m[8] *= x;
        this._m[9] *= y;
        this._m[10] *= z;
        this._m[12] *= x;
        this._m[13] *= y;
        this._m[14] *= z;
    },

    prependScale: function (x, y, z)
    {
        this._m[0] *= x;
        this._m[1] *= x;
        this._m[2] *= x;
        this._m[3] *= x;
        this._m[4] *= y;
        this._m[5] *= y;
        this._m[6] *= y;
        this._m[7] *= y;
        this._m[8] *= z;
        this._m[9] *= z;
        this._m[10] *= z;
        this._m[11] *= z;
    },

    appendTranslation: function (x, y, z)
    {
        this._m[12] += x;
        this._m[13] += y;
        this._m[14] += z;
    },

    prependTranslation: function (x, y, z)
    {
        this._m[12] += this._m[0] * x + this._m[4] * y + this._m[8] * z;
        this._m[13] += this._m[1] * x + this._m[5] * y + this._m[9] * z;
        this._m[14] += this._m[2] * x + this._m[6] * y + this._m[10] * z;
        this._m[15] += this._m[3] * x + this._m[7] * y + this._m[11] * z;
    },

    appendRotationQuaternion: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = 1 - 2 * (y * y + z * z), a_m10 = 2 * (x * y + w * z), a_m20 = 2 * (x * z - w * y);
        var a_m01 = 2 * (x * y - w * z), a_m11 = 1 - 2 * (x * x + z * z), a_m21 = 2 * (y * z + w * x);
        var a_m02 = 2 * (x * z + w * y), a_m12 = 2 * (y * z - w * x), a_m22 = 1 - 2 * (x * x + y * y);

        var b_m00 = this._m[0], b_m10 = this._m[1], b_m20 = this._m[2];
        var b_m01 = this._m[4], b_m11 = this._m[5], b_m21 = this._m[6];
        var b_m02 = this._m[8], b_m12 = this._m[9], b_m22 = this._m[10];
        var b_m03 = this._m[12], b_m13 = this._m[13], b_m23 = this._m[14];

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        this._m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        this._m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        this._m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
    },

    prependRotationQuaternion: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = this._m[0], a_m10 = this._m[1], a_m20 = this._m[2];
        var a_m01 = this._m[4], a_m11 = this._m[5], a_m21 = this._m[6];
        var a_m02 = this._m[8], a_m12 = this._m[9], a_m22 = this._m[10];

        var b_m00 = 1 - 2 * (y * y + z * z), b_m10 = 2 * (x * y + w * z), b_m20 = 2 * (x * z - w * y);
        var b_m01 = 2 * (x * y - w * z), b_m11 = 1 - 2 * (x * x + z * z), b_m21 = 2 * (y * z + w * x);
        var b_m02 = 2 * (x * z + w * y), b_m12 = 2 * (y * z - w * x), b_m22 = 1 - 2 * (x * x + y * y);

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
    },

    appendRotationAxisAngle: function (axis, radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length();

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = oneMinCos * x * x + cos, a_m10 = oneMinCos * x * y + sin * z, a_m20 = oneMinCos * x * z - sin * y;
        var a_m01 = oneMinCos * x * y - sin * z, a_m11 = oneMinCos * y * y + cos, a_m21 = oneMinCos * y * z + sin * x;
        var a_m02 = oneMinCos * x * z + sin * y, a_m12 = oneMinCos * y * z - sin * x, a_m22 = oneMinCos * z * z + cos;

        var b_m00 = this._m[0], b_m10 = this._m[1], b_m20 = this._m[2];
        var b_m01 = this._m[4], b_m11 = this._m[5], b_m21 = this._m[6];
        var b_m02 = this._m[8], b_m12 = this._m[9], b_m22 = this._m[10];
        var b_m03 = this._m[12], b_m13 = this._m[13], b_m23 = this._m[14];

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        this._m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        this._m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        this._m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
    },

    prependRotationAxisAngle: function (axis, radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length();

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = this._m[0], a_m10 = this._m[1], a_m20 = this._m[2];
        var a_m01 = this._m[4], a_m11 = this._m[5], a_m21 = this._m[6];
        var a_m02 = this._m[8], a_m12 = this._m[9], a_m22 = this._m[10];

        var b_m00 = oneMinCos * x * x + cos, b_m10 = oneMinCos * x * y + sin * z, b_m20 = oneMinCos * x * z - sin * y;
        var b_m01 = oneMinCos * x * y - sin * z, b_m11 = oneMinCos * y * y + cos, b_m21 = oneMinCos * y * z + sin * x;
        var b_m02 = oneMinCos * x * z + sin * y, b_m12 = oneMinCos * y * z - sin * x, b_m22 = oneMinCos * z * z + cos;

        this._m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        this._m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        this._m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        this._m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        this._m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        this._m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        this._m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        this._m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        this._m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
    },

    getRow: function (index)
    {
        return new HX.Float4(this._m[index], this._m[index | 4], this._m[index | 8], this._m[index | 12]);
    },

    setRow: function (index, v)
    {
        this._m[index] = v.x;
        this._m[index | 4] = v.y;
        this._m[index | 8] = v.z;
        this._m[index | 12] = v.w;
    },

    getElement: function(row, col)
    {
        return this._m[row | (col << 2)];
    },

    setElement: function(row, col, value)
    {
        this._m[row | (col << 2)] = value;
    },

    getColumn: function (index)
    {
        index <<= 2;
        return new HX.Float4(this._m[index], this._m[index | 1], this._m[index | 2], this._m[index | 3]);
    },

    setColumn: function (index, v)
    {
        index <<= 2;
        this._m[index] = v.x;
        this._m[index | 1] = v.y;
        this._m[index | 2] = v.z;
        this._m[index | 3] = v.w;
    },

    /**
     * @param target
     * @param eye
     * @param up Must be unit length
     */
    lookAt: function (target, eye, up)
    {
        var zAxis = new HX.Float4();
        zAxis.difference(eye, target);
        zAxis.normalize();

        var xAxis = new HX.Float4();
        xAxis.cross(up, zAxis);

        if (Math.abs(xAxis.lengthSqr()) > .0001) {
            xAxis.normalize();
        }
        else {
            var altUp = new HX.Float4(up.x, up.z, up.y, 0.0);
            xAxis.cross(altUp, zAxis);
            if (Math.abs(xAxis.lengthSqr()) <= .0001) {
                altUp.set(up.z, up.y, up.z, 0.0);
                xAxis.cross(altUp, zAxis);
            }
            xAxis.normalize();
        }

        var yAxis = new HX.Float4();
        yAxis.cross(zAxis, xAxis);	// should already be unit length

        this._m[0] = xAxis.x;
        this._m[1] = xAxis.y;
        this._m[2] = xAxis.z;
        this._m[3] = 0.0;
        this._m[4] = yAxis.x;
        this._m[5] = yAxis.y;
        this._m[6] = yAxis.z;
        this._m[7] = 0.0;
        this._m[8] = zAxis.x;
        this._m[9] = zAxis.y;
        this._m[10] = zAxis.z;
        this._m[11] = 0.0;
        this._m[12] = eye.x;
        this._m[13] = eye.y;
        this._m[14] = eye.z;
        this._m[15] = 1.0;
    },

    /**
     * Generates a matrix from a transform object
     */
    compose: function(transform)
    {
        this.fromQuaternion(transform.rotation);
        var scale = transform.scale;
        var position = transform.position;
        this.appendScale(scale.x, scale.y, scale.z);
        this.appendTranslation(position.x, position.y, position.z);
    },

    /**
     * Decomposes an affine transformation matrix into a Transform object.
     * @param target An optional target object to decompose into. If omitted, a new object will be created and returned.
     */
    decompose: function (target)
    {
        target = target || new Transform();
        var m0 = this._m[0], m1 = this._m[1], m2 = this._m[2];
        var m4 = this._m[4], m5 = this._m[5], m6 = this._m[6];
        var m8 = this._m[8], m9 = this._m[9], m10 = this._m[10];

        target.scale.x = Math.sqrt(m0 * m0 + m1 * m1 + m2 * m2);
        target.scale.y = Math.sqrt(m4 * m4 + m5 * m5 + m6 * m6);
        target.scale.z = Math.sqrt(m8 * m8 + m9 * m9 + m10 * m10);

        target.rotation.fromMatrix(this);

        target.position.copyFrom(this.getColumn(3));

        return target;
    }
};

HX.Matrix4x4.IDENTITY = new HX.Matrix4x4();
HX.Matrix4x4.ZERO = new HX.Matrix4x4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
/**
 *
 * @param mode
 * @param initialDistance
 * @param decayFactor
 * @param maxTests
 * @constructor
 */
HX.PoissonDisk = function(mode, initialDistance, decayFactor, maxTests)
{
    this._mode = mode === undefined? HX.PoissonDisk.CIRCULAR : mode;
    this._initialDistance = initialDistance || 1.0;
    this._decayFactor = decayFactor || .99;
    this._maxTests = maxTests || 20000;
    this._currentDistance = 0;
    this._points = null;
    this.reset();
};

HX.PoissonDisk.SQUARE = 0;
HX.PoissonDisk.CIRCULAR = 1;

HX.PoissonDisk.prototype =
{
    getPoints: function()
    {
        return this._points;
    },

    reset : function()
    {
        this._currentDistance = this._initialDistance;
        this._points = [];
    },

    generatePoints: function(numPoints)
    {
        for (var i = 0; i < numPoints; ++i)
            this.generatePoint();
    },

    generatePoint: function()
    {
        for (;;) {
            var testCount = 0;
            var sqrDistance = this._currentDistance*this._currentDistance;

            while (testCount++ < this._maxTests) {
                var candidate = this._getCandidate();
                if (this._isValid(candidate, sqrDistance)) {
                    this._points.push(candidate);
                    return candidate;
                }
            }
            this._currentDistance *= this._decayFactor;
        }
    },

    _getCandidate: function()
    {
        for (;;) {
            var x = Math.random() * 2.0 - 1.0;
            var y = Math.random() * 2.0 - 1.0;
            if (this._mode == HX.PoissonDisk.SQUARE || (x * x + y * y <= 1))
                return new HX.Float2(x, y);
        }
    },

    _isValid: function(candidate, sqrDistance)
    {
        var len = this._points.length;
        for (var i = 0; i < len; ++i) {
            var p = this._points[i];
            var dx = candidate.x - p.x;
            var dy = candidate.y - p.y;
            if (dx*dx + dy*dy < sqrDistance)
                return false;
        }

            return true;
    }
};
/**
 *
 * @param mode
 * @param initialDistance
 * @param decayFactor
 * @param maxTests
 * @constructor
 */
HX.PoissonSphere = function(mode, initialDistance, decayFactor, maxTests)
{
    this._mode = mode === undefined? HX.PoissonSphere.CIRCULAR : mode;
    this._initialDistance = initialDistance || 1.0;
    this._decayFactor = decayFactor || .99;
    this._maxTests = maxTests || 20000;
    this._currentDistance = 0;
    this._points = null;
    this.reset();
};

HX.PoissonSphere.BOX = 0;
HX.PoissonSphere.CIRCULAR = 1;

HX.PoissonSphere.prototype =
{
    getPoints: function()
    {
        return this._points;
    },

    reset : function()
    {
        this._currentDistance = this._initialDistance;
        this._points = [];
    },

    generatePoints: function(numPoints)
    {
        for (var i = 0; i < numPoints; ++i)
            this.generatePoint();
    },

    generatePoint: function()
    {
        for (;;) {
            var testCount = 0;
            var sqrDistance = this._currentDistance*this._currentDistance;

            while (testCount++ < this._maxTests) {
                var candidate = this._getCandidate();
                if (this._isValid(candidate, sqrDistance)) {
                    this._points.push(candidate);
                    return candidate;
                }
            }
            this._currentDistance *= this._decayFactor;
        }
    },

    _getCandidate: function()
    {
        for (;;) {
            var x = Math.random() * 2.0 - 1.0;
            var y = Math.random() * 2.0 - 1.0;
            var z = Math.random() * 2.0 - 1.0;
            if (this._mode == HX.PoissonSphere.BOX || (x * x + y * y + z * z <= 1))
                return new HX.Float4(x, y, z, 0.0);
        }
    },

    _isValid: function(candidate, sqrDistance)
    {
        var len = this._points.length;
        for (var i = 0; i < len; ++i) {
            var p = this._points[i];
            var dx = candidate.x - p.x;
            var dy = candidate.y - p.y;
            var dz = candidate.z - p.z;
            if (dx*dx + dy*dy + dz*dz < sqrDistance)
                return false;
        }

        return true;
    }
};
HX.Quaternion = function ()
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
};

HX.Quaternion.fromAxisAngle = function (axis, radians)
{
    var q = new HX.Quaternion();
    q.fromAxisAngle(axis, radians);
    return q;
};

HX.Quaternion.fromPitchYawRoll = function (pitch, yaw, roll)
{
    var q = new HX.Quaternion();
    q.fromPitchYawRoll(pitch, yaw, roll);
    return q;
};

HX.Quaternion.prototype = {
    fromAxisAngle: function (axis, radians)
    {
        var factor = Math.sin(radians * .5) / axis.length();
        this.x = axis.x * factor;
        this.y = axis.y * factor;
        this.z = axis.z * factor;
        this.w = Math.cos(radians * .5);
    },

    fromPitchYawRoll: function(pitch, yaw, roll)
    {
        var mtx = new HX.Matrix4x4();
        // wasteful. improve.
        mtx.fromPitchYawRoll(pitch, yaw, roll);
        this.fromMatrix(mtx);
    },

    fromMatrix: function(m)
    {
        var m00 = m._m[0];
        var m11 = m._m[5];
        var m22 = m._m[10];
        var trace = m00 + m11 + m22;

        if (trace > 0.0) {
            trace += 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;
            this.x = s*(m._m[6] - m._m[9]);
            this.y = s*(m._m[8] - m._m[2]);
            this.z = s*(m._m[1] - m._m[4]);
            this.w = s*trace;
        }
        else if (m00 > m11 && m00 > m22) {
            trace = m00 - m11 - m22 + 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*trace;
            this.y = s*(m._m[1] + m._m[4]);
            this.z = s*(m._m[8] + m._m[2]);
            this.w = s*(m._m[6] - m._m[9]);
        }
        else if (m11 > m22) {
            trace = m11 - m00 - m22 + 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[1] + m._m[4]);
            this.y = s*trace;
            this.z = s*(m._m[6] + m._m[9]);
            this.w = s*(m._m[8] - m._m[2]);
        }
        else {
            trace = m22 - m00 - m11 + 1.0;
            var s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[8] + m._m[2]);
            this.y = s*(m._m[6] + m._m[9]);
            this.z = s*trace;
            this.w = s*(m._m[1] - m._m[4]);
        }
    },

    rotate: function(v)
    {
        var vx = v.x, vy = v.y, vz = v.z;

        // p*q'
        var w1 = - this.x * vx - this.y * vy - this.z * vz;
        var x1 = w * vx + this.y * vz - this.z * vy;
        var y1 = w * vy - this.x * vz + this.z * vx;
        var z1 = w * vz + this.x * vy - this.y * vx;

        return new HX.Float4(-w1 * this.x + x1 * this.w - y1 * this.z + z1 * this.y,
                                -w1 * this.y + x1 * this.z + y1 * this.w - z1 * this.x,
                                -w1 * this.z - x1 * this.y + y1 * this.x + z1 * this.w,
                                v.w);
    },

    lerp: function(a, b, factor)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

        // use shortest direction
        if (w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2 < 0) {
            w2 = -w2;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
        }

        this.x = x1 + factor * (x2 - x1);
        this.y = y1 + factor * (y2 - y1);
        this.z = z1 + factor * (z2 - z1);
        this.w = w1 + factor * (w2 - w1);

        this.normalize();
    },

    slerp: function(a, b, factor)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;
        var dot = w1*w2 + x1*x2 + y1*y2 + z1*z2;

        // shortest direction
        if (dot < 0.0) {
            dot = -dot;
            w2 = -w2;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
        }

        if (dot < 0.95) {
            // interpolate angle linearly
            var angle = Math.acos(dot);
            var interpolatedAngle = factor*angle;

            this.x = x2 - x1*dot;
            this.y = y2 - y1*dot;
            this.z = z2 - z1*dot;
            this.w = w2 - w1*dot;
            this.normalize();

            var cos = Math.cos(interpolatedAngle);
            var sin = Math.sin(interpolatedAngle);
            this.x = x1 * cos + this.x * sin;
            this.y = y1 * cos + this.y * sin;
            this.z = z1 * cos + this.z * sin;
            this.w = w1 * cos + this.w * sin;
        }
        else {
            // nearly identical angle, interpolate linearly
            this.x = x1 + factor * (x2 - x1);
            this.y = y1 + factor * (y2 - y1);
            this.z = z1 + factor * (z2 - z1);
            this.w = w1 + factor * (w2 - w1);
            this.normalize();
        }
    },

    // results in the same net rotation, but with different orientation
    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
    },

    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    },

    normSquared : function()
    {
        return this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w;
    },

    norm : function()
    {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
    },

    normalize : function()
    {
        var rcpNorm = 1.0/Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
        this.x *= rcpNorm;
        this.y *= rcpNorm;
        this.z *= rcpNorm;
        this.w *= rcpNorm;
    },

    conjugateOf : function(q)
    {
        this.x = -q.x;
        this.y = -q.y;
        this.z = -q.z;
        this.w = q.w;
    },

    inverseOf: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
        this.x = -x*rcpSqrNorm;
        this.y = -y*rcpSqrNorm;
        this.z = -z*rcpSqrNorm;
        this.w = w*rcpSqrNorm;
    },

    invert: function (q)
    {
        var x = this.x, y = this.y, z = this.z, w = this.w;
        var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
        this.x = -x*rcpSqrNorm;
        this.y = -y*rcpSqrNorm;
        this.z = -z*rcpSqrNorm;
        this.w = w*rcpSqrNorm;
    },

    product: function(a, b)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

        this.x = w1*x2 + x1*w2 + y1*z2 - z1*y2;
        this.y = w1*y2 - x1*z2 + y1*w2 + z1*x2;
        this.z = w1*z2 + x1*y2 - y1*x2 + z1*w2;
        this.w = w1*w2 - x1*x2 - y1*y2 - z1*z2;
    },

    append: function(q)
    {
        this.product(q, this);
    },

    prepend: function(q)
    {
        this.product(this, q);
    }

}
/**
 * An object using position, rotation quaternion and scale to describe an object's transformation.
 *
 * @constructor
 */
HX.Transform = function()
{
    this._position = new HX.Float4(0.0, 0.0, 0.0, 1.0);
    this._rotation = new HX.Quaternion();
    this._scale = new HX.Float4(1.0, 1.0, 1.0, 1.0);
    this._matrix = new HX.Matrix4x4();

    this._changeListener = new HX.PropertyListener();
    this._changeListener.add(this._position, "x");
    this._changeListener.add(this._position, "y");
    this._changeListener.add(this._position, "z");
    this._changeListener.add(this._rotation, "x");
    this._changeListener.add(this._rotation, "y");
    this._changeListener.add(this._rotation, "z");
    this._changeListener.add(this._rotation, "w");
    this._changeListener.add(this._scale, "x");
    this._changeListener.add(this._scale, "y");
    this._changeListener.add(this._scale, "z");
    this._changeListener.onChange.bind(this, this._invalidateTransformationMatrix);
};

HX.Transform.prototype =
{
    get position() {
        return this._position;
    },

    set position(value) {
        // make sure position object never changes
        this._position.copyFrom(value);
    },

    get rotation() {
        return this._rotation;
    },

    set rotation(value) {
        // make sure position object never changes
        this._rotation.copyFrom(value);
    },

    get scale() {
        return this._scale;
    },

    set scale(value) {
        // make sure position object never changes
        this._scale.copyFrom(value);
    },

    lookAt: function(target)
    {
        this._matrix.lookAt(target, this._position, HX.Float4.Y_AXIS);
        this._applyMatrix();
    },

    copyFrom: function(transform)
    {
        this._changeListener.enabled = false;
        this.position.copyFrom(transform.position);
        this.rotation.copyFrom(transform.rotation);
        this.scale.copyFrom(transform.scale);
        this._changeListener.enabled = true;
    },

    getTransformationMatrix: function()
    {
        if (this._matrixInvalid)
            this._updateTransformationMatrix();

        return this._matrix;
    },

    setTransformationMatrix: function(matrix)
    {
        this._matrix.copyFrom(matrix);
        this._applyMatrix();
    },

    _invalidateTransformationMatrix: function ()
    {
        this._matrixInvalid = true;
    },

    _updateTransformationMatrix: function()
    {
        this._matrix.compose(this);
        this._matrixInvalid = false;
    },

    _applyMatrix: function()
    {
        this._matrixInvalid = false;
        // matrix decompose will trigger property updates, so disable this
        this._changeListener.enabled = false;
        this._matrix.decompose(this);
        this._changeListener.enabled = true;
    }
};
HX.shuffle = function(array)
{
    var currentIndex = array.length, temporaryValue, randomIndex ;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}
/**
 *
 * @param type
 * @constructor
 */
HX.BoundingVolume = function(type)
{
    this._type = type;

    this._expanse = HX.BoundingVolume.EXPANSE_EMPTY;
    this._minimumX = 0.0;
    this._minimumY = 0.0;
    this._minimumZ = 0.0;
    this._maximumX = 0.0;
    this._maximumY = 0.0;
    this._maximumZ = 0.0;
    this._halfExtentX = 0.0;
    this._halfExtentY = 0.0;
    this._halfExtentZ = 0.0;
    this._centerX = 0.0;
    this._centerY = 0.0;
    this._centerZ = 0.0;
};

HX.BoundingVolume.EXPANSE_EMPTY = 0;
HX.BoundingVolume.EXPANSE_INFINITE = 1;
HX.BoundingVolume.EXPANSE_FINITE = 2;

HX.BoundingVolume._testAABBToSphere = function(aabb, sphere)
{
    // b = sphere var max = aabb._maximum;
    var maxX = sphere._maximumX;
    var maxY = sphere._maximumY;
    var maxZ = sphere._maximumZ;
    var minX = aabb._minimumX;
    var minY = aabb._minimumY;
    var minZ = aabb._minimumZ;
    var radius = sphere._halfExtentX;
    var centerX = this._centerX;
    var centerY = this._centerY;
    var centerZ = this._centerZ;
    var dot = 0;

    if (minX > centerX) {
        var diff = centerX - minX;
        dot += diff * diff;
    }
    else if (maxX < centerX) {
        var diff = centerX - maxX;
        dot += diff * diff;
    }

    if (minY > centerY) {
        var diff = centerY - minY;
        dot += diff * diff;
    }
    else if (maxY < centerY) {
        var diff = centerY - maxY;
        dot += diff * diff;
    }

    if (minZ > centerZ) {
        var diff = centerZ - minZ;
        dot += diff * diff;
    }
    else if (maxZ < centerZ) {
        var diff = centerZ - maxZ;
        dot += diff * diff;
    }

    return dot < radius * radius;
}

HX.BoundingVolume.prototype =
{
    getExpanse: function() { return this._expanse; },
    type: function() { return this._type; },

    growToIncludeMesh: function(meshData) { throw "Abstract method!"; },
    growToIncludeBound: function(bounds) { throw "Abstract method!"; },
    growToIncludeMinMax: function(min, max) { throw "Abstract method!"; },

    clear: function(expanseState)
    {
        this._minimumX = this._minimumY = this._minimumZ = 0;
        this._maximumX = this._maximumY = this._maximumZ = 0;
        this._centerX = this._centerY = this._centerZ = 0;
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = 0;
        this._expanse = expanseState === undefined? HX.BoundingVolume.EXPANSE_EMPTY : expanseState;
    },

    // both center/radius and min/max approaches are used, depending on the type, but both are required
    getMinimum: function() { return new HX.Float4(this._minimumX, this._minimumY, this._minimumZ, 1.0); },
    getMaximum: function() { return new HX.Float4(this._maximumX, this._maximumY, this._maximumZ, 1.0); },

    getCenter: function() { return new HX.Float4(this._centerX, this._centerY, this._centerZ, 1.0); },
    // the half-extents of the box encompassing the bounds.
    getHalfExtent: function() { return new HX.Float4(this._halfExtentX, this._halfExtentY, this._halfExtentZ, 0.0); },
    // the radius of the sphere encompassing the bounds. This is implementation-dependent, because the radius is less precise for a box than for a sphere
    getRadius: function() { throw "Abstract method!"; },

    transformFrom: function(sourceBound, matrix) { throw "Abstract method!"; },

    // numPlanes is provided so we can provide a full frustum but skip near/far tests (useful in some cases)
    // convex solid may be infinite
    intersectsConvexSolid: function(cullPlanes, numPlanes) { throw "Abstract method!"; },
    intersectsBound: function(bound) { throw "Abstract method!"; },
    classifyAgainstPlane: function(plane) { throw "Abstract method!"; },

    createDebugModelInstance: function() { throw "Abstract method!"; },

    getDebugModelInstance: function()
    {
        if (this._type._debugModel === undefined)
            this._type._debugModel = this.createDebugModelInstance();

        return this._type._debugModel;
    },

    getDebugMaterial: function()
    {
        if (HX.BoundingVolume._debugMaterial === undefined) {
            var parser = new DOMParser();
            var xml = parser.parseFromString(HX.BoundingVolume._debugMaterialXML, "text/xml");
            HX.BoundingVolume._debugMaterial = HX.Material.parseFromXML(xml);
        }

        return HX.BoundingVolume._debugMaterial;
    }
};

/**
 *
 * @constructor
 */
HX.BoundingAABB = function()
{
    HX.BoundingVolume.call(this, HX.BoundingAABB);
};

HX.BoundingAABB.prototype = Object.create(HX.BoundingVolume.prototype);

HX.BoundingAABB.prototype.growToIncludeMesh = function(meshData)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    var attribute = meshData.getVertexAttribute("hx_position");
    var index = attribute.offset;
    var stride = meshData.getVertexStride();
    var vertices = meshData._vertexData;
    var len = vertices.length;
    var minX, minY, minZ;
    var maxX, maxY, maxZ;

    if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
        maxX = minX = vertices[index];
        maxY = minY = vertices[index + 1];
        maxZ = minZ = vertices[index + 2];
        index += stride;
    }
    else {
        minX = this._minimumX; minY = this._minimumY; minZ = this._minimumZ;
        maxX = this._maximumX; maxY = this._maximumY; maxZ = this._maximumZ;
    }

    for (; index < len; index += stride) {
        var x = vertices[index];
        var y = vertices[index + 1];
        var z = vertices[index + 2];

        if (x > maxX) maxX = x;
        else if (x < minX) minX = x;
        if (y > maxY) maxY = y;
        else if (y < minY) minY = y;
        if (z > maxZ) maxZ = z;
        else if (z < minZ) minZ = z;
    }

    this._minimumX = minX; this._minimumY = minY; this._minimumZ = minZ;
    this._maximumX = maxX; this._maximumY = maxY; this._maximumZ = maxZ;
    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;

    this._updateCenterAndExtent();
};

HX.BoundingAABB.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === HX.BoundingVolume.EXPANSE_EMPTY || this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
        this._expanse = HX.BoundingVolume.EXPANSE_INFINITE;

    else if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = bounds._minimumX;
        this._minimumY = bounds._minimumY;
        this._minimumZ = bounds._minimumZ;
        this._maximumX = bounds._maximumX;
        this._maximumY = bounds._maximumY;
        this._maximumZ = bounds._maximumZ;
        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    }
    else {
        if (bounds._minimumX < this._minimumX)
            this._minimumX = bounds._minimumX;
        if (bounds._minimumY < this._minimumY)
            this._minimumY = bounds._minimumY;
        if (bounds._minimumZ < this._minimumZ)
            this._minimumZ = bounds._minimumZ;
        if (bounds._maximumX > this._maximumX)
            this._maximumX = bounds._maximumX;
        if (bounds._maximumY > this._maximumY)
            this._maximumY = bounds._maximumY;
        if (bounds._maximumZ > this._maximumZ)
            this._maximumZ = bounds._maximumZ;
    }

    this._updateCenterAndExtent();
}

HX.BoundingAABB.prototype.growToIncludeMinMax = function(min, max)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = min.x;
        this._minimumY = min.y;
        this._minimumZ = min.z;
        this._maximumX = max.x;
        this._maximumY = max.y;
        this._maximumZ = max.z;
        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    }
    else {
        if (min.x < this._minimumX)
            this._minimumX = min.x;
        if (min.y < this._minimumY)
            this._minimumY = min.y;
        if (min.z < this._minimumZ)
            this._minimumZ = min.z;
        if (max.x > this._maximumX)
            this._maximumX = max.x;
        if (max.y > this._maximumY)
            this._maximumY = max.y;
        if (max.z > this._maximumZ)
            this._maximumZ = max.z;
    }

    this._updateCenterAndExtent();
};

HX.BoundingAABB.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse == HX.BoundingVolume.EXPANSE_INFINITE || sourceBound._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        this.clear(sourceBound._expanse);
    else {
        var arr = matrix._m;
        var m00 = arr[0], m10 = arr[1], m20 = arr[2];
        var m01 = arr[4], m11 = arr[5], m21 = arr[6];
        var m02 = arr[8], m12 = arr[9], m22 = arr[10];

        var x = sourceBound._centerX;
        var y = sourceBound._centerY;
        var z = sourceBound._centerZ;

        this._centerX = m00 * x + m01 * y + m02 * z + arr[12];
        this._centerY = m10 * x + m11 * y + m12 * z + arr[13];
        this._centerZ = m20 * x + m21 * y + m22 * z + arr[14];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;
        x = sourceBound._halfExtentX;
        y = sourceBound._halfExtentY;
        z = sourceBound._halfExtentZ;

        this._halfExtentX = m00 * x + m01 * y + m02 * z;
        this._halfExtentY = m10 * x + m11 * y + m12 * z;
        this._halfExtentZ = m20 * x + m21 * y + m22 * z;


        this._minimumX = this._centerX - this._halfExtentX;
        this._minimumY = this._centerY - this._halfExtentY;
        this._minimumZ = this._centerZ - this._halfExtentZ;
        this._maximumX = this._centerX + this._halfExtentX;
        this._maximumY = this._centerY + this._halfExtentY;
        this._maximumZ = this._centerZ + this._halfExtentZ;
        this._expanse = sourceBound._expanse;
    }
};

// numPlanes is provided so we can provide a full frustum but skip near/far tests (useful in some cases)
// volumes
HX.BoundingAABB.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse == HX.BoundingVolume.EXPANSE_INFINITE)
        return true;
    else if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    var minX = this._minimumX, minY = this._minimumY, minZ = this._minimumZ;
    var maxX = this._maximumX, maxY = this._maximumY, maxZ = this._maximumZ;

    for (var i = 0; i < numPlanes; ++i) {
        // find the point that will always have the smallest signed distance
        var plane = cullPlanes[i];
        var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = plane.w;
        var closestX = planeX < 0? minX : maxX;
        var closestY = planeY < 0? minY : maxY;
        var closestZ = planeZ < 0? minZ : maxZ;

        // classify the closest point
        var signedDist = planeX * closestX + planeY * closestY + planeZ * closestZ + planeW;
        if (signedDist < 0.0)
            return false;
    }

    return true;
};

HX.BoundingAABB.prototype.intersectsBound = function(bound)
{
    if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY || bound._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse == HX.BoundingVolume.EXPANSE_INFINITE || bound._expanse == HX.BoundingVolume.EXPANSE_INFINITE)
        return true;

    // both AABB
    if (bound._type === this._type) {
        return 	this._maximumX > bound._minimumX &&
                this._minimumX < bound._maximumX &&
                this._maximumY > bound._minimumY &&
                this._minimumY < bound._maximumY &&
                this._maximumZ > bound._minimumZ &&
                this._minimumZ < bound._maximumZ;
    }
    else {
        return HX.BoundingVolume._testAABBToSphere(this, bound);
    }
};

HX.BoundingAABB.prototype.classifyAgainstPlane = function(plane)
{
    var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = planeW;

    var centerDist = planeX * this._centerX + planeY * this._centerY + planeZ * this._centerZ + planeW;

    if (planeX < 0) planeX = -planeX;
    if (planeY < 0) planeY = -planeY;
    if (planeZ < 0) planeZ = -planeZ;

    var intersectionDist = planeX * this._halfExtentX + planeY * this._halfExtentY + planeZ * this._halfExtentZ;

    if (centerDist > intersectionDist)
        return HX.PlaneSide.FRONT;
    else if (centerDist < -intersectionDist)
        return HX.PlaneSide.BACK;
    else
        return HX.PlaneSide.INTERSECTING;
};

HX.BoundingAABB.prototype.setExplicit = function(min, max)
{
    this._minimumX = min.x;
    this._minimumY = min.y;
    this._minimumZ = min.z;
    this._maximumX = max.x;
    this._maximumY = max.y;
    this._maximumZ = max.z;
    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    this._updateCenterAndExtent();
}

HX.BoundingAABB.prototype._updateCenterAndExtent = function()
{
    var minX = this._minimumX; var minY = this._minimumY; var minZ = this._minimumZ;
    var maxX = this._maximumX; var maxY = this._maximumY; var maxZ = this._maximumZ;
    this._centerX = (minX + maxX) * .5;
    this._centerY = (minY + maxY) * .5;
    this._centerZ = (minZ + maxZ) * .5;
    this._halfExtentX = (maxX - minX) * .5;
    this._halfExtentY = (maxY - minY) * .5;
    this._halfExtentZ = (maxZ - minZ) * .5;
};

// part of the
HX.BoundingAABB.prototype.getRadius = function()
{
    return Math.sqrt(this._halfExtentX * this._halfExtentX + this._halfExtentY * this._halfExtentY + this._halfExtentZ * this._halfExtentZ);
};

HX.BoundingAABB.prototype.createDebugModelInstance = function()
{
    return new HX.ModelInstance(HX.BoxPrimitive.create({doubleSided:true}), [this.getDebugMaterial()]);
};

/**
 *
 * @constructor
 */
HX.BoundingSphere = function()
{
    HX.BoundingVolume.call(this, HX.BoundingSphere);
};

HX.BoundingSphere.prototype = Object.create(HX.BoundingVolume.prototype);

HX.BoundingSphere.prototype.setExplicit = function(center, radius)
{
    this._centerX = center.x;
    this._centerY = center.y;
    this._centerZ = center.z;
    this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;
    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    this._updateMinAndMax();
};

HX.BoundingSphere.prototype.growToIncludeMesh = function(meshData)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    var attribute = meshData.getVertexAttribute("hx_position");
    var index = attribute.offset;
    var stride = meshData.getVertexStride();
    var vertices = attribute._vertexData;
    var len = vertices.length();
    var minX, minY, minZ;
    var maxX, maxY, maxZ;

    if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
        maxX = minX = vertices[index];
        maxY = minY = vertices[index + 1];
        maxZ = minZ = vertices[index + 2];
        index += stride;
    }
    else {
        minX = this._minimumX; minY = this._minimumY; minZ = this._minimumZ;
        maxX = this._maximumX; maxY = this._maximumY; maxZ = this._maximumZ;
    }

    for (; index < len; index += stride) {
        var x = vertices[index];
        var y = vertices[index + 1];
        var z = vertices[index + 2];

        if (x > maxX) maxX = x;
        else if (x < minX) minX = x;
        if (y > maxY) maxY = y;
        else if (y < minY) minY = y;
        if (z > maxZ) maxZ = z;
        else if (z < minZ) minZ = z;
    }
    var centerX = (maxX + minX) * .5;
    var centerY = (maxY + minY) * .5;
    var centerZ = (maxZ + minZ) * .5;
    var maxSqrRadius = 0.0;

    index = attribute.offset;
    for (; index < len; index += stride) {
        var dx = centerX - vertices[index];
        var dy = centerY - vertices[index + 1];
        var dz = centerZ - vertices[index + 2];
        var sqrRadius = dx*dx + dy*dy + dz*dz;
        if (sqrRadius > maxSqrRadius) maxSqrRadius = sqrRadius;
    }

    this._centerX = centerX;
    this._centerY = centerY;
    this._centerZ = centerZ;

    var radius = Math.sqrt(maxSqrRadius);
    this._halfExtentX = radius;
    this._halfExtentY = radius;
    this._halfExtentZ = radius;

    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;

    this._updateMinAndMax();
};

HX.BoundingSphere.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === HX.BoundingVolume.EXPANSE_EMPTY || this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
        this._expanse = HX.BoundingVolume.EXPANSE_INFINITE;

    else if (expanse == HX.BoundingVolume.EXPANSE_EMPTY) {
        this._centerX = bounds._centerX;
        this._centerY = bounds._centerY;
        this._centerZ = bounds._centerZ;
        if (bounds._type == this._type) {
            this._halfExtentX = bounds._halfExtentX;
            this._halfExtentY = bounds._halfExtentY;
            this._halfExtentZ = bounds._halfExtentZ;
        }
        else {
            this._halfExtentX = this._halfExtentY = this._halfExtentZ = bounds.getRadius();
        }
        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    }

    else {
        var minX = this._minimumX; var minY = this._minimumY; var minZ = this._minimumZ;
        var maxX = this._maximumX; var maxY = this._maximumY; var maxZ = this._maximumZ;

        if (bounds._maximumX > maxX)
            maxX = bounds._maximumX;
        if (bounds._maximumY > maxY)
            maxY = bounds._maximumY;
        if (bounds._maximumZ > maxZ)
            maxZ = bounds._maximumZ;
        if (bounds._minimumX < minX)
            minX = bounds._minimumX;
        if (bounds._minimumY < minY)
            minY = bounds._minimumY;
        if (bounds._minimumZ < minZ)
            minZ = bounds._minimumZ;

        this._centerX = (minX + maxX) * .5;
        this._centerY = (minY + maxY) * .5;
        this._centerZ = (minZ + maxZ) * .5;

        var dx = maxX - this._centerX;
        var dy = maxY - this._centerY;
        var dz = maxZ - this._centerZ;
        var radius = Math.sqrt(dx*dx + dy*dy + dz*dz);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;
    }

    this._updateMinAndMax();
};

HX.BoundingSphere.prototype.growToIncludeMinMax = function(min, max)
{
    // temp solution, not run-time perf critical
    var aabb = new HX.BoundingAABB();
    aabb.growToIncludeMinMax(min, max);
    this.growToIncludeBound(aabb);
};

HX.BoundingSphere.prototype.getRadius = function()
{
    return this._halfExtentX;
};

HX.BoundingSphere.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse == HX.BoundingVolume.EXPANSE_INFINITE || sourceBound._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        this.clear(sourceBound._expanse);
    else {
        var arr = matrix._m;
        var m00 = arr[0], m10 = arr[1], m20 = arr[2];
        var m01 = arr[4], m11 = arr[5], m21 = arr[6];
        var m02 = arr[8], m12 = arr[9], m22 = arr[10];

        var x = sourceBound._centerX;
        var y = sourceBound._centerY;
        var z = sourceBound._centerZ;

        this._centerX = m00 * x + m01 * y + m02 * z + arr[12];
        this._centerY = m10 * x + m11 * y + m12 * z + arr[13];
        this._centerZ = m20 * x + m21 * y + m22 * z + arr[14];


        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;
        x = sourceBound._halfExtentX;
        y = sourceBound._halfExtentY;
        z = sourceBound._halfExtentZ;

        var hx = m00 * x + m01 * y + m02 * z;
        var hy = m10 * x + m11 * y + m12 * z;
        var hz = m20 * x + m21 * y + m22 * z;

        var radius = Math.sqrt(hx * hx + hy * hy + hz * hz);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;

        this._minimumX = this._centerX - this._halfExtentX;
        this._minimumY = this._centerY - this._halfExtentY;
        this._minimumZ = this._centerZ - this._halfExtentZ;
        this._maximumX = this._centerX + this._halfExtentX;
        this._maximumY = this._centerX + this._halfExtentY;
        this._maximumZ = this._centerX + this._halfExtentZ;

        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    }
};

// tests against a convex solid bounded by planes (fe: a frustum)
// numPlanes is provided so we can provide a full frustum but skip near/far tests (useful in some cases)
HX.BoundingSphere.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse == HX.BoundingVolume.EXPANSE_INFINITE)
        return true;
    else if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    var centerX = this._centerX, centerY = this._centerY, centerZ = this._centerZ;
    var negRadius = -this._halfExtentX;

    for (var i = 0; i < numPlanes; ++i) {
        var plane = cullPlanes[i];
        var signedDist = plane.x * centerX + plane.y * centerY + plane.z * centerZ + plane.w;

        if (signedDist < negRadius) {
            return false;
        }
    }

    return true;
};

HX.BoundingSphere.prototype.intersectsBound = function(bound)
{
    if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY || bound._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse == HX.BoundingVolume.EXPANSE_INFINITE || bound._expanse == HX.BoundingVolume.EXPANSE_INFINITE)
        return true;

    // both Spheres
    if (bound._type === this._type) {
        var dx = this._centerX - bound._centerX;
        var dy = this._centerY - bound._centerY;
        var dz = this._centerZ - bound._centerZ;
        var touchDistance = this._halfExtentX + bound._halfExtentX;
        return dx*dx + dy*dy + dz*dz < touchDistance*touchDistance;
    }
    else
        return HX.BoundingVolume._testAABBToSphere(bound, this);
};

HX.BoundingSphere.prototype.classifyAgainstPlane = function(plane)
{
    var dist = plane.x * this._centerX + plane.y * this._centerY + plane.z * this._centerZ + plane.w;
    var radius = this._halfExtentX;
    if (dist > radius) return HX.PlaneSide.FRONT;
    else if (dist < -radius) return HX.PlaneSide.BACK;
    else return HX.PlaneSide.INTERSECTING;
};

HX.BoundingSphere.prototype._updateMinAndMax = function()
{
    var centerX = this._centerX, centerY = this._centerY, centerZ = this._centerZ;
    var radius = this._halfExtentX;
    this._minimumX = centerX - radius;
    this._minimumY = centerY - radius;
    this._minimumZ = centerZ - radius;
    this._maximumX = centerX + radius;
    this._maximumY = centerY + radius;
    this._maximumZ = centerZ + radius;
};

HX.BoundingSphere.prototype.createDebugModelInstance = function()
{
    return new HX.ModelInstance(HX.SpherePrimitive.create({doubleSided:true}), [this.getDebugMaterial()]);
};

HX.FixedAABB = function()
{
    HX.BoundingAABB.call(this);
};

HX.FixedAABB.prototype = Object.create(HX.BoundingAABB.prototype);


HX.BoundingVolume._debugMaterialXML = '\
<?xml version="1.0" encoding="UTF-8"?>\n\
<material>\n\
    <shaders>\n\
        <shader id="vertexShader">\n\
            void main()\n\
            {\n\
                gl_Position = hx_wvpMatrix * hx_position;\n\
            }\n\
        </shader>\n\
        <shader id="fragmentShader">\n\
            uniform vec4 color;\n\
            \n\
            void main()\n\
            {\n\
                gl_FragColor = color;\n\
            }\n\
        </shader>\n\
    </shaders>\n\
    <passes>\n\
        <preEffect>\n\
            <element>lines</element>\n\
            <vertex>vertexShader</vertex>\n\
            <fragment>fragmentShader</fragment>\n\
        </preEffect>\n\
    </passes>\n\
    <uniforms>\n\
        <color value="1.0, 0.0, 1.0, 1.0"/>\n\
    </uniforms>\n\
</material>';
/**
 * Hexadecimal representations are always 0xAARRGGBB
 * @param rOrHex
 * @param g
 * @param b
 * @param a
 * @constructor
 */
HX.Color = function(rOrHex, g, b, a)
{
    this.set(rOrHex, g, b, a);
};

HX.Color.prototype =
{
    set: function(rOrHex, g, b, a)
    {
        if (rOrHex === undefined) {
            this.a = 1.0;
            this.r = 1.0;
            this.g = 1.0;
            this.b = 1.0;
        }
        else if (g === undefined) {
            this.a = 1.0;
            this.r = ((rOrHex & 0xff0000) >>> 16) / 255.0;
            this.g = ((rOrHex & 0x00ff00) >>> 8) / 255.0;
            this.b = (rOrHex & 0x0000ff) / 255.0;
        }
        else {
            this.r = rOrHex;
            this.g = g;
            this.b = b;
            this.a = a === undefined ? 1.0 : a;
        }
    },

    hex: function()
    {
        var r = (Math.min(this.r, 1.0) * 0xff);
        var g = (Math.min(this.g, 1.0) * 0xff);
        var b = (Math.min(this.b, 1.0) * 0xff);

        return (r << 16) | (g << 8) | b;
    },

    luminance: function()
    {
        return this.r*.30 + this.g*0.59 + this.b*.11;
    },

    gammaToLinear: function(target)
    {
        target = target || new HX.Color();

        target.r = Math.pow(this.r, 2.2);
        target.g = Math.pow(this.g, 2.2);
        target.b = Math.pow(this.b, 2.2);
        target.a = this.a;

        return target;
    },

    linearToGamma: function(target)
    {
        target = target || new HX.Color();

        target.r = Math.pow(this.r,.454545);
        target.g = Math.pow(this.g,.454545);
        target.b = Math.pow(this.b,.454545);
        target.a = this.a;

        return target;
    }
};
/**
 *
 * @constructor
 */
HX.IndexBuffer = function()
{
    this._buffer = HX.GL.createBuffer();
}

HX.IndexBuffer.prototype = {
    constructor: HX.IndexBuffer,

    /**
     * Uploads data for the buffer.
     * @param data The data to upload, must be a Int16Array object.
     * @param usageHint An optional usage hint for the buffer.
     */
    uploadData: function(data, usageHint)
    {
        if (usageHint === undefined)
            usageHint = HX.GL.STATIC_DRAW;

        this.bind();
        HX.GL.bufferData(HX.GL.ELEMENT_ARRAY_BUFFER, data, usageHint);
    },

    dispose: function()
    {
        if (this._buffer) {
            HX.GL.deleteBuffer(this._buffer);
            this._buffer = 0;
        }
    },

    /**
     * @private
     */
    bind: function()
    {
        HX.GL.bindBuffer(HX.GL.ELEMENT_ARRAY_BUFFER, this._buffer);
    }
}
/**
 * PropertyListener allows listening to changes to other objects' properties. When a change occurs, the onChange signal will be dispatched.
 * It's a bit hackish, but it prevents having to dispatch signals in performance-critical classes such as Float4.
 * @constructor
 */
HX.PropertyListener = function()
{
    this._enabled = true;
    this.onChange = new HX.Signal();
    this._targets = [];
};

HX.PropertyListener.prototype =
{
    /**
     * If false, prevents the PropertyListener from dispatching change events.
     */
    get enabled()
    {
        return this._enabled;
    },

    set enabled(value)
    {
        this._enabled = value;
    },

    /**
     * Starts listening to changes for an object's property for changes.
     * @param targetObj The target object to monitor.
     * @param propertyName The name of the property for which we'll be listening.
     */
    add: function(targetObj, propertyName)
    {
        var index = this._targets.length;
        this._targets.push(
            {
                object: targetObj,
                propertyName: propertyName,
                value: targetObj[propertyName]
            }
        );

        var wrapper = this;
        var target = wrapper._targets[index];
        Object.defineProperty(targetObj, propertyName, {
            get: function() {
                return target.value;
            },
            set: function(val) {
                if (val !== target.value) {
                    target.value = val;
                    if (wrapper._enabled)
                        wrapper.onChange.dispatch();
                }
            }
        });
    },

    /**
     * Stops listening to a property for changes.
     * @param targetObj The object to stop monitoring.
     * @param propertyName The name of the property for which we'll be listening.
     */
    remove: function(targetObj, propertyName)
    {
        for (var i = 0; i < this._targets.length; ++i) {
            var target = this._targets[i];
            if (target.object === targetObj && target.propertyName === propertyName) {
                delete target.object[target.propertyName];
                target.object[target.propertyName] = target.value;
                this._targets.splice(i--, 1);
            }
        }
    }
};
HX.Signal = function()
{
    this._listeners = [];
    this._lookUp = {};
};

/**
 * Signals keep "this" of the caller, because having this refer to the signal itself would be silly
 */
HX.Signal.prototype =
{
    bind: function(thisRef, listener)
    {
        this._lookUp[listener] = this._listeners.length;
        this._listeners.push(listener.bind(thisRef));
    },

    unbind: function(listener)
    {
        var index = this._lookUp[listener];
        this._listeners.splice(index, 1);
        delete this._lookUp[listener];
    },

    dispatch: function()
    {
        var len = this._listeners.length;
        for (var i = 0; i < len; ++i)
            this._listeners[i]();
    }
};
HX.URLLoader = function ()
{
    this._params = undefined;
    this._data = null;
    this._timeout = 5000;
    this._method = 'GET';
    this._type = HX.URLLoader.DATA_TEXT;
};

HX.URLLoader.ERROR_TIME_OUT = 408;
HX.URLLoader.METHOD_GET = 'get';
HX.URLLoader.METHOD_POST = 'post';

HX.URLLoader.DATA_TEXT = 0;
HX.URLLoader.DATA_BINARY = 1;

HX.URLLoader.prototype =
{
    getType: function()
    {
        return this._type;
    },

    setType: function(type)
    {
        this._type = type;
    },

    getData: function ()
    {
        return this._data;
    },

    getMethod: function ()
    {
        return this._method;
    },

    setMethod: function (value)
    {
        this._method = value;
    },

    getTimeoutDuration: function ()
    {
        return this._timeout;
    },

    setTimeoutDuration: function (milliseconds)
    {
        this._timeout = milliseconds;
    },

    setParameters: function (params)
    {
        this._params = params;
    },

    load: function (url)
    {
        var request = new XMLHttpRequest();
        request.open(this._method, url, true);
        request.timeout = this._timeout;
        var _this = this;

        request.ontimeout = function ()
        {
            _this.onError(HX.URLLoader.ERROR_TIME_OUT);
        };

        request.onreadystatechange = function ()
        {
            var DONE = this.DONE || 4;
            if (this.readyState === DONE) {
                if (this.status == 200) {
                    this._data = this._type == HX.URLLoader.DATA_TEXT? request.responseText : request.response;
                    if (_this.onComplete) _this.onComplete(this._data);
                }
                else if (_this.onError)
                    _this.onError(this.status);
            }
        };

        request.send(this._params);
    },

    // made to assign
    onComplete: function (onComplete)
    {
    },

    onError: function (errorStatus)
    {
    }
};
/**
 *
 * @constructor
 */
HX.VertexBuffer = function()
{
    this._buffer = HX.GL.createBuffer();
}

HX.VertexBuffer.prototype = {
    constructor: HX.VertexBuffer,

    /**
     * Uploads data for the buffer.
     * @param data The data to upload, must be a Float32Array object.
     * @param usageHint An optional usage hint for the buffer.
     */
    uploadData: function(data, usageHint)
    {
        if (usageHint === undefined)
            usageHint = HX.GL.STATIC_DRAW;

        this.bind();
        HX.GL.bufferData(HX.GL.ARRAY_BUFFER, data, usageHint);
    },

    dispose: function()
    {
        if (this._buffer) {
            HX.GL.deleteBuffer(this._buffer);
            this._buffer = 0;
        }
    },

    /**
     * @private
     */
    bind: function()
    {
        HX.GL.bindBuffer(HX.GL.ARRAY_BUFFER, this._buffer);
    }
}
/**
 *
 * @param vertexShaderCode
 * @param fragmentShaderCode
 * @param preVertexCode Can contain defines and other things that need to be in there before any other includes (fe: extensions)
 * @param preFragmentCode Can contain defines and other things that need to be in there before any other includes
 * @constructor
 */
HX.Shader = function(vertexShaderCode, fragmentShaderCode, preVertexCode, preFragmentCode)
{
    // can be vertex or fragment shader
    // Mesh object's vertexLayout should have a map of attrib names + offset into vertex buffer
    // - on meshInstance creation:
    //      -> create map of attribute index -> buffer offset
    //      -> this by binding programme and asking gl for attrib locations
    this._ready = false;
    this._vertexShader = null;
    this._fragmentShader = null;
    this._program = null;
    this._renderOrderHint = ++HX.Shader.ID_COUNTER;

    if (vertexShaderCode && fragmentShaderCode) {
        this.init(vertexShaderCode, fragmentShaderCode, preVertexCode, preFragmentCode);
    }
};

HX.Shader.ID_COUNTER = 0;

HX.Shader.prototype = {
    constructor: HX.Shader,

    isReady: function() { return this._ready; },

    init: function(vertexShaderCode, fragmentShaderCode, preVertexCode, preFragmentCode)
    {
        preVertexCode = (preVertexCode || "") + "\n";
        preFragmentCode = (preFragmentCode || "") + "\n";
        vertexShaderCode = preVertexCode + HX.GLSLIncludeGeneral + vertexShaderCode;
        fragmentShaderCode = preFragmentCode + HX.GLSLIncludeGeneral + fragmentShaderCode;

        this._vertexShader = HX.GL.createShader(HX.GL.VERTEX_SHADER);
        if (!this._initShader(this._vertexShader, vertexShaderCode)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError) {
                throw new Error("Failed generating vertex shader: \n" + vertexShaderCode);
            }
            else {
                console.log("Failed generating vertex shader");
                console.log(vertexShaderCode);
            }

            return;
        }

        this._fragmentShader = HX.GL.createShader(HX.GL.FRAGMENT_SHADER);
        if (!this._initShader(this._fragmentShader, fragmentShaderCode)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError) {
                throw new Error("Failed generating fragment shader: \n" + fragmentShaderCode);
            }
            else {
                console.log("Failed generating fragment shader:");
                console.log(fragmentShaderCode);
            }
            return;
        }

        this._program = HX.GL.createProgram();

        HX.GL.attachShader(this._program, this._vertexShader);
        HX.GL.attachShader(this._program, this._fragmentShader);
        HX.GL.linkProgram(this._program);

        if (!HX.GL.getProgramParameter(this._program, HX.GL.LINK_STATUS)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError) {
                throw new Error("Error in program linking:" + HX.GL.getProgramInfoLog(this._program));
            }
            else {
                console.warn("Error in program linking:" + HX.GL.getProgramInfoLog(this._program));
            }

            return;
        }

        this._ready = true;
    },

    updateRenderState: function()
    {
        HX.GL.useProgram(this._program);
    },

    _initShader: function(shader, code)
    {
        HX.GL.shaderSource(shader, code);
        HX.GL.compileShader(shader);

        // Check the compile status, return an error if failed
        if (!HX.GL.getShaderParameter(shader, HX.GL.COMPILE_STATUS)) {
            throw new Error(HX.GL.getShaderInfoLog(shader));
            console.warn(HX.GL.getShaderInfoLog(shader));
            return false;
        }

        return true;
    },

    dispose: function()
    {
        HX.GL.deleteShader(this._vertexShader);
        HX.GL.deleteShader(this._fragmentShader);
        HX.GL.deleteProgram(this._program);

        this._ready = false;
    },

    getProgram: function() { return this._program; },

    getVertexAttributeIndex: function(name)
    {
        return HX.GL.getAttribLocation(this._program, name);
    }
};
HX.TextureSlot = function() {
    this.location = -1;
    this.texture = null;
};

/**
 *
 * @param shader
 * @constructor
 */
HX.MaterialPass = function (shader)
{
    this._shader = shader;
    this._textureSlots = [];
    this._uniforms = {};
    this._elementType = HX.ElementType.TRIANGLES;
    this._cullMode = HX.CullMode.BACK;
    this._blending = false;
    this._blendSource = HX.BlendFactor.ONE;
    this._blendDest = HX.BlendFactor.ZERO;
    this._blendOperator = HX.BlendOperation.ADD;
    this._gbuffer = null;
    this._enabled = true;

    this._storeUniforms();
    //this._sourceSlot = this.getTextureSlot("hx_source");
};

HX.MaterialPass.GEOMETRY_PASS = 0;

// used for post-lighting
HX.MaterialPass.POST_LIGHT_PASS = 1;

// used for transparent rendering
HX.MaterialPass.TRANSPARENT_DIFFUSE_PASS = 2;
HX.MaterialPass.TRANSPARENT_SPECULAR_PASS = 3;

HX.MaterialPass.POST_PASS = 4;

// the individual pass type are not taken into account, they will be dealt with specially
HX.MaterialPass.NUM_PASS_TYPES = 5;

// only used by the old renderer, will be removed at some point
// use diffuse as alias for geometry pass
HX.MaterialPass.GEOMETRY_COLOR_PASS = HX.MaterialPass.GEOMETRY_PASS;
HX.MaterialPass.GEOMETRY_NORMAL_PASS = HX.MaterialPass.NUM_PASS_TYPES++;
HX.MaterialPass.GEOMETRY_SPECULAR_PASS = HX.MaterialPass.NUM_PASS_TYPES++;

HX.MaterialPass.prototype = {
    constructor: HX.MaterialPass,

    getShader: function ()
    {
        return this._shader;
    },

    setElementType: function(value)
    {
        this._elementType = value;
    },

    getElementType: function()
    {
        return this._elementType;
    },

    // use null for disabled
    setCullMode: function(value)
    {
        this._cullMode = value;
    },

    getCullMode: function()
    {
        return this._cullMode;
    },

    disableBlendMode: function()
    {
        this._blending = false;
    },

    setBlendMode: function(source, dest, op)
    {
        this._blending = true;
        this._blendSource = source;
        this._blendDest = dest;
        this._blendOperator = op;
    },

    assignSourceBuffer: function(source)
    {
        if (this._sourceSlot)
            this._sourceSlot.texture = source;
    },

    assignGBuffer: function(gbuffer)
    {
        // todo: only do this when gbuffer changed
        if (this._gbuffer != gbuffer) {
            this._gbuffer = gbuffer;
            this.setTexture("hx_gbufferColor", gbuffer[0]);
            this.setTexture("hx_gbufferNormals", gbuffer[1]);
            this.setTexture("hx_gbufferSpecular", gbuffer[2]);
            this.setTexture("hx_gbufferDepth", gbuffer[3]);
        }
    },

    updateRenderState: function ()
    {
        this._shader.updateRenderState();

        var len = this._textureSlots.length;

        for (var i = 0; i < len; ++i) {
            var slot = this._textureSlots[i];
            var texture = slot.texture;

            if (texture.isReady()) {
                texture.bind(i);
            }
            else {
                texture._default.bind(i);
            }
        }
    },

    _storeUniforms: function()
    {
        var len = HX.GL.getProgramParameter(this._shader._program, HX.GL.ACTIVE_UNIFORMS);

        for (var i = 0; i < len; ++i) {
            var uniform = HX.GL.getActiveUniform(this._shader._program, i)
            var name = uniform.name;
            var location = HX.GL.getUniformLocation(this._shader._program, name);
            this._uniforms[name] = {type: uniform.type, location: location, size: uniform.size};
        }
    },

    getTextureSlot: function(slotName)
    {
        if (!this._uniforms.hasOwnProperty(slotName)) return null;

        HX.GL.useProgram(this._shader._program);

        var uniform = this._uniforms[slotName];

        if (!uniform) return;

        var location = uniform.location;

        var slot = null;

        // reuse if location is already used
        var len = this._textureSlots.length;
        for (var i = 0; i < len; ++i) {
            if (this._textureSlots[i].location === location) {
                slot = this._textureSlots[i];
                break;
            }
        }

        if (slot == null) {
            slot = new HX.TextureSlot();
            this._textureSlots.push(slot);
            HX.GL.uniform1i(location, i);
            slot.location = location;
        }

        return slot;
    },

    setTexture: function(slotName, texture)
    {
        var slot = this.getTextureSlot(slotName);
        if (slot)
            slot.texture = texture;
    },

    getUniformLocation: function(name)
    {
        if (this._uniforms.hasOwnProperty(name))
            return this._uniforms[name].location;
    },

    setUniformArray: function(name, value)
    {
        name = name + "[0]";

        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];

        HX.GL.useProgram(this._shader._program);

        switch(uniform.type) {
            case HX.GL.FLOAT:
                HX.GL.uniform1fv(uniform.location, value);
                break;
            case HX.GL.FLOAT_VEC2:
                HX.GL.uniform2fv(uniform.location, value);
                break;
            case HX.GL.FLOAT_VEC3:
                HX.GL.uniform3fv(uniform.location, value);
                break;
            case HX.GL.FLOAT_VEC4:
                HX.GL.uniform4fv(uniform.location, value);
                break;
            case HX.GL.INT:
                HX.GL.uniform1iv(uniform.location, value);
                break;
            case HX.GL.INT_VEC2:
                HX.GL.uniform2iv(uniform.location, value);
                break;
            case HX.GL.INT_VEC3:
                HX.GL.uniform3iv(uniform.location, value);
                break;
            case HX.GL.INT_VEC4:
                HX.GL.uniform1iv(uniform.location, value);
                break;
            case HX.GL.BOOL:
                HX.GL.uniform1bv(uniform.location, value);
                break;
            case HX.GL.BOOL_VEC2:
                HX.GL.uniform2bv(uniform.location, value);
                break;
            case HX.GL.BOOL_VEC3:
                HX.GL.uniform3bv(uniform.location, value);
                break;
            case HX.GL.BOOL_VEC4:
                HX.GL.uniform4bv(uniform.location, value);
                break;
            default:
                throw "Unsupported uniform format for setting. May be a todo.";

        }
    },

    setUniform: function(name, value)
    {
        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];

        HX.GL.useProgram(this._shader._program);

        switch(uniform.type) {
            case HX.GL.FLOAT:
                HX.GL.uniform1f(uniform.location, value);
                break;
            case HX.GL.FLOAT_VEC2:
                HX.GL.uniform2f(uniform.location, value.x, value.y);
                break;
            case HX.GL.FLOAT_VEC3:
                HX.GL.uniform3f(uniform.location, value.x || value.r, value.y || value.g, value.z || value.b );
                break;
            case HX.GL.FLOAT_VEC4:
                HX.GL.uniform4f(uniform.location, value.x || value.r, value.y || value.g, value.z || value.b, value.w || value.a);
                break;
            case HX.GL.INT:
                HX.GL.uniform1i(uniform.location, value);
                break;
            case HX.GL.INT_VEC2:
                HX.GL.uniform2i(uniform.location, value.x, value.y);
                break;
            case HX.GL.INT_VEC3:
                HX.GL.uniform3i(uniform.location, value.x, value.y, value.z);
                break;
            case HX.GL.INT_VEC4:
                HX.GL.uniform1i(uniform.location, value.x, value.y, value.z, value.w);
                break;
            case HX.GL.BOOL:
                HX.GL.uniform1i(uniform.location, value);
                break;
            case HX.GL.BOOL_VEC2:
                HX.GL.uniform2i(uniform.location, value.x, value.y);
                break;
            case HX.GL.BOOL_VEC3:
                HX.GL.uniform3i(uniform.location, value.x, value.y, value.z);
                break;
            case HX.GL.BOOL_VEC4:
                HX.GL.uniform4i(uniform.location, value.x, value.y, value.z, value.w);
                break;
            default:
                throw "Unsupported uniform format for setting. May be a todo.";

        }
    },

    isEnabled: function() { return this._enabled; },
    setEnabled: function(value) { this._enabled = value; }
};

/**
 *
 * @constructor
 */
HX.Material = function ()
{
    this._passes = new Array(HX.Material.NUM_TOTAL_PASS_TYPES);
    this._renderOrderHint = ++HX.Material.ID_COUNTER;
    this.onChange = new HX.Signal();
    this._textures = {};
    this._uniforms = {};
};

HX.Material.parseFromXML = function(xml)
{
    var material = new HX.Material();
    HX.Material._parseXMLTo(xml, material);
    return material;
};

HX.Material._parseXMLTo = function(xml, material)
{
    HX.Material._parseGeometryPassFromXML(xml, material);

    HX.Material._parsePassFromXML(xml, HX.MaterialPass.POST_LIGHT_PASS, "preEffect", material);
    HX.Material._parsePassFromXML(xml, HX.MaterialPass.POST_PASS, "post", material);

    var uniforms = xml.getElementsByTagName("uniforms")[0];

    if (uniforms) {
        var node = uniforms.firstChild;

        while (node) {
            if (node.nodeName != "#text") {
                var value = node.getAttribute("value").split(",");
                if (value.length == 1)
                    material.setUniform(node.nodeName, Number(value[0]), false);
                else
                    material.setUniform(node.nodeName, {x: Number(value[0]), y: Number(value[1]), z: Number(value[2]), w: Number(value[3])}, false);
            }

            node = node.nextSibling;
        }
    }

    // assign default textures
    material.setTexture("hx_dither2D", HX.DEFAULT_2D_DITHER_TEXTURE);
};

HX.Material._translateProperty = function(value)
{
    if (!HX.Material._properties) {
        HX.Material._properties = {
            back: HX.GL.BACK,
            front: HX.CullMode.FRONT,
            both: HX.CullMode.ALL,
            none: null,
            lines: HX.ElementType.LINES,
            points: HX.ElementType.POINTS,
            triangles: HX.ElementType.TRIANGLES,
            one: HX.BlendFactor.ONE,
            zero: HX.BlendFactor.ZERO,
            sourceColor: HX.BlendFactor.SOURCE_COLOR,
            oneMinusSourceColor: HX.BlendFactor.ONE_MINUS_SOURCE_COLOR,
            sourceAlpha: HX.BlendFactor.SOURCE_ALPHA,
            oneMinusSourceAlpha: HX.BlendFactor.ONE_MINUS_SOURCE_ALPHA,
            destinationAlpha: HX.BlendFactor.DST_ALPHA,
            oneMinusDestinationAlpha: HX.BlendFactor.ONE_MINUS_DESTINATION_ALPHA,
            destinationColor: HX.BlendFactor.DESTINATION_COLOR,
            sourceAlphaSaturate: HX.BlendFactor.SOURCE_ALPHA_SATURATE,
            add: HX.BlendOperation.ADD,
            subtract: HX.BlendOperation.SUBTRACT,
            reverseSubtract: HX.BlendOperation.REVERSE_SUBTRACT
        }
    }

    return HX.Material._properties[value];
};

HX.MaterialPass.DST_ALPHA = "disabled";
HX.MaterialPass.ONE_MINUS_SRC_COLOR = "disabled";


HX.Material._decodeHTML = function(value)
{
    var e = document.createElement('div');
    e.innerHTML = value;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

HX.Material._addParsedPass = function (vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, passType, geometryTypeDef)
{
    if (geometryTypeDef) {
        geometryTypeDef = "#define " + geometryTypeDef + "\n";
    }

    var shader = new HX.Shader(vertexShader, fragmentShader, geometryTypeDef, geometryTypeDef);
    var pass = new HX.MaterialPass(shader);

    if (elements)
        pass.setElementType(HX.Material._translateProperty(elements.innerHTML));

    if (cullmode)
        pass.setCullMode(HX.Material._translateProperty(cullmode.innerHTML));

    if (blend) {
        var source = blend.getElementsByTagName("source")[0];
        var dest = blend.getElementsByTagName("destination")[0];
        var op = blend.getElementsByTagName("operator")[0];
        source = source ? HX.Material._translateProperty(source.innerHTML) : HX.GL.ONE;
        dest = dest ? HX.Material._translateProperty(dest.innerHTML) : HX.GL.ZERO;
        op = source ? HX.Material._translateProperty(op.innerHTML) : HX.GL.FUNC_ADD;
        pass.setBlendMode(source, dest, op);
    }

    targetMaterial.setPass(passType, pass);
};
HX.Material._parsePassFromXML = function(xml, passType, tagName, targetMaterial)
{
    var common = xml.getElementsByTagName("common")[0];
    common = common ? common.innerHTML : "";
    var tags = xml.getElementsByTagName(tagName);
    if (tags === undefined || tags.length === 0) return;
    var passDef = tags[0];

    var vertexShaderID = passDef.getElementsByTagName("vertex")[0].innerHTML;
    var fragmentShaderID = passDef.getElementsByTagName("fragment")[0].innerHTML;
    var elements = passDef.getElementsByTagName("element")[0];
    var cullmode = passDef.getElementsByTagName("cullmode")[0];
    var blend = passDef.getElementsByTagName("blend")[0];

    var vertexShader = common + xml.querySelector("[id=" + vertexShaderID + "]").innerHTML;
    var fragmentShader = common + xml.querySelector("[id=" + fragmentShaderID + "]").innerHTML;
    vertexShader = HX.Material._decodeHTML(vertexShader);
    fragmentShader = HX.Material._decodeHTML(fragmentShader);

    if (passType === HX.MaterialPass.GEOMETRY_PASS && !HX.EXT_DRAW_BUFFERS) {
        this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, passType);
    }
    else {
        this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.GEOMETRY_COLOR_PASS, "NO_MRT_GBUFFER_COLOR");
        this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.GEOMETRY_NORMAL_PASS, "NO_MRT_GBUFFER_NORMALS");
        this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.GEOMETRY_SPECULAR_PASS, "NO_MRT_GBUFFER_SPECULAR");
    }
};

HX.Material.ID_COUNTER = 0;

HX.Material.prototype = {
    constructor: HX.Material,

    getPass: function (type)
    {
        return this._passes[type];
    },

    setPass: function (type, pass)
    {
        this._passes[type] = pass;

        if (pass) {
            pass._renderOrderHint = this._renderOrderHint;
            for (var slotName in this._textures) {
                if (this._textures.hasOwnProperty(slotName))
                    pass.setTexture(slotName, this._textures[slotName]);
            }

            for (var uniformName in this._uniforms)
                if (this._uniforms.hasOwnProperty(uniformName)) {
                    if (uniformName.charAt(uniformName.length-1) == ']')
                        pass.setUniformArray(uniformName.substr(0, uniformName.length - 3), this._uniforms[uniformName]);
                    else
                        pass.setUniform(uniformName, this._uniforms[uniformName]);
                }
        }

        this.onChange.dispatch();
    },

    hasPass: function (type)
    {
        return !!this._passes[type];
    },

    setTexture: function(slotName, texture)
    {
        this._textures[slotName] = texture;

        for (var i = 0; i < HX.MaterialPass.NUM_TOTAL_PASS_TYPES; ++i)
            if (this.hasPass(i)) this._passes[i].setTexture(slotName, texture);
    },

    /**
     *
     * @param name
     * @param value
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniform: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name))
            return;

        this._uniforms[name] = value;

        for (var i = 0; i < HX.MaterialPass.NUM_TOTAL_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniform(name, value);
        }
    },

    /**
     *
     * @param name
     * @param value
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniformArray: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name + '[0]'))
            return;

        this._uniforms[name + '[0]'] = value;

        for (var i = 0; i < HX.MaterialPass.NUM_TOTAL_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniformArray(name, value);
        }
    }

};

HX.FileMaterial = function(url, onComplete, onError)
{
    HX.Material.call(this);

    var urlLoader = new HX.URLLoader();
    var material = this;

    urlLoader.onComplete = function(data) {
        var parser = new DOMParser();
        var xml = parser.parseFromString(data, "text/xml");

        HX.Material._parseXMLTo(xml, material);

        if (onComplete) onComplete();
    };

    urlLoader.onError = function(code) {
        console.warn("Failed loading " + url + ". Error code: " + code);
        if (onError) onError(code);
    };

    urlLoader.load(url);
};

HX.FileMaterial.prototype = Object.create(HX.Material.prototype);
// basic version is non-hierarchical, for use with lights etc
/**
 *
 * @constructor
 */
HX.SceneNode = function()
{
    HX.Transform.call(this);
    this._effects = null;
    this._worldTransformMatrix = new HX.Matrix4x4();
    this._worldBoundsInvalid = true;
    this._matrixInvalid = true;
    this._worldMatrixInvalid = true;
    this._parent = null;
    this._worldBounds = this._createBoundingVolume();
    this._debugBounds = null;

    // used to determine sorting index for the render loop
    // models can use this to store distance to camera for more efficient rendering, lights use this to sort based on
    // intersection with near plane, etc
    this._renderOrderHint = 0.0;
};



HX.SceneNode.prototype = Object.create(HX.Transform.prototype);

Object.defineProperty(HX.SceneNode.prototype, "effects", {
    get: function()
    {
        return this._effects;
    },

    set: function(value)
    {
        this._effects = value;
    }
});


HX.SceneNode.prototype.setTransformationMatrix = function(matrix)
{
    HX.Transform.prototype.setTransformationMatrix.call(this, matrix);

    this._invalidateWorldTransformationMatrix();
}

HX.SceneNode.prototype.getWorldMatrix = function()
{
    if (this._worldMatrixInvalid)
        this._updateWorldTransformationMatrix();

    return this._worldTransformMatrix;
};

// always go through here to get to world bounds!
HX.SceneNode.prototype.getWorldBounds = function()
{
    if (this._worldBoundsInvalid) {
        this._updateWorldBounds();
        this._worldBoundsInvalid = false;
    }

    return this._worldBounds;
};

HX.SceneNode.prototype.acceptVisitor = function(visitor)
{
    if (this._effects)
        visitor.visitEffects(this._effects, this);

    if (this._debugBounds)
        this._debugBounds.acceptVisitor(visitor);
};

HX.SceneNode.prototype.getShowDebugBounds = function()
{
    return this._debugBounds !== null;
};

HX.SceneNode.prototype.setShowDebugBounds = function(value)
{
    if (this.getShowDebugBounds() === value) return;

    if (value) {
        this._debugBounds = new HX.ModelNode(this._worldBounds.getDebugModelInstance());
        this._debugBounds.setTransform(null);
        this._updateDebugBounds();
    }
    else
        this._debugBounds = null;
};

HX.SceneNode.prototype._invalidateTransformationMatrix = function ()
{
    HX.Transform.prototype._invalidateTransformationMatrix.call(this);
    this._invalidateWorldTransformationMatrix();
};

HX.SceneNode.prototype._invalidateWorldTransformationMatrix = function ()
{
    this._worldMatrixInvalid = true;
    this._invalidateWorldBounds();
};

HX.SceneNode.prototype._invalidateWorldBounds = function (tellParent)
{
    if (this._worldBoundsInvalid) return;

    this._worldBoundsInvalid = true;

    if (tellParent !== false && this._parent)
        this._parent._invalidateWorldBounds();
};

HX.SceneNode.prototype._updateWorldBounds = function ()
{
    if (this._debugBounds)
        this._updateDebugBounds();
};

HX.SceneNode.prototype._updateDebugBounds = function()
{
    var matrix = this._debugBounds.getTransformationMatrix();
    var bounds = this._worldBounds;

    matrix.scaleMatrix(bounds._halfExtentX * 2.0, bounds._halfExtentY * 2.0, bounds._halfExtentZ * 2.0);
    matrix.appendTranslation(bounds._centerX, bounds._centerY, bounds._centerZ);
    this._debugBounds.setTransformationMatrix(matrix);
};

HX.SceneNode.prototype._updateTransformationMatrix = function()
{
    HX.Transform.prototype._updateTransformationMatrix.call(this);
    this._worldBoundsInvalid = true;
};

HX.SceneNode.prototype._updateWorldTransformationMatrix = function()
{
    if (this._parent)
        this._worldTransformMatrix.product(this._parent.getWorldMatrix(), this.getTransformationMatrix());
    else
        this._worldTransformMatrix.copyFrom(this.getTransformationMatrix());

    this._worldMatrixInvalid = false;
};

// override for better matches
HX.SceneNode.prototype._createBoundingVolume = function()
{
    return new HX.BoundingAABB();
};

/**
 *
 * @constructor
 */
HX.BoundingHierarchyNode = function()
{
    HX.SceneNode.call(this);
    this._children = [];
};

HX.BoundingHierarchyNode.prototype = Object.create(HX.SceneNode.prototype);

HX.BoundingHierarchyNode.prototype.attach = function(child)
{
    if (child._parent)
        throw "Child is already parented!";

    child._parent = this;

    this._children.push(child);
    this._invalidateWorldBounds();
};

HX.BoundingHierarchyNode.prototype.detach = function(child)
{
    var index = this._children.indexOf(child);

    if (index < 0)
        throw "Trying to remove a scene object that is not a child";

    child._parent = null;

    this._children.splice(index, 1);
    this._invalidateWorldBounds();
};

HX.BoundingHierarchyNode.prototype.numChildren = function() { return this._children.length; };

HX.BoundingHierarchyNode.prototype.getChild = function(index) { return this._children[index]; };


HX.BoundingHierarchyNode.prototype.acceptVisitor = function(visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);

    var len = this._children.length;

    for (var i = 0; i < len; ++i) {
        var child = this._children[i];
        if (visitor.qualifies(child))
            child.acceptVisitor(visitor);
    }
};


HX.BoundingHierarchyNode.prototype._invalidateWorldBounds = function()
{
    HX.SceneNode.prototype._invalidateWorldBounds.call(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldBounds(false); // false = parent (ie: this) does not need to know, it already knows
};

HX.BoundingHierarchyNode.prototype._invalidateWorldTransformationMatrix = function()
{
    HX.SceneNode.prototype._invalidateWorldTransformationMatrix.call(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldTransformationMatrix();
};

HX.BoundingHierarchyNode.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear();

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._worldBounds.growToIncludeBound(this._children[i].getWorldBounds());

    HX.SceneNode.prototype._updateWorldBounds.call(this);
};

/**
 * Creates a new Scene object
 * @param rootNode (optional) A rootnode to be used, allowing different partition types to be used as the root.
 * @constructor
 */
HX.Scene = function(rootNode)
{
    // the default partition is a BVH node
    //  -> or this may need to become an infinite bound node?
    this._rootNode = rootNode || new HX.BoundingHierarchyNode();
    this._skybox = null;
};

HX.Scene.prototype = {
    constructor: HX.Scene,

    get skybox() { return this._skybox; },
    set skybox(value) { this._skybox = value; },

    get effects()
    {
        return this._rootNode._effects;
    },

    set effects(value)
    {
        this._rootNode._effects = value;
    },

    attach: function(child)
    {
        this._rootNode.attach(child);
    },

    detach: function(child)
    {
        this._rootNode.detach(child);
    },

    numChildren: function()
    {
        return this._rootNode.numChildren();
    },

    getChild: function(index)
    {
        return this._rootNode.getChild(index);
    },

    contains: function(child)
    {
        this._rootNode.contains(child);
    },

    acceptVisitor: function(visitor)
    {
        visitor.visitScene(this);
        // assume root node will always qualify
        this._rootNode.acceptVisitor(visitor);
    }
};

/**
 *
 * @param modelInstance
 * @constructor
 */
HX.ModelNode = function(modelInstance)
{
    HX.SceneNode.call(this);
    this.setModelInstance(modelInstance);
};

HX.ModelNode.prototype = Object.create(HX.SceneNode.prototype);

HX.ModelNode.prototype.acceptVisitor = function(visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);
    visitor.visitModelInstance(this._modelInstance, this.getWorldMatrix(), this.getWorldBounds());
};

HX.ModelNode.prototype.getModelInstance = function()
{
    return this._modelInstance;
};

HX.ModelNode.prototype.setModelInstance = function(value)
{
    if (this._modelInstance)
        this._modelInstance.onChange.unbind(this, HX.ModelNode.prototype._invalidateWorldBounds);

    this._modelInstance = value;

    this._modelInstance.onChange.bind(this, HX.ModelNode.prototype._invalidateWorldBounds);
    this._invalidateWorldBounds();
};

// override for better matches
HX.ModelNode.prototype._updateWorldBounds = function()
{
    if (this._modelInstance)
        this._worldBounds.transformFrom(this._modelInstance.getLocalBounds(), this.getWorldMatrix());

    HX.SceneNode.prototype._updateWorldBounds.call(this);
};
/**
 * Subclasses must implement:
 * prototype.activate
 * prototype.prepareBatch
 * @constructor
 */
HX.Light = function (type)
{
    HX.SceneNode.call(this);
    this._luminance = 3.1415;
    this._luminanceBound = 1 / 255;
    this._type = type; // used for sorting (TODO: Does this work?)
    this._color = new HX.Color(1.0, 1.0, 1.0);
    this._scaledIrradiance = new HX.Color();
    this._castsShadows = false;
    this._updateScaledIrradiance();
};

HX.Light.prototype = Object.create(HX.SceneNode.prototype);

HX.Light.prototype.acceptVisitor = function (visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

HX.Light.prototype.getLuminance = function ()
{
    return this._luminance;
};

HX.Light.prototype.setLuminance = function (value)
{
    this._luminance = value;
    this._updateScaledIrradiance();
};

HX.Light.prototype.getColor = function ()
{
    return this._color;
};

HX.Light.prototype.activate = function(camera, gbuffer, occlusion)
{

};

// returns the index of the FIRST UNRENDERED light
HX.Light.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    throw "Abstract method!";
};

/**
 * Value can be hex or ColorRGBA
 */
HX.Light.prototype.setColor = function (value)
{
    this._color = isNaN(value) ? value : new HX.Color(value);

    this._updateScaledIrradiance();
};

/**
 * The minimum luminance to be considered as "contributing to the lighting", used to define bounds. Any amount below this will be zeroed. Defaults to 1/255.
 */
HX.Light.prototype.getLuminanceBound = function ()
{
    return this._luminanceBound;
};

HX.Light.prototype.setLuminanceBound = function (value)
{
    this._luminanceBound = value;
    this._updateWorldBounds();
};

HX.Light.prototype.luminance = function ()
{
    return this._color.luminance() * this._luminance;
};

HX.Light.prototype._updateScaledIrradiance = function ()
{
    // this includes 1/PI radiance->irradiance factor
    var scale = this._luminance / Math.PI;

    if (HX.OPTIONS.useLinearSpace) {
        this._color.gammaToLinear(this._scaledIrradiance);
    }
    else {
        this._scaledIrradiance.r = this._color.r;
        this._scaledIrradiance.g = this._color.g;
        this._scaledIrradiance.b = this._color.b;
    }

    this._scaledIrradiance.r *= scale;
    this._scaledIrradiance.g *= scale;
    this._scaledIrradiance.b *= scale;
    this._invalidateWorldBounds();
};
/**
 *
 * @constructor
 */
HX.RenderItem = function()
{
    this.worldMatrix = null;
    this.meshInstance = null;
    this.pass = null;
    this.camera = null;
    this.uniformSetters = null;
};

HX.RenderItem.prototype = {
    // set state per instance
    draw: function()
    {
        if (this.uniformSetters) {
            var len = this.uniformSetters.length;
            for (var i = 0; i < len; ++i) {
                this.uniformSetters[i].execute(this.worldMatrix, this.camera);
            }
        }

        // TODO: Provide different render modes?
        HX.GL.drawElements(this.pass._elementType, this.meshInstance._mesh.numIndices(), HX.GL.UNSIGNED_SHORT, 0);
    }
};

/**
 *
 * @constructor
 */
HX.SceneVisitor = function()
{

};

HX.SceneVisitor.prototype =
{
    collect: function(camera, scene) {},
    qualifies: function(object) {},
    visitLight: function(light) {},
    visitModelInstance: function (modelInstance, worldMatrix) {},
    visitScene: function (scene) {},
    visitEffects: function(effects, ownerNode) {}
};
/**
 * The base class for any render pipeline. This can be a shadow map renderer, the default deferred render, ...
 * @constructor
 */
HX.Renderer = function()
{
};

HX.Renderer.prototype =
{
    constructor: HX.Renderer,


    /**
     * Renders a scene with a given camera. IMPORTANT: Helix does not clear the canvas. This may be useful to have 3D content
     * on top of a 2D gpu-based interface.
     * @param camera
     * @param scene
     */
    render: function (camera, scene, dt)
    {

    },

    dispose: function()
    {

    },

    _renderPass: function (passType, renderItems)
    {
        var len = renderItems.length;
        var activeShader = null;
        var activePass = null;
        var lastMesh = null;

        for(var i = 0; i < len; ++i) {
            var renderItem = renderItems[i];
            var meshInstance = renderItem.meshInstance;
            var pass = renderItem.pass;
            var shader = pass._shader;

            if (shader !== activeShader) {
                shader.updateRenderState();
                activeShader = shader;
            }

            if (pass !== activePass) {
                this._switchPass(activePass, pass);
                activePass = pass;

                lastMesh = null;    // need to reset mesh data too
            }

            if (lastMesh != meshInstance._mesh) {
                meshInstance.updateRenderState(passType);
                lastMesh = meshInstance._mesh;
            }

            renderItem.draw();
        }

        if (activePass && activePass._blending) HX.GL.disable(HX.GL.BLEND);
    },

    _switchPass: function(oldPass, newPass)
    {
        // clean up old pass
        if (!oldPass || oldPass._cullMode !== oldPass._cullMode) {
            if (newPass._cullMode === HX.CullMode.NONE)
                HX.GL.disable(HX.GL.CULL_FACE);
            else {
                HX.GL.enable(HX.GL.CULL_FACE);
                HX.GL.cullFace(newPass._cullMode);
            }
        }

        if (!oldPass || oldPass._blending !== oldPass._blending) {
            if (newPass._blending) {
                HX.GL.enable(HX.GL.BLEND);
                HX.GL.blendFunc(newPass._blendSource, newPass._blendDest);
                HX.GL.blendEquation(newPass._blendOperator);
            }
            else
                HX.GL.disable(HX.GL.BLEND);
        }

        newPass.updateRenderState();
    }
};
/**
 * The debug render mode to inspect properties in the GBuffer, the lighting accumulation buffer, AO, etc.
 */
HX.DebugRenderMode = {
    DEBUG_NONE: 0,
    DEBUG_COLOR: 1,
    DEBUG_NORMALS: 2,
    DEBUG_METALLICNESS: 3,
    DEBUG_SPECULAR_NORMAL_REFLECTION: 4,
    DEBUG_ROUGHNESS: 5,
    DEBUG_DEPTH: 6,
    DEBUG_LIGHT_ACCUM: 7,
    DEBUG_AO: 8
};


/**
 * ScreenRenderer is the main renderer for drawing a Scene to the screen.
 *
 * GBUFFER LAYOUT:
 * 0: COLOR: (color.XYZ, unused)
 * 1: NORMALS: (normals.XYZ, unused, or normals.xy, depth.zw)
 * 2: REFLECTION: (roughness, normalSpecularReflection, metallicness, unused)
 * 3: LINEAR DEPTH: (not explicitly written to by user), 0 - 1 linear depth encoded as RGBA
 *
 * DEPTH STENCIL:
 * Stencil can be used for certain post passes (fe: skin rendering) if stencil value is the same
 * Then just render post-pass with the given stencil
 *
 *
 * @constructor
 */
HX.ScreenRenderer = function()
{
    HX.Renderer.call(this);

    this._viewportX = 0;
    this._viewportY = 0;
    this._viewportWidth = 0;
    this._viewportHeight = 0;

    this._copyTexture = new HX.CopyChannelsShader();
    this._copyXChannel = new HX.CopyChannelsShader("x");
    this._copyYChannel = new HX.CopyChannelsShader("y");
    this._copyZChannel = new HX.CopyChannelsShader("z");
    this._copyWChannel = new HX.CopyChannelsShader("w");
    this._debugDepth = new HX.DebugDepthShader();
    this._debugNormals = new HX.DebugNormalsShader();
    this._applyGamma = new HX.ApplyGammaShader();
    this._gammaApplied = false;
    this._linearizeDepthShader = new HX.LinearizeDepthShader();
    this._rectMesh = HX.RectMesh.create({alignment: HX.PlanePrimitive.ALIGN_XY});

    this._renderCollector = new HX.RenderCollector();
    this._gbufferFBO = null;
    this._linearDepthFBO = null;
    this._hdrSourceIndex = 0;
    this._hdrTargets = null;
    this._hdrTargetsDepth = null;
    this._depthBuffer = null;
    this._aoEffect = null;
    this._localReflections = null;
    this._passSourceTexture = null;

    this._createGBuffer();
    this._createHDRBuffers();

    this._debugMode = HX.DebugRenderMode.DEBUG_NONE;
    this._camera = null;
};

HX.ScreenRenderer.prototype = Object.create(HX.Renderer.prototype);

HX.ScreenRenderer.prototype.setDebugMode = function(value)
{
    this._debugMode = value;
};

HX.ScreenRenderer.prototype.getAmbientOcclusion = function()
{
    return this._aoEffect;
};

HX.ScreenRenderer.prototype.setAmbientOcclusion = function(value)
{
    this._aoEffect = value;
    this._aoEffect.setMesh(this._rectMesh);
};

HX.ScreenRenderer.prototype.setLocalReflections = function(value)
{
    this._localReflections = value;
    this._localReflections.setMesh(this._rectMesh);
};

HX.ScreenRenderer.prototype.setViewportRect = function(x, y, width, height)
{
    if (this._viewportWidth != width || this._viewportHeight != height) {
        this._updateGBuffer(width, height);
        this._updateHDRBuffers(width, height);
    }

    this._viewportX = 0;
    this._viewportY = 0;
    this._viewportWidth = width;
    this._viewportHeight = height;
};

HX.ScreenRenderer.prototype.render = function(camera, scene, dt)
{
    this._gammaApplied = false;
    this._passSourceTexture = null;
    this._hdrSourceIndex = 0;
    this._camera = camera;
    this._scene = scene;

    HX.GL.enable(HX.GL.DEPTH_TEST);
    HX.GL.enable(HX.GL.CULL_FACE);
    HX.GL.cullFace(HX.GL.BACK);
    HX.GL.depthFunc(HX.GL.LESS);

    camera._setRenderTargetResolution(this._viewportWidth, this._viewportHeight);
    this._renderCollector.collect(camera, scene);

    this._renderShadowCasters();

    HX.GL.viewport(this._viewportX, this._viewportY, this._viewportWidth, this._viewportHeight);
    this._renderToGBuffer();
    this._linearizeDepth();

    HX.GL.disable(HX.GL.BLEND);
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    if (this._aoEffect != null)
        this._renderEffect(this._aoEffect, dt);

    HX.GL.viewport(this._viewportX, this._viewportY, this._viewportWidth, this._viewportHeight);
    this._renderToScreen(dt);
};

HX.ScreenRenderer.prototype._renderShadowCasters = function()
{
    HX.GL.colorMask(false, false, false, false);

    var casters = this._renderCollector.getShadowCasters();
    var len = casters.length;

    for (var i = 0; i < len; ++i) {
        casters[i].render(this._camera, this._scene)
    }

    HX.GL.colorMask(true, true, true, true);
};

HX.ScreenRenderer.prototype._renderToGBufferMultiPass = function()
{
    var clearMask = HX.GL.COLOR_BUFFER_BIT | HX.GL.DEPTH_BUFFER_BIT;
    var passIndices = [ HX.MaterialPass.GEOMETRY_COLOR_PASS, HX.MaterialPass.GEOMETRY_NORMAL_PASS, HX.MaterialPass.GEOMETRY_SPECULAR_PASS];

    for (var i = 0; i < 3; ++i) {
        HX.setRenderTarget(this._gbufferSingleFBOs[i]);
        HX.GL.clear(clearMask);
        this._renderPass(passIndices[i]);

        if (i == 0) {
            clearMask = HX.GL.COLOR_BUFFER_BIT;
            // important to use the same clip space calculations for all!
            HX.GL.depthFunc(HX.GL.EQUAL);
        }
    }
};

HX.ScreenRenderer.prototype._renderToGBuffer = function()
{
    if (HX.EXT_DRAW_BUFFERS)
        this._renderToGBufferMRT();
    else
        this._renderToGBufferMultiPass();
};

HX.ScreenRenderer.prototype._renderToGBufferMRT = function()
{
    HX.setRenderTarget(this._gbufferFBO);
    HX.clear();
    this._renderPass(HX.MaterialPass.GEOMETRY_PASS);
};

HX.ScreenRenderer.prototype._renderToGBufferMultiPass = function()
{
    var clearMask = HX.GL.COLOR_BUFFER_BIT | HX.GL.DEPTH_BUFFER_BIT;
    var passIndices = [ HX.MaterialPass.GEOMETRY_COLOR_PASS, HX.MaterialPass.GEOMETRY_NORMAL_PASS, HX.MaterialPass.GEOMETRY_SPECULAR_PASS];

    for (var i = 0; i < 3; ++i) {
        HX.setRenderTarget(this._gbufferSingleFBOs[i]);
        HX.GL.clear(clearMask);
        this._renderPass(passIndices[i]);

        if (i == 0) {
            clearMask = HX.GL.COLOR_BUFFER_BIT;
            // important to use the same clip space calculations for all!
            HX.GL.depthFunc(HX.GL.EQUAL);
        }
    }
};

HX.ScreenRenderer.prototype._linearizeDepth = function()
{
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    HX.setRenderTarget(this._linearDepthFBO);
    this._linearizeDepthShader.execute(this._rectMesh, HX.EXT_DEPTH_TEXTURE? this._depthBuffer : this._gbuffer[1], this._camera)
}

HX.ScreenRenderer.prototype._renderEffect = function(effect, dt)
{
    this._gammaApplied = this._gammaApplied || effect._outputsGamma;
    this._hdrSourceIndex = effect.render(this, dt);
};

HX.ScreenRenderer.prototype._renderToScreen = function(dt)
{
    switch (this._debugMode) {
        case HX.DebugRenderMode.DEBUG_COLOR:
            HX.setRenderTarget(null);
            this._copyTexture.execute(this._rectMesh, this._gbuffer[0]);
            break;
        case HX.DebugRenderMode.DEBUG_NORMALS:
            HX.setRenderTarget(null);
            this._debugNormals.execute(this._rectMesh, this._gbuffer[1]);
            break;
        case HX.DebugRenderMode.DEBUG_METALLICNESS:
            HX.setRenderTarget(null);
            this._copyXChannel.execute(this._rectMesh, this._gbuffer[2]);
            break;
        case HX.DebugRenderMode.DEBUG_SPECULAR_NORMAL_REFLECTION:
            HX.setRenderTarget(null);
            this._copyYChannel.execute(this._rectMesh, this._gbuffer[2]);
            break;
        case HX.DebugRenderMode.DEBUG_ROUGHNESS:
            HX.setRenderTarget(null);
            this._copyZChannel.execute(this._rectMesh, this._gbuffer[2]);
            break;
        case HX.DebugRenderMode.DEBUG_DEPTH:
            HX.setRenderTarget(null);
            this._debugDepth.execute(this._rectMesh, this._gbuffer[3]);
            break;
        case HX.DebugRenderMode.DEBUG_LIGHT_ACCUM:
            this._renderLightAccumulation();
            HX.setRenderTarget(null);
            this._applyGamma.execute(this._rectMesh, this._hdrBuffers[0]);
            break;
        case HX.DebugRenderMode.DEBUG_AO:
            HX.setRenderTarget(null);
            this._copyWChannel.execute(this._rectMesh, this._aoEffect.getAOTexture());
            break;
        default:
            this._renderLightAccumulation(dt);

            this._renderPostPass(HX.MaterialPass.POST_LIGHT_PASS);

            // TODO: only perform this if any pass in the list has a hx_source slot
            this._copySource();
            this._renderPostPass(HX.MaterialPass.TRANSPARENT_DIFFUSE_PASS);
            this._renderForwardPass(HX.MaterialPass.TRANSPARENT_SPECULAR_PASS);

            this._renderEffects(dt, this._renderCollector._effects);
            this._renderPostPass(HX.MaterialPass.POST_PASS);
            this._renderEffects(dt, this._camera._effects);

            HX.setRenderTarget(null);

            // TODO: render directly to screen if last post process effect?
            // OR, provide toneMap property on camera, which gets special treatment
            if (this._gammaApplied)
                this._copyTexture.execute(this._rectMesh, this._hdrBuffers[this._hdrSourceIndex]);
            else
                this._applyGamma.execute(this._rectMesh, this._hdrBuffers[this._hdrSourceIndex]);
    }
};

HX.ScreenRenderer.prototype._renderLightAccumulation = function(dt)
{
    HX.GL.enable(HX.GL.BLEND);
    HX.GL.blendFunc(HX.GL.ONE, HX.GL.ONE);
    HX.GL.blendEquation(HX.GL.FUNC_ADD);

    HX.setRenderTarget(this._hdrTargets[this._hdrSourceIndex]);
    HX.clear();

    this._renderLights();
    this._renderGI(dt);

    HX.GL.disable(HX.GL.BLEND);
};

HX.ScreenRenderer.prototype._renderLights = function()
{
    var lights = this._renderCollector.getLights();
    var len = lights.length;
    var activeType = undefined;

    var i = 0;
    var camera = this._camera;
    var gbuffer = this._gbuffer;
    var occlusion = this._aoEffect? this._aoEffect.getAOTexture() : null;

    while (i < len) {
        var light = lights[i];

        if (light._type !== activeType) {
            light.activate(camera, gbuffer, occlusion);
            activeType = light._type;
        }

        i = light.renderBatch(lights, i, camera, gbuffer, occlusion);
    }
};

HX.ScreenRenderer.prototype._renderGI = function(dt)
{
    var occlusion = this._aoEffect? this._aoEffect.getAOTexture() : null;

    HX.GL.disable(HX.GL.CULL_FACE);

    if (this._renderCollector._globalIrradianceProbe)
        this._renderCollector._globalIrradianceProbe.render(this._camera, this._gbuffer, occlusion);

    if (this._localReflections != null) {
        HX.GL.disable(HX.GL.BLEND);
        this._renderEffect(this._localReflections, dt);
        HX.setRenderTarget(this._hdrTargets[this._hdrSourceIndex]);
        HX.GL.enable(HX.GL.BLEND);
    }

    // dest alpha contains amount of GI already present
    HX.GL.blendFunc(HX.GL.DST_ALPHA, HX.GL.ONE);

    if (this._renderCollector._globalSpecularProbe)
        this._renderCollector._globalSpecularProbe.render(this._camera, this._gbuffer, occlusion);
};

HX.ScreenRenderer.prototype._renderPass = function(passType, renderItems)
{
    renderItems = renderItems || this._renderCollector.getRenderList(passType);

    HX.Renderer.prototype._renderPass.call(this, passType, renderItems);
};

HX.ScreenRenderer.prototype._copySource = function()
{
    var source = this._hdrBuffers[this._hdrSourceIndex];
    var hdrTarget = 1 - this._hdrSourceIndex;

    HX.setRenderTarget(this._hdrTargets[hdrTarget]);
    HX.GL.disable(HX.GL.BLEND);
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);
    this._copyTexture.execute(this._rectMesh, source);

    this._passSourceTexture = this._hdrBuffers[hdrTarget];
};

HX.ScreenRenderer.prototype._renderForwardPass = function(passType)
{
    var renderItems = this._renderCollector.getRenderList(passType);
    var len = renderItems.length;
    var activeShader = null;
    var activePass = null;
    var lastMesh = null;

    for(var i = 0; i < len; ++i) {
        var renderItem = renderItems[i];
        var meshInstance = renderItem.meshInstance;
        var pass = renderItem.pass;
        var shader = pass._shader;

        if (shader !== activeShader) {
            shader.updateRenderState();
            activeShader = shader;
        }

        if (pass !== activePass) {
            this._switchPass(activePass, pass);
            activePass = pass;

            lastMesh = null;    // need to reset mesh data too
        }

        if (lastMesh != meshInstance._mesh) {
            meshInstance.updateRenderState(passType);
            lastMesh = meshInstance._mesh;
        }

        // todo: loop through lights assigning to object
        renderItem.draw();
    }

    if (activePass && activePass._blending) HX.GL.disable(HX.GL.BLEND);
};

HX.ScreenRenderer.prototype._renderPostPass = function(passType)
{

    if (this._renderCollector.getRenderList(passType).length == 0)
        return;

    HX.setRenderTarget(this._hdrTargetsDepth[this._hdrSourceIndex]);

    HX.GL.enable(HX.GL.CULL_FACE);
    HX.GL.enable(HX.GL.DEPTH_TEST);
    HX.GL.depthFunc(HX.GL.LEQUAL);

    this._renderPass(passType);
};

HX.ScreenRenderer.prototype._renderEffects = function(dt, effects)
{
    if (!effects || effects.length == 0)
        return;

    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    var len = effects.length;

    for (var i = 0; i < len; ++i) {
        var effect = effects[i];
        if (effect.isSupported()) {
            effect.setMesh(this._rectMesh);
            this._renderEffect(effect, dt);
        }
    }
};

HX.ScreenRenderer.prototype._createGBuffer = function()
{
    if (HX.EXT_DEPTH_TEXTURE) {
        this._depthBuffer = new HX.Texture2D();
        this._depthBuffer.setFilter(HX.TextureFilter.BILINEAR_NOMIP);
        this._depthBuffer.setWrapMode(HX.TextureWrapMode.CLAMP);
    }
    else {
        this._depthBuffer = new HX.ReadOnlyDepthBuffer();
    }

    this._gbuffer = [];

    for (var i = 0; i < 4; ++i) {
        this._gbuffer[i] = new HX.Texture2D();
        this._gbuffer[i].setFilter(HX.TextureFilter.BILINEAR_NOMIP);
        this._gbuffer[i].setWrapMode(HX.TextureWrapMode.CLAMP);
    }

    this._gbufferSingleFBOs = [];

    for (var i = 0; i < 3; ++i)
        this._gbufferSingleFBOs[i] = new HX.FrameBuffer([ this._gbuffer[i] ], this._depthBuffer);

    this._createGBufferFBO();
    this._linearDepthFBO = new HX.FrameBuffer(this._gbuffer[3], null);
};

HX.ScreenRenderer.prototype._createGBufferFBO = function()
{
    if (HX.EXT_DRAW_BUFFERS) {
        var targets = [ this._gbuffer[0], this._gbuffer[1], this._gbuffer[2] ];
        this._gbufferFBO = new HX.FrameBuffer(targets, this._depthBuffer);
    }
};

HX.ScreenRenderer.prototype._createHDRBuffers = function ()
{
    this._hdrBuffers = [ new HX.Texture2D(), new HX.Texture2D() ];
    this._hdrTargets = [];
    this._hdrTargetsDepth = [];

    for (var i = 0; i < this._hdrBuffers.length; ++i) {
        this._hdrBuffers[i].setFilter(HX.TextureFilter.BILINEAR_NOMIP);
        this._hdrBuffers[i].setWrapMode(HX.TextureWrapMode.CLAMP);
        this._hdrTargets[i] = new HX.FrameBuffer([ this._hdrBuffers[i] ]);
        this._hdrTargetsDepth[i] = new HX.FrameBuffer([ this._hdrBuffers[i] ], this._depthBuffer);
    }
};

HX.ScreenRenderer.prototype._updateGBuffer = function (width, height)
{
    if (HX.EXT_DEPTH_TEXTURE)
        this._depthBuffer.initEmpty(width, height, HX.GL.DEPTH_STENCIL, HX.EXT_DEPTH_TEXTURE.UNSIGNED_INT_24_8_WEBGL);
    else
        this._depthBuffer.init(width, height);

    for (var i = 0; i < this._gbuffer.length; ++i) {
        this._gbuffer[i].initEmpty(width, height, HX.GL.RGBA, HX.GL.UNSIGNED_BYTE);
    }

    for (var i = 0; i < this._gbufferSingleFBOs.length; ++i)
        this._gbufferSingleFBOs[i].init();

    this._updateGBufferFBO();
    this._linearDepthFBO.init();
};

HX.ScreenRenderer.prototype._updateGBufferFBO = function()
{
    if (HX.EXT_DRAW_BUFFERS)
        this._gbufferFBO.init();
};

HX.ScreenRenderer.prototype._updateHDRBuffers = function(width, height)
{
    for (var i = 0; i < this._hdrBuffers.length; ++i) {
        this._hdrBuffers[i].initEmpty(width, height, HX.GL.RGBA, HX.HDR_FORMAT);
        this._hdrTargets[i].init();
        this._hdrTargetsDepth[i].init();
    }
};

HX.ScreenRenderer.prototype.dispose = function()
{
    this._applyGamma.dispose();
    this._copyTexture.dispose();
    this._copyXChannel.dispose();
    this._copyYChannel.dispose();
    this._copyZChannel.dispose();
    this._copyWChannel.dispose();
    this._rectMesh.dispose();

    for (var i = 0; i < this._hdrBuffers.length; ++i) {
        this._hdrBuffers[i].dispose();
        this._hdrTargets[i].dispose();
        this._hdrTargetsDepth[i].dispose();
    }

    for (var i = 0; i < this._gbuffer.length; ++i)
        this._gbuffer[i].dispose();

    for (var i = 0; i < this._gbufferSingleFBOs.length; ++i)
        this._gbufferSingleFBOs[i].dispose();

    if (this._gbufferFBO)
        this._gbufferFBO.dispose();
};

HX.ScreenRenderer.prototype._switchPass = function(oldPass, newPass)
{
    newPass.assignGBuffer(this._gbuffer);

    // this is slow!
    if (this._passSourceTexture)
        newPass.setTexture("hx_source", this._passSourceTexture);

    HX.Renderer.prototype._switchPass.call(this, oldPass, newPass);
};

/**
 * @constructor
 */
HX.EffectPass = function(vertexShader, fragmentShader, mesh, preVertexCode, preFragmentCode)
{
    vertexShader = vertexShader || HX.ShaderLibrary.get("default_post_vertex.glsl");
    var shader = new HX.Shader(vertexShader, fragmentShader, preVertexCode, preFragmentCode);
    HX.MaterialPass.call(this, shader);
    this._uniformSetters = HX.UniformSetter.getSetters(this._shader);
    this._gbuffer = null;
    this._mesh = null;
    this._vertexLayout = null;

    if (mesh != undefined)
        this.setMesh(mesh);

    this.setTexture("hx_dither2D", HX.DEFAULT_2D_DITHER_TEXTURE);
    this._sourceSlot = this.getTextureSlot("hx_source");
};

HX.EffectPass.prototype = Object.create(HX.MaterialPass.prototype);

HX.EffectPass.prototype.setMesh = function(mesh)
{
    if (this._mesh == mesh) return;
    this._mesh = mesh;
    this._vertexLayout = new HX.VertexLayout(this._mesh, this);
};

HX.EffectPass.prototype.updateRenderState = function()
{
    HX.MaterialPass.prototype.updateRenderState.call(this);

    this._mesh._vertexBuffer.bind();
    this._mesh._indexBuffer.bind();

    var layout = this._vertexLayout;
    var attributes = layout.attributes;
    var len = attributes.length;

    for (var i = 0; i < len; ++i) {
        var attribute = attributes[i];
        HX.GL.vertexAttribPointer(attribute.index, attribute.numComponents, HX.GL.FLOAT, false, attribute.stride, attribute.offset);
    }

    HX.enableAttributes(layout._numAttributes);
};

HX.EffectPass.prototype.updateGlobalState = function(camera, gbuffer, source)
{
    this._shader.updateRenderState();

    if (this._sourceSlot)
        this._sourceSlot.texture = source;

    this.assignGBuffer(gbuffer);

    var len = this._uniformSetters.length;
    for (var i = 0; i < len; ++i)
        this._uniformSetters[i].execute(null, camera);
};


/**
 *
 * @constructor
 */
HX.Effect = function()
{
    this._isSupported = true;
    this._passes = [];
    this._mesh = null;
    this._hdrSourceIndex = -1;
    this._outputsGamma = false;
};

HX.Effect.prototype =
{
    isSupported: function()
    {
        return this._isSupported;
    },

    getPass: function (index)
    {
        return this._passes[index];
    },

    render: function(renderer, dt)
    {
        this._camera = renderer._camera;
        this._gbuffer = renderer._gbuffer;
        this._hdrSourceIndex = renderer._hdrSourceIndex;
        this._hdrSources = renderer._hdrBuffers;
        this._hdrTargets = renderer._hdrTargets;

        this._hdrSource = this._hdrSources[this._hdrSourceIndex];
        this._hdrTarget = this._hdrTargets[1 - this._hdrSourceIndex];

        this.draw(dt);

        return this._hdrSourceIndex;
    },

    draw: function(dt)
    {
        // the default just swap between two hdr buffers
        var len = this._passes.length;

        for (var i = 0; i < len; ++i) {
            HX.setRenderTarget(this._hdrTarget);
            this._drawPass(this._passes[i]);
            this._swapHDRBuffers();
        }
    },

    _drawPass: function(pass)
    {
        pass.updateGlobalState(this._camera, this._gbuffer, this._hdrSource);
        pass.updateRenderState();
        HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
    },

    _swapHDRBuffers: function()
    {
        this._hdrTarget = this._hdrTargets[this._hdrSourceIndex];
        this._hdrSourceIndex = 1 - this._hdrSourceIndex;
        this._hdrSource = this._hdrSources[this._hdrSourceIndex];
    },

    removePass: function(pass)
    {
        var index = this._passes.indexOf(pass);
        this._passes.splice(index, 1);
    },

    addPass: function (pass)
    {
        this._passes.push(pass);
    },

    numPasses: function()
    {
        return this._passes.length;
    },

    setUniform: function(name, value)
    {
        var len = this._passes.length;

        for (var i = 0; i < len; ++i) {
            if (this._passes[i])
                this._passes[i].setUniform(name, value);
        }
    },

    setMesh: function(mesh)
    {
        if (this._mesh != mesh) {
            this._mesh = mesh;
            var len = this._passes.length;

            for (var i = 0; i < len; ++i) {
                if (this._passes[i])
                    this._passes[i].setMesh(mesh);
            }
        }
    }
};
HX.GLSLIncludeGeneral =
    "precision mediump float;\n\n" +
    HX.ShaderLibrary.get("snippets_general.glsl") + "\n\n";

// TODO: Provide proper light model objects
HX.DEFERRED_LIGHT_MODEL = HX.ShaderLibrary.get("lighting_blinn_phong_full.glsl") + "\n\n";
/**
 *
 * @type {{}}
 */
HX.UniformSetter = {};

HX.UniformSetter.getSetters = function(shader) {
    if (HX.UniformSetter._table === undefined)
        HX.UniformSetter._init();

    return HX.UniformSetter._findSetters(shader);
};

HX.UniformSetter._findSetters = function(shader)
{
    var setters = [];
    for (var uniformName in HX.UniformSetter._table) {
        var location = HX.GL.getUniformLocation(shader._program, uniformName);
        if (location == null) continue;
        var setter = new HX.UniformSetter._table[uniformName]();
        setters.push(setter);
        setter.location = location;
    }

    return setters;
};

HX.UniformSetter._init = function()
{
    HX.UniformSetter._table = {};

    HX.UniformSetter._table.hx_worldMatrix = HX.WorldMatrixSetter;
    HX.UniformSetter._table.hx_worldViewMatrix = HX.WorldViewMatrixSetter;
    HX.UniformSetter._table.hx_wvpMatrix = HX.WorldViewProjectionSetter;
    HX.UniformSetter._table.hx_viewMatrix = HX.ViewMatrixSetter;
    HX.UniformSetter._table.hx_projectionMatrix = HX.ProjectionSetter;
    HX.UniformSetter._table.hx_inverseProjectionMatrix = HX.InverseProjectionSetter;
    HX.UniformSetter._table.hx_inverseWVPMatrix = HX.InverseWVPSetter;
    HX.UniformSetter._table.hx_viewProjectionMatrix = HX.ViewProjectionSetter;
    HX.UniformSetter._table.hx_inverseViewProjectionMatrix = HX.InverseViewProjectionSetter;
    HX.UniformSetter._table.hx_normalWorldMatrix = HX.NormalWorldMatrixSetter;
    HX.UniformSetter._table.hx_normalWorldViewMatrix = HX.NormalWorldViewMatrixSetter;
    HX.UniformSetter._table.hx_cameraWorldPosition = HX.CameraWorldPosSetter;
    HX.UniformSetter._table.hx_cameraWorldMatrix = HX.CameraWorldMatrixSetter;
    HX.UniformSetter._table.hx_cameraFrustumRange = HX.CameraFrustumRangeSetter;
    HX.UniformSetter._table.hx_rcpCameraFrustumRange = HX.RCPCameraFrustumRangeSetter;
    HX.UniformSetter._table.hx_cameraNearPlaneDistance = HX.CameraNearPlaneDistanceSetter;
    HX.UniformSetter._table.hx_cameraFarPlaneDistance = HX.CameraFarPlaneDistanceSetter;
    HX.UniformSetter._table.hx_renderTargetResolution = HX.RenderTargetResolutionSetter;
    HX.UniformSetter._table.hx_rcpRenderTargetResolution = HX.RCPRenderTargetResolutionSetter;
    HX.UniformSetter._table.hx_dither2DTextureScale = HX.Dither2DTextureScaleSetter;
    HX.UniformSetter._table["hx_poissonDisk[0]"] = HX.PoissonDiskSetter;
};


HX.WorldMatrixSetter = function()
{
};

HX.WorldMatrixSetter.prototype.execute = function (worldMatrix, camera)
{
    HX.GL.uniformMatrix4fv(this.location, false, worldMatrix._m);
};


HX.ViewProjectionSetter = function()
{
};

HX.ViewProjectionSetter.prototype.execute = function(worldMatrix, camera)
{
    var matrix = camera.getViewProjectionMatrix();
    HX.GL.uniformMatrix4fv(this.location, false, matrix._m);
};

HX.InverseViewProjectionSetter = function()
{
};

HX.InverseViewProjectionSetter.prototype.execute = function(worldMatrix, camera)
{
    var matrix = camera.getInverseViewProjectionMatrix();
    HX.GL.uniformMatrix4fv(this.location, false, matrix._m);
};

HX.InverseWVPSetter = function()
{
};

HX.InverseWVPSetter.prototype.execute = function(worldMatrix, camera)
{
    var matrix = camera.getInverseViewProjectionMatrix();
    HX.GL.uniformMatrix4fv(this.location, false, matrix._m);
};

HX.ProjectionSetter = function()
{
};

HX.ProjectionSetter.prototype.execute = function(worldMatrix, camera)
{
    var matrix = camera.getProjectionMatrix();
    HX.GL.uniformMatrix4fv(this.location, false, matrix._m);
};

HX.InverseProjectionSetter = function()
{
};

HX.InverseProjectionSetter.prototype.execute = function(worldMatrix, camera)
{
    var matrix = camera.getInverseProjectionMatrix();
    HX.GL.uniformMatrix4fv(this.location, false, matrix._m);
};

HX.WorldViewProjectionSetter = function()
{
    this._matrix = new HX.Matrix4x4();
};

HX.WorldViewProjectionSetter.prototype.execute = function(worldMatrix, camera)
{
    this._matrix.product(camera.getViewProjectionMatrix(), worldMatrix);
    HX.GL.uniformMatrix4fv(this.location, false, this._matrix._m);
};

HX.WorldViewMatrixSetter = function()
{
    this._matrix = new HX.Matrix4x4();
};

HX.WorldViewMatrixSetter.prototype.execute = function (worldMatrix, camera)
{
    this._matrix.product(camera.getViewMatrix(), worldMatrix);
    HX.GL.uniformMatrix4fv(this.location, false, this._matrix._m);
};


HX.NormalWorldMatrixSetter = function()
{
    this._data = new Float32Array(9);
};

HX.NormalWorldMatrixSetter.prototype.execute = function (worldMatrix, camera)
{
    worldMatrix.writeNormalMatrix(this._data);
    HX.GL.uniformMatrix3fv(this.location, false, this._data);    // transpose of inverse
};


HX.NormalWorldViewMatrixSetter = function()
{
    this._matrix = new HX.Matrix4x4();
    this._data = new Float32Array(9);
};

HX.NormalWorldViewMatrixSetter.prototype.execute = function (worldMatrix, camera)
{
    this._matrix.product(camera.getViewMatrix(), worldMatrix);
    this._matrix.writeNormalMatrix(this._data);
    HX.GL.uniformMatrix3fv(this.location, false, this._data);    // transpose of inverse
};

HX.CameraWorldPosSetter = function()
{
};

HX.CameraWorldPosSetter.prototype.execute = function (worldMatrix, camera)
{
    var arr = camera.getWorldMatrix()._m;
    HX.GL.uniform3f(this.location, arr[12], arr[13], arr[14]);
};

HX.CameraWorldMatrixSetter = function()
{
};

HX.CameraWorldMatrixSetter.prototype.execute = function (worldMatrix, camera)
{
    var matrix = camera.getWorldMatrix();
    HX.GL.uniformMatrix4fv(this.location, false, matrix._m);
};

HX.CameraFrustumRangeSetter = function()
{
};

HX.CameraFrustumRangeSetter.prototype.execute = function (worldMatrix, camera)
{
    HX.GL.uniform1f(this.location, camera.getFarDistance() - camera.getNearDistance());
};

HX.RCPCameraFrustumRangeSetter = function()
{
};

HX.RCPCameraFrustumRangeSetter.prototype.execute = function (worldMatrix, camera)
{
    HX.GL.uniform1f(this.location, 1.0 / (camera.getFarDistance() - camera.getNearDistance()));
};

HX.CameraNearPlaneDistanceSetter = function()
{
};

HX.CameraNearPlaneDistanceSetter.prototype.execute = function (worldMatrix, camera)
{
    HX.GL.uniform1f(this.location, camera.getNearDistance());
};

HX.CameraFarPlaneDistanceSetter = function()
{
};

HX.CameraFarPlaneDistanceSetter.prototype.execute = function (worldMatrix, camera)
{
    HX.GL.uniform1f(this.location, camera.getFarDistance());
};

HX.ViewMatrixSetter = function()
{
};

HX.ViewMatrixSetter.prototype.execute = function (worldMatrix, camera)
{
    var matrix = camera.getViewMatrix();
    HX.GL.uniformMatrix4fv(this.location, false, matrix._m);
};

HX.RenderTargetResolutionSetter = function()
{
};

HX.RenderTargetResolutionSetter.prototype.execute = function (worldMatrix, camera)
{
    HX.GL.uniform2f(this.location, camera._renderTargetWidth, camera._renderTargetHeight);
};

HX.RCPRenderTargetResolutionSetter = function()
{
};

HX.RCPRenderTargetResolutionSetter.prototype.execute = function (worldMatrix, camera)
{
    HX.GL.uniform2f(this.location, 1.0/camera._renderTargetWidth, 1.0/camera._renderTargetHeight);
};

HX.Dither2DTextureScaleSetter = function()
{
};

HX.Dither2DTextureScaleSetter.prototype.execute = function (worldMatrix, camera)
{
    HX.GL.uniform2f(this.location, camera._renderTargetWidth / HX.DEFAULT_2D_DITHER_TEXTURE.width(), camera._renderTargetHeight / HX.DEFAULT_2D_DITHER_TEXTURE.height());
};

HX.PoissonDiskSetter = function()
{
};

HX.PoissonDiskSetter.prototype.execute = function (worldMatrix, camera)
{
    HX.GL.uniform2fv(this.location, HX.DEFAULT_POISSON_DISK);
};
/**
 * Creates a default physically-based rendering material.
 */
HX.PBRMaterial = function()
{
    HX.Material.call(this);
    this._passesInvalid = true;
    this._color = new HX.Color(1, 1, 1, 1);
    this._colorMap = null;
    this._normalMap = null;
    this._specularMap = null;
    this._specularMapMode = HX.SPECULAR_MAP_ROUGHNESS_ONLY;
    this._metallicness = 0.0;
    this._roughness = 0.3;
    this._specularNormalReflection = 0.027;
    this._refractiveRatio = .8;
    this.metallicness = this._metallicness;
    this.roughness = this._roughness;
    this.specularNormalReflection = this._specularNormalReflection;
    this.refractiveRatio = this._refractiveRatio;
    this._transparent = false;
    this._refract = false;
};

/**
 * used for specularMapMode to specify the specular map only uses roughness data
 */
HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY = 1;
/**
 * used for specularMapMode to specify the specular map has rgb channels containing roughness, normal reflectance and metallicness, respectively
 */
HX.PBRMaterial.SPECULAR_MAP_ALL = 2;
/**
 * used for specularMapMode to specify there is no explicit specular map, but roughness data is present in the alpha channel of the normal map.
 */
HX.PBRMaterial.SPECULAR_MAP_SHARE_NORMAL_MAP = 3;


HX.PBRMaterial.prototype = Object.create(HX.Material.prototype);

//HX.PBRMaterial.prototype.hasPass = function(type)
//{
    //if (this._passesInvalid)
    //    this._updatePasses();

    //return HX.Material.prototype.hasPass.call(this, type);
//};

HX.PBRMaterial.prototype.getPass = function(type)
{
    if (this._passesInvalid)
        this._updatePasses();

    return HX.Material.prototype.getPass.call(this, type);
};

HX.PBRMaterial.prototype._clearPasses = function()
{
    for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
        this.setPass(i, null);
};

HX.PBRMaterial.prototype._updatePasses = function()
{
    this._clearPasses();

    var colorDefines = this._generateColorDefines();
    var normalDefines = this._generateNormalDefines();
    var specularDefines = this._generateSpecularDefines();

    // TODO: this is something every material should have to do, so perhaps it should work differently?
    if (this._transparent) {
        // this is actually the same code as simple albedo output, but multiplicative blending
        var defines = "#define NO_MRT_GBUFFER_COLOR\n" + normalDefines + colorDefines;

        if (this._refract)
            defines = "#define TRANSPARENT_REFRACT\n" + defines;

        var pass = this._initPass(HX.MaterialPass.TRANSPARENT_DIFFUSE_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");

        if (!this._refract)
            pass.setBlendMode(HX.BlendFactor.ZERO, HX.BlendFactor.SOURCE_COLOR, HX.BlendOperation.ADD);
    }
    else if (HX.EXT_DRAW_BUFFERS) {
        var defines = colorDefines + normalDefines + specularDefines;
        this._initPass(HX.MaterialPass.GEOMETRY_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }
    else {
        colorDefines = "#define NO_MRT_GBUFFER_COLOR\n" + colorDefines;
        normalDefines = "#define NO_MRT_GBUFFER_NORMALS\n" + normalDefines;
        specularDefines = "#define NO_MRT_GBUFFER_SPECULAR\n" + specularDefines;
        this._initPass(HX.MaterialPass.GEOMETRY_COLOR_PASS, colorDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS, normalDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS, specularDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }

    this.setUniform("color", this._color);

    if (this._colorMap) this.setTexture("colorMap", this._colorMap);
    if (this._normalMap) this.setTexture("normalMap", this._normalMap);
    if (this._specularMap) this.setTexture("specularMap", this._specularMap);

    this._passesInvalid = false;
};

HX.PBRMaterial.prototype._generateColorDefines = function()
{
    return !!this._colorMap? "#define COLOR_MAP\n" : "";
};

HX.PBRMaterial.prototype._generateNormalDefines = function()
{
    return !!this._normalMap? "#define NORMAL_MAP\n" : "";
};

HX.PBRMaterial.prototype._generateSpecularDefines = function()
{
    switch (this._specularMapMode) {
        case HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY:
            return this._specularMap? "#define ROUGHNESS_MAP\n" : "";
        case HX.PBRMaterial.SPECULAR_MAP_ALL:
            return this._specularMap? "#define SPECULAR_MAP\n" : "";
        default:
            return "#define NORMAL_ROUGHNESS_MAP\n";
    }
};

HX.PBRMaterial.prototype._initPass = function(type, defines, vertexShaderID, fragmentShaderID)
{
    var vertexShader = HX.ShaderLibrary.get(vertexShaderID);
    var fragmentShader = HX.ShaderLibrary.get(fragmentShaderID);
    var shader = new HX.Shader(vertexShader, fragmentShader, defines, defines);
    var pass = new HX.MaterialPass(shader);
    this.setPass(type, pass);
    return pass;
};

Object.defineProperty(HX.PBRMaterial.prototype, "color",
    {
        get: function() { return this._color; },
        set: function(value) {
            this._color = isNaN(value) ? value : new HX.Color(value);
            this.setUniform("color", this._color);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "colorMap",
    {
        get: function() { return this._colorMap; },
        set: function(value) {
            if (!!this._colorMap !== !!value)
                this._passesInvalid = true;

            if (!this._passesInvalid && value)
                this.setTexture("colorMap", value);

            this._colorMap = value;
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "normalMap",
    {
        get: function() { return this._normalMap; },
        set: function(value) {
            if (!!this._normalMap !== !!value)
                this._passesInvalid = true;

            if (!this._passesInvalid && value)
                this.setTexture("normalMap", value);

            this._normalMap = value;
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "specularMap",
    {
        get: function() { return this._specularMap; },
        set: function(value) {
            if (!!this._normalMap !== !!value)
                this._passesInvalid = true;

            if (!this._passesInvalid && value)
                this.setTexture("specularMap", value);

            this._specularMap = value;
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "specularMapMode",
    {
        get: function() { return this._specularMapMode; },
        set: function(value) {
            if (this._specularMapMode != value)
                this._passesInvalid = true;

            this._specularMapMode = value;
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "metallicness",
    {
        get: function() { return this._metallicness; },
        set: function(value) {
            this._metallicness = HX.saturate(value);
            this.setUniform("metallicness", this._metallicness);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "specularNormalReflection",
    {
        get: function() { return this._specularNormalReflection; },
        set: function(value) {
            this._specularNormalReflection = HX.saturate(value);
            this.setUniform("specularNormalReflection", this._specularNormalReflection);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "roughness",
    {
        get: function() { return this._roughness; },
        set: function(value) {
            this._roughness = HX.saturate(value);
            this.setUniform("roughness", this._roughness);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "transparent",
    {
        get: function() { return this._transparent; },
        set: function(value) {
            if (!!this._transparent !== !!value)
                this._passesInvalid = true;

            this._transparent = HX.saturate(value);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "refract",
    {
        get: function() { return this._refract; },
        set: function(value) {
            if (!!this._refract !== !!value)
                this._passesInvalid = true;

            this._refract = HX.saturate(value);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "refractiveRatio",
    {
        get: function() { return this._refractiveRatio; },
        set: function(value) {
            this._refractiveRatio = value;
            this.setUniform("refractiveRatio", value);
        }
    }
);
/**
 * Creates a default skybox rendering material.
 */
HX.SkyboxMaterial = function(texture)
{
    HX.Material.call(this);

    var vertexShader = HX.ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = HX.ShaderLibrary.get("default_skybox_fragment.glsl");
    var shader = new HX.Shader(vertexShader, fragmentShader);
    var pass = new HX.MaterialPass(shader);
    pass.setCullMode(HX.CullMode.NONE);
    this.setPass(HX.MaterialPass.POST_LIGHT_PASS, pass);

    this.setTexture("hx_skybox", texture);
};

HX.SkyboxMaterial.prototype = Object.create(HX.Material.prototype);
/**
 *
 * @constructor
 */
HX.AmbientLight = function()
{
    HX.Light.call(this, HX.AmbientLight);

    HX.Light._rectMesh = HX.Light._rectMesh || new HX.RectMesh.create();

    // asume only one ambient light
    this._colorLocation = null;
    this._lightPass = null;
    this._useAO = false;

    this.setColor(new HX.Color(.1,.1,.1));
};

HX.AmbientLight.prototype = Object.create(HX.Light.prototype);

HX.AmbientLight.prototype.activate = function(camera, gbuffer, occlusion)
{
    var useAO = occlusion != null;

    if (!this._lightPass || this._useAO != useAO) {
        this._useAO = useAO;
        this._initLightPass();
    }

    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    this._lightPass.updateGlobalState(camera, gbuffer, occlusion);
    this._lightPass.updateRenderState();
};

// returns the index of the FIRST UNRENDERED light
HX.AmbientLight.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    this._occlusion = occlusion;
    var colorR = 0, colorG = 0, colorB = 0;
    //var end = lightCollection.length;

    //for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[startIndex];
        var color = light._scaledIrradiance;

        //if (light._type != this._type) {
        //    end = i;
        //    break;
        //}
        colorR += color.r;
        colorG += color.g;
        colorB += color.b;
    //}

    HX.GL.uniform3f(this._colorLocation, colorR, colorG, colorB);

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);

    return startIndex + 1;
};

HX.AmbientLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.AmbientLight.prototype._initLightPass =  function()
{
    var defines = {};
    if (this._useAO) defines.USE_AO = 1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("ambient_light_vertex.glsl"),
        HX.ShaderLibrary.get("ambient_light_fragment.glsl", defines),
        HX.Light._rectMesh
    );

    this._colorLocation = pass.getUniformLocation("lightColor");

    this._lightPass = pass;
};
/**
 *
 * @constructor
 */
HX.Frustum = function()
{
    this._planes = new Array(6);
    this._corners = new Array(8);

    for (var i = 0; i < 6; ++i)
        this._planes[i] = new HX.Float4();

    for (var i = 0; i < 8; ++i)
        this._corners[i] = new HX.Float4();
}

HX.Frustum.PLANE_LEFT = 0;
HX.Frustum.PLANE_RIGHT = 1;
HX.Frustum.PLANE_BOTTOM = 2;
HX.Frustum.PLANE_TOP = 3;
HX.Frustum.PLANE_NEAR = 4;
HX.Frustum.PLANE_FAR = 5;

HX.Frustum.CLIP_SPACE_CORNERS = [	new HX.Float4(-1.0, -1.0, -1.0, 1.0),
                                    new HX.Float4(1.0, -1.0, -1.0, 1.0),
                                    new HX.Float4(1.0, 1.0, -1.0, 1.0),
                                    new HX.Float4(-1.0, 1.0, -1.0, 1.0),
                                    new HX.Float4(-1.0, -1.0, 1.0, 1.0),
                                    new HX.Float4(1.0, -1.0, 1.0, 1.0),
                                    new HX.Float4(1.0, 1.0, 1.0, 1.0),
                                    new HX.Float4(-1.0, 1.0, 1.0, 1.0)
                                ];

HX.Frustum.prototype =
{
    getPlanes: function() { return this._planes; },
    getCorners: function() { return this._corners; },

    update: function(projection, inverseProjection)
    {
        this._updatePlanes(projection);
        this._updateCorners(inverseProjection);
    },

    _updatePlanes: function(projection)
    {
        var r1 = projection.getRow(0);
        var r2 = projection.getRow(1);
        var r3 = projection.getRow(2);
        var r4 = projection.getRow(3);

        this._planes[HX.Frustum.PLANE_LEFT].sum(r4, r1);
        this._planes[HX.Frustum.PLANE_RIGHT].difference(r4, r1);
        this._planes[HX.Frustum.PLANE_BOTTOM].sum(r4, r2);
        this._planes[HX.Frustum.PLANE_TOP].difference(r4, r2);
        this._planes[HX.Frustum.PLANE_NEAR].sum(r4, r3);
        this._planes[HX.Frustum.PLANE_FAR].difference(r4, r3);

        for (var i = 0; i < 6; ++i)
            this._planes[i].normalizeAsPlane();
    },

    _updateCorners: function(inverseProjection)
    {
        for (var i = 0; i < 8; ++i) {
            var corner = this._corners[i];
            inverseProjection.transformTo(HX.Frustum.CLIP_SPACE_CORNERS[i], corner);
            corner.scale(1.0 / corner.w);
        }
    }
};

/**
 *
 * @constructor
 */
HX.Camera = function()
{
    HX.SceneNode.call(this);

    this._renderTargetWidth = 0;
    this._renderTargetHeight = 0;
    this._viewProjectionMatrixInvalid = true;
    this._viewProjectionMatrix = new HX.Matrix4x4();
    this._inverseProjectionMatrix = new HX.Matrix4x4();
    this._inverseViewProjectionMatrix = new HX.Matrix4x4();
    this._projectionMatrix = new HX.Matrix4x4();
    this._viewMatrix = new HX.Matrix4x4();
    this._projectionMatrixDirty = true;
    this._nearDistance = .1;
    this._farDistance = 1000;
    this._frustum = new HX.Frustum();

    this.position.set(0.0, 0.0, 1.0);
};

HX.Camera.prototype = Object.create(HX.SceneNode.prototype);

HX.Camera.prototype.getViewProjectionMatrix = function ()
{
    if (this._viewProjectionMatrixInvalid)
        this._updateViewProjectionMatrix();

    return this._viewProjectionMatrix;
};

/**
 * Frustum is in world space
 */
HX.Camera.prototype.getFrustum = function ()
{
    if (this._viewProjectionMatrixInvalid)
        this._updateViewProjectionMatrix();

    return this._frustum;
};

HX.Camera.prototype.getInverseViewProjectionMatrix = function ()
{
    if (this._viewProjectionMatrixInvalid)
        this._updateViewProjectionMatrix();

    return this._inverseViewProjectionMatrix;
};

HX.Camera.prototype.getInverseProjectionMatrix = function()
{
    if (this._projectionMatrixDirty)
        this._updateProjectionMatrix();

    return this._inverseProjectionMatrix;
};

HX.Camera.prototype.getProjectionMatrix = function()
{
    if (this._projectionMatrixDirty)
        this._updateProjectionMatrix();

    return this._projectionMatrix;
};

HX.Camera.prototype.getViewMatrix = function()
{
    if (this._viewProjectionMatrixInvalid)
        this._updateViewProjectionMatrix();

    return this._viewMatrix;
};

HX.Camera.prototype.getNearDistance = function()
{
    return this._nearDistance;
};

HX.Camera.prototype.setNearDistance = function(value)
{
    this._nearDistance = value;
    this._invalidateProjectionMatrix();
};

HX.Camera.prototype.getFarDistance = function()
{
    return this._farDistance;
};

HX.Camera.prototype.setFarDistance = function(value)
{
    this._farDistance = value;
    this._invalidateProjectionMatrix();
};

HX.Camera.prototype._setRenderTargetResolution = function(width, height)
{
    this._renderTargetWidth = width;
    this._renderTargetHeight = height;
};

HX.Camera.prototype._invalidateViewProjectionMatrix = function()
{
    this._viewProjectionMatrixInvalid = true;
};

HX.Camera.prototype._invalidateWorldTransformationMatrix = function()
{
    HX.SceneNode.prototype._invalidateWorldTransformationMatrix.call(this);
    this._invalidateViewProjectionMatrix();
};

HX.Camera.prototype._updateViewProjectionMatrix = function()
{
    this._viewMatrix.inverseAffineOf(this.getWorldMatrix());
    this._viewProjectionMatrix.product(this.getProjectionMatrix(), this._viewMatrix);
    this._inverseProjectionMatrix.inverseOf(this._projectionMatrix);
    this._inverseViewProjectionMatrix.inverseOf(this._viewProjectionMatrix);
    this._frustum.update(this._viewProjectionMatrix, this._inverseViewProjectionMatrix);
    this._viewProjectionMatrixInvalid = false;
};

HX.Camera.prototype._invalidateProjectionMatrix = function()
{
    this._projectionMatrixDirty = true;
    this._invalidateViewProjectionMatrix();
};

HX.Camera.prototype._updateProjectionMatrix = function()
{
    throw "Abstract method!";
};

HX.Camera.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @constructor
 */
HX.PerspectiveCamera = function ()
{
    HX.Camera.call(this);

    this._vFOV = 1.047198;  // radians!
    this._aspectRatio = 0;
};

HX.PerspectiveCamera.prototype = Object.create(HX.Camera.prototype);

// radians!
HX.PerspectiveCamera.prototype.getVerticalFOV = function()
{
    return this._vFOV;
};

HX.PerspectiveCamera.prototype.setVerticalFOV = function(value)
{
    this._nearDistance = value;
    this._invalidateProjectionMatrix();
};

HX.PerspectiveCamera.prototype._setAspectRatio = function(value)
{
    if (this._aspectRatio == value) return;

    this._aspectRatio = value;
    this._invalidateProjectionMatrix();
};

HX.PerspectiveCamera.prototype._setRenderTargetResolution = function(width, height)
{
    HX.Camera.prototype._setRenderTargetResolution.call(this, width, height);
    this._setAspectRatio(width / height);
};

HX.PerspectiveCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.perspectiveProjection(this._vFOV, this._aspectRatio, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};

/**
 * @constructor
 */
HX.OrthographicOffCenterCamera = function ()
{
    HX.Camera.call(this);
    this._left = -1;
    this._right = 1;
    this._top = 1;
    this._bottom = -1;
};

HX.OrthographicOffCenterCamera.prototype = Object.create(HX.Camera.prototype);

HX.OrthographicOffCenterCamera.prototype.setBounds = function(left, right, top, bottom)
{
    this._left = left;
    this._right = right;
    this._top = top;
    this._bottom = bottom;
    this._invalidateProjectionMatrix();
};

HX.OrthographicOffCenterCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.orthographicOffCenterProjection(this._left, this._right, this._top, this._bottom, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};
/**
 *
 * @constructor
 */
HX.DirectionalLight = function()
{
    HX.Light.call(this, HX.DirectionalLight);

    HX.Light._rectMesh = HX.Light._rectMesh || new HX.RectMesh.create();

    this._numCascades = 3;
    this._shadowMapSize = 1024;
    // hard shadows by default
    this._numShadowSamples = 1;
    this._shadowSoftness = .05;
    this._depthBias = .01;

    this.setDirection(new HX.Float4(-1.0, -1.0, -1.0, 0.0));
    this._matrixData = null;
    this._shadowSoftnessData = null;

    this._dirLocation = null;
    this._colorLocation = null;
    this._splitDistancesLocation = null;
    this._shadowMatrixLocation = null;
    this._depthBiasLocation = null;
    this._shadowSoftnessLocation = null;
};


HX.DirectionalLight.prototype = Object.create(HX.Light.prototype);

HX.DirectionalLight.prototype.getDirection = function()
{
    var dir = this.getWorldMatrix().getColumn(2);
    dir.x = -dir.x;
    dir.y = -dir.y;
    dir.z = -dir.z;
    return dir;
};

HX.DirectionalLight.prototype.setCastsShadows = function(value)
{
    if (this._castsShadows == value) return;

    this._castsShadows = value;

    if (value) {
        this._shadowMapRenderer = new HX.CascadeShadowMapRenderer(this, this._numCascades, this._shadowMapSize);
    }
    else {
        this._shadowMapRenderer.dispose();
        this._shadowMapRenderer = null;
    }

    this._invalidateLightPass();
};

HX.DirectionalLight.prototype.getNumCascades = function()
{
    return this._numCascades;
};

HX.DirectionalLight.prototype.setNumCascades = function(value)
{
    if (value > 4) {
        console.warn("setNumCascades called with value greater than 4. Real value will be set to 4.");
        value = 4;
    }

    this._numCascades = value;
    if (this._castsShadows) this._invalidateLightPass();
    if (this._shadowMapRenderer) this._shadowMapRenderer.setNumCascades(value);
};

HX.DirectionalLight.prototype.getShadowMapSize = function()
{
    return this._shadowMapSize;
};

HX.DirectionalLight.prototype.setShadowMapSize = function(value)
{
    this._shadowMapSize = value;
    if (this._shadowMapRenderer) this._shadowMapRenderer.setShadowMapSize(value);
};

HX.DirectionalLight.prototype.getDepthBias = function()
{
    return this._depthBias;
};

HX.DirectionalLight.prototype.setDepthBias = function(value)
{
    this._depthBias = value;
};

HX.DirectionalLight.prototype.setShadowSoftness = function(value)
{
    this._shadowSoftness = value;
};

HX.DirectionalLight.prototype.setNumShadowSamples = function(value)
{
    if (value < 1) {
        value = 1;
        console.warn("setNumShadowSamples called with value smaller than 1. Real value will be set to 1.");
    }
    this._numShadowSamples = value;
    if (this._castsShadows) this._invalidateLightPass();
};

HX.DirectionalLight.prototype.setDirection = function(value)
{
    // we use the matrix for direction so it in an editor it would be able to be positioned and oriented just like any other scene object
    var matrix = new HX.Matrix4x4();
    var position = this.getWorldMatrix().getColumn(3);
    var target = HX.Float4.sum(value, position);
    matrix.lookAt(target, position, HX.Float4.Y_AXIS);
    this.setTransformationMatrix(matrix);
};

HX.DirectionalLight.prototype.activate = function(camera, gbuffer, occlusion)
{
};

// returns the index of the FIRST UNRENDERED light
HX.DirectionalLight.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    if (!this._lightPass)
        this._initLightPass();

    this._lightPass.updateGlobalState(camera, gbuffer, occlusion);
    this._lightPass.updateRenderState();

    var light = lightCollection[startIndex];
    var dir = light.getDirection();
    var color = light._scaledIrradiance;

    HX.GL.uniform3f(this._dirLocation, dir.x, dir.y, dir.z);
    HX.GL.uniform3f(this._colorLocation, color.r ,color.g, color.b);

    if (this._castsShadows) {
        var splitDistances = this._shadowMapRenderer.getSplitDistances();
        HX.GL.uniform1fv(this._splitDistancesLocation, new Float32Array(splitDistances));
        HX.GL.uniform1f(this._depthBiasLocation, light.getDepthBias());

        var k = 0;
        var l = 0;
        var len = this._numCascades;
        for (var i = 0; i < len; ++i) {
            var m = this._shadowMapRenderer.getShadowMatrix(i)._m;
            for (var j = 0; j < 16; ++j) {
                this._matrixData[k++] = m[j];
            }

            if (this._numShadowSamples > 1) {
                this._shadowSoftnessData[l++] = m[0] * this._shadowSoftness * .5;
                this._shadowSoftnessData[l++] = m[5] * this._shadowSoftness * .5;
            }
        }

        HX.GL.uniformMatrix4fv(this._shadowMatrixLocation, false, this._matrixData);

        if (this._numShadowSamples > 1)
            HX.GL.uniform2fv(this._shadowSoftnessLocation, this._shadowSoftnessData);
    }

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);

    return startIndex + 1;
};

HX.DirectionalLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.DirectionalLight.prototype._initLightPass =  function()
{
    var defines = {};

    if (this._castsShadows) {
        defines.CAST_SHADOWS = 1;
        defines.NUM_CASCADES = this._numCascades;
        defines.NUM_SHADOW_SAMPLES = this._numShadowSamples;
    }
    var vertexShader = HX.ShaderLibrary.get("directional_light_vertex.glsl", defines);
    var fragmentShader = HX.DEFERRED_LIGHT_MODEL + "\n" +
        HX.ShaderLibrary.get("snippets_directional_light.glsl", defines) + "\n" +
        HX.ShaderLibrary.get("directional_light_fragment.glsl", defines);
    var pass = new HX.EffectPass(vertexShader, fragmentShader, HX.Light._rectMesh);

    this._dirLocation = pass.getUniformLocation("lightWorldDirection");
    this._colorLocation = pass.getUniformLocation("lightColor");

    this._lightPass = pass;

    if (this._castsShadows) {
        this._matrixData = new Float32Array(16 * this._numCascades);
        this._lightPass.setTexture("shadowMap", this._shadowMapRenderer._shadowMap);
        this._splitDistancesLocation = this._lightPass.getUniformLocation("splitDistances[0]");
        this._shadowMatrixLocation = this._lightPass.getUniformLocation("shadowMapMatrices[0]");
        this._depthBiasLocation = this._lightPass.getUniformLocation("depthBias");

        if (this._numShadowSamples > 1) {
            this._shadowSoftnessLocation = this._lightPass.getUniformLocation("shadowMapSoftnesses[0]");
            this._shadowSoftnessData = new Float32Array(2 * this._numCascades);
        }
    }
};

HX.DirectionalLight.prototype._invalidateLightPass = function()
{
    if (this._lightPass) {
        this._lightPass._shader.dispose();
        this._lightPass = null;
        this._dirLocation = null;
        this._colorLocation = null;
        this._splitDistancesLocation = null;
        this._shadowMatrixLocation = null;
        this._depthBiasLocation = null;
        this._shadowSoftnessLocation = null;
        this._matrixData = null;
    }
};
/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 * @constructor
 */
HX.GlobalSpecularProbe = function(texture)
{
    this._texture = texture;

    // could just use a HX global rect mesh
    HX.GlobalSpecularProbe._rectMesh = HX.GlobalSpecularProbe._rectMesh || new HX.RectMesh.create();
    this._pass = this._initPass();
};

// conversion range for spec power to mip
HX.GlobalSpecularProbe.powerRange0 = .00098;
HX.GlobalSpecularProbe.powerRange1 = .9921;

HX.GlobalSpecularProbe.prototype = Object.create(HX.Light.prototype);

HX.GlobalSpecularProbe.prototype.render = function(camera, gbuffer, occlusion)
{
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    this._pass.updateGlobalState(camera, gbuffer, occlusion);
    this._pass.updateRenderState();

    if (this._texture) {
        var maxMip = Math.floor(Math.log(this._texture.size()) / Math.log(2));
        var mipOffset = 0;
        HX.GL.uniform1f(this._numMipsLocation, maxMip - mipOffset);
    }

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
};

HX.GlobalSpecularProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.GlobalSpecularProbe.prototype._initPass = function()
{
    var defines = {};
    var extensions;

    if (HX.EXT_SHADER_TEXTURE_LOD) {
        extensions = "#extension GL_EXT_shader_texture_lod : require";
        defines.USE_TEX_LOD = 1;
    }

    defines.K0 = HX.GlobalSpecularProbe.powerRange0;
    defines.K1 = HX.GlobalSpecularProbe.powerRange1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("global_specular_probe_vertex.glsl"),
        HX.ShaderLibrary.get("global_specular_probe_fragment.glsl", defines),
        HX.GlobalSpecularProbe._rectMesh,
        null,
        extensions
    );

    this._numMipsLocation = pass.getUniformLocation("numMips");

    pass.setTexture("specularProbeSampler", this._texture);

    var minRoughness = 0.0014;
    var maxPower = 2.0 / (minRoughness * minRoughness) - 2.0;
    var maxMipFactor = (Math.pow(2.0, -10.0/Math.sqrt(maxPower)) - HX.GlobalSpecularProbe.powerRange0)/HX.GlobalSpecularProbe.powerRange1;
    pass.setUniform("maxMipFactor", maxMipFactor);

    return pass;
};


/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 * @constructor
 */
HX.GlobalIrradianceProbe = function(texture)
{
    this._texture = texture;

    // could just use a HX global rect mesh
    HX.GlobalIrradianceProbe._rectMesh = HX.GlobalIrradianceProbe._rectMesh || new HX.RectMesh.create();
    this._usingAO = false;
};

HX.GlobalIrradianceProbe.prototype = Object.create(HX.Light.prototype);

HX.GlobalIrradianceProbe.prototype.render = function(camera, gbuffer, occlusion)
{
    var usingAO = occlusion != null;
    if (this._usingAO != usingAO || !this._pass) {
        this._usingAO = usingAO;
        this._pass = this._initPass();
    }

    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    this._pass.updateGlobalState(camera, gbuffer, occlusion);
    this._pass.updateRenderState();

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
};

HX.GlobalIrradianceProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.GlobalIrradianceProbe.prototype._initPass = function()
{
    var defines = {};

    if (this._usingAO)
        defines.USE_AO = 1;

    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("global_irradiance_probe_vertex.glsl"),
        HX.ShaderLibrary.get("global_irradiance_probe_fragment.glsl", defines),
        HX.GlobalIrradianceProbe._rectMesh
    );

    pass.setTexture("irradianceProbeSampler", this._texture);

    return pass;
};
/**
 *
 * @constructor
 */
HX.PointLight = function()
{
    HX.Light.call(this, HX.PointLight);

    HX.Light._rectMesh = HX.Light._rectMesh || new HX.RectMesh.create();
    HX.PointLight._sphereMesh = HX.PointLight._sphereMesh || new HX.Mesh(HX.MeshBatch.create(new HX.SpherePrimitive.createMeshData(
        {
            invert:true,
            numSegmentsW: HX.PointLight.SPHERE_SEGMENTS_W,
            numSegmentsH: HX.PointLight.SPHERE_SEGMENTS_H
        }), HX.PointLight.LIGHTS_PER_BATCH));

    if (HX.PointLight._fullScreenLightPasses === undefined)
        this._initLightPasses();

    HX.PointLight._positionData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
    HX.PointLight._colorData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
    HX.PointLight._attenuationData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 2);
    HX.PointLight._radiusData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH);

    this._luminanceBound = 1.0/255.0;
    this._attenuationFix = 1.0;
    this._radius = 1.0;
};

HX.PointLight.LIGHTS_PER_BATCH = 20;
HX.PointLight.SPHERE_SEGMENTS_W = 16;
HX.PointLight.SPHERE_SEGMENTS_H = 10;
HX.PointLight.NUM_SPHERE_INDICES = HX.PointLight.SPHERE_SEGMENTS_W * HX.PointLight.SPHERE_SEGMENTS_H * 6;

HX.PointLight.prototype = Object.create(HX.Light.prototype);

HX.PointLight.prototype.activate = function(camera, gbuffer, occlusion)
{
    HX.GL.disable(HX.GL.DEPTH_TEST);

    this._camera = camera;
    this._gbuffer = gbuffer;
    this._occlusion = occlusion;
    HX.PointLight._sphericalLightPass.updateGlobalState(camera, gbuffer, occlusion);
};

// returns the index of the FIRST UNRENDERED light
HX.PointLight.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    var intersectsNearPlane = lightCollection[startIndex]._renderOrderHint < 0;

    if (intersectsNearPlane) {
        return this._renderFullscreenBatch(lightCollection, startIndex);
    }
    else {
        return this._renderSphereBatch(lightCollection, startIndex);
    }
};

HX.PointLight.prototype._renderSphereBatch = function(lightCollection, startIndex)
{
    HX.PointLight._sphericalLightPass.updateRenderState();
    HX.GL.enable(HX.GL.CULL_FACE);

    var end = startIndex + HX.PointLight.LIGHTS_PER_BATCH;
    if (end > lightCollection.length) end = lightCollection.length;

    var posData = HX.PointLight._positionData;
    var colorData = HX.PointLight._colorData;
    var attData = HX.PointLight._attenuationData;
    var radiusData = HX.PointLight._radiusData;

    var v1i = 0, v2i = 0, v3i = 0;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];
        if (light._type != this._type || light._renderOrderHint < 0) {
            end = i;
            continue;
        }

        var pos = light.getWorldMatrix().getColumn(3);
        var color = light._scaledIrradiance;

        posData[v3i] = pos.x;
        colorData[v3i++] = color.r;
        posData[v3i] = pos.y;
        colorData[v3i++] = color.g;
        posData[v3i] = pos.z;
        colorData[v3i++] = color.b;
        attData[v2i++] = light._attenuationFix;
        attData[v2i++] = 1.0 / (1.0 - light._attenuationFix);
        radiusData[v1i++] = light._radius * 2 * 1.0001;
    }

    HX.GL.uniform3fv(HX.PointLight._sphericalPositionLocation, posData);
    HX.GL.uniform3fv(HX.PointLight._sphericalColorLocation, colorData);
    HX.GL.uniform2fv(HX.PointLight._sphericalAttenuationFixFactorsLocation, attData);
    HX.GL.uniform1fv(HX.PointLight._sphericalLightRadiusLocation, radiusData);

    HX.GL.drawElements(HX.GL.TRIANGLES, HX.PointLight.NUM_SPHERE_INDICES * (end - startIndex), HX.GL.UNSIGNED_SHORT, 0);

    return end;
};

HX.PointLight.prototype.initFullScreenPass = function (passIndex)
{
    var defines = {
        LIGHTS_PER_BATCH: passIndex + 1
    };
    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("point_light_fullscreen_vertex.glsl", defines),
        HX.DEFERRED_LIGHT_MODEL + HX.ShaderLibrary.get("point_light_fullscreen_fragment.glsl", defines),
        HX.Light._rectMesh);
    HX.PointLight._fullScreenPositionLocations[passIndex] = pass.getUniformLocation("lightWorldPosition[0]");
    HX.PointLight._fullScreenColorLocations[passIndex] = pass.getUniformLocation("lightColor[0]");
    HX.PointLight._fullScreenAttenuationFixFactorsLocations[passIndex] = pass.getUniformLocation("attenuationFixFactors[0]");
    HX.PointLight._fullScreenLightPasses[passIndex] = pass;
};

HX.PointLight.prototype._renderFullscreenBatch = function(lightCollection, startIndex)
{
    HX.GL.disable(HX.GL.CULL_FACE);

    // TODO: provide a shader for each light count?
    var end = startIndex + HX.PointLight.LIGHTS_PER_BATCH;
    if (end > lightCollection.length) end = lightCollection.length;

    var posData = HX.PointLight._positionData;
    var colorData = HX.PointLight._colorData;
    var attData = HX.PointLight._attenuationData;

    var v3i = 0, v2i = 0;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];

        // either type switch or light._renderOrderHint change
        if (light._type != this._type /*|| light._renderOrderHint > 0*/) {
            end = i;
            continue;
        }

        var pos = light.getWorldMatrix().getColumn(3);
        var color = light._scaledIrradiance;

        posData[v3i] = pos.x;
        colorData[v3i++] = color.r;
        posData[v3i] = pos.y;
        colorData[v3i++] = color.g;
        posData[v3i] = pos.z;
        colorData[v3i++] = color.b;
        attData[v2i++] = light._attenuationFix;
        attData[v2i++] = 1.0 / (1.0 - light._attenuationFix);
    }

    var passIndex = i - startIndex - 1;

    if (!HX.PointLight._fullScreenLightPasses[passIndex]) {
        this.initFullScreenPass(passIndex);
    }

    HX.PointLight._fullScreenLightPasses[passIndex].updateGlobalState(camera, this._gbuffer, this._occlusion);
    HX.PointLight._fullScreenLightPasses[passIndex].updateRenderState();

    HX.GL.uniform3fv(HX.PointLight._fullScreenPositionLocations[passIndex], posData);
    HX.GL.uniform3fv(HX.PointLight._fullScreenColorLocations[passIndex], colorData);
    HX.GL.uniform2fv(HX.PointLight._fullScreenAttenuationFixFactorsLocations[passIndex], attData);

    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);

    return end;
};

HX.PointLight.prototype._updateScaledIrradiance  = function ()
{
    HX.Light.prototype._updateScaledIrradiance.call(this);

    this._attenuationFix = this._luminanceBound / this._luminance;
    this._radius = Math.sqrt(1.0 / this._attenuationFix);

    this._invalidateWorldBounds();
};

HX.PointLight.prototype._createBoundingVolume = function()
{
    return new HX.BoundingSphere();
};

HX.PointLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.setExplicit(this.getWorldMatrix().getColumn(3), this._radius);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.PointLight.prototype.getRadius = function()
{
    return this._worldBounds.getRadius();
};

HX.PointLight.prototype._initLightPasses =  function()
{
    // the full screen passes will be generated on demand
    HX.PointLight._fullScreenLightPasses = [];
    HX.PointLight._fullScreenPositionLocations = [];
    HX.PointLight._fullScreenColorLocations = [];
    HX.PointLight._fullScreenAttenuationFixFactorsLocations = [];

    var defines = {
        LIGHTS_PER_BATCH: HX.PointLight.LIGHTS_PER_BATCH
    };
    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("point_light_spherical_vertex.glsl", defines),
        HX.DEFERRED_LIGHT_MODEL + HX.ShaderLibrary.get("point_light_spherical_fragment.glsl", defines),
        HX.PointLight._sphereMesh);

    HX.PointLight._sphericalLightPass = pass;
    HX.PointLight._sphericalPositionLocation = pass.getUniformLocation("lightWorldPosition[0]");
    HX.PointLight._sphericalColorLocation = pass.getUniformLocation("lightColor[0]");
    HX.PointLight._sphericalAttenuationFixFactorsLocation = pass.getUniformLocation("attenuationFixFactors[0]");
    HX.PointLight._sphericalLightRadiusLocation = pass.getUniformLocation("lightRadius[0]");
};
/**
 * Skybox provides a backdrop "at infinity" for the scene.
 * @param materialOrTexture Either a texture or a material used to render the skybox. If a texture is passed,
 * HX.SkyboxMaterial is used as material.
 * @constructor
 */
HX.Skybox = function(materialOrTexture)
{
    if (!(materialOrTexture instanceof HX.Material))
        materialOrTexture = new HX.SkyboxMaterial(materialOrTexture);

    this._modelInstance = new HX.ModelInstance(HX.PlanePrimitive.create({alignment: HX.PlanePrimitive.ALIGN_XY, width: 2, height: 2}), materialOrTexture);
    this._globalSpecularProbe = null;
    this._globalIrradianceProbe = null;
};

// TODO: Not sure if we want to always be stuck to a skybox for global probes?
HX.Skybox.prototype =
{
    getGlobalSpecularProbe: function()
    {
        return this._globalSpecularProbe;
    },

    setGlobalSpecularProbe: function(value)
    {
        this._globalSpecularProbe = value;
    },

    getGlobalIrradianceProbe: function()
    {
        return this._globalIrradianceProbe;
    },

    setGlobalIrradianceProbe: function(value)
    {
        this._globalIrradianceProbe = value;
    }
}
HX.MeshBatch = {
    create: function(sourceMeshData, numInstances)
    {
        var target = HX.MeshData.createDefaultBatchEmpty();
        var targetVertices = [];
        var targetIndices = [];
        var sourceVertices = sourceMeshData._vertexData;
        var sourceIndices = sourceMeshData._indexData;
        var len = sourceVertices.length;
        var indexIndex = 0;
        var vertexIndex = 0;

        target.vertexUsage = sourceMeshData.vertexUsage;
        target.indexUsage = sourceMeshData.vertexUsage;

        for (var i = 0; i < numInstances; ++i) {
            var indexOffset = vertexIndex / HX.MeshData.DEFAULT_BATCHED_VERTEX_SIZE;
            len = sourceVertices.length;
            var j = 0;
            while (j < len) {
                for (var k = 0; k < HX.MeshData.DEFAULT_VERTEX_SIZE; ++k)
                    targetVertices[vertexIndex++] = sourceVertices[j++];

                targetVertices[vertexIndex++] = i;
            }

            len = sourceIndices.length;
            for (j = 0; j < len; ++j)
                targetIndices[indexIndex++] = sourceIndices[j] + indexOffset;
        }

        target.setVertexData(targetVertices);
        target.setIndexData(targetIndices);

        return target;
    }
};
/**
 *
 * @constructor
 */
HX.MeshData = function ()
{
    this._vertexStride = 0;
    this._vertexData = undefined;
    this._indexData = undefined;
    this.vertexUsage = HX.GL.STATIC_DRAW;
    this.indexUsage = HX.GL.STATIC_DRAW;
    this._vertexAttributes = [];
}

HX.MeshData.DEFAULT_VERTEX_SIZE = 12;
HX.MeshData.DEFAULT_BATCHED_VERTEX_SIZE = 13;

HX.MeshData.createDefaultEmpty = function()
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 3);
    data.addVertexAttribute('hx_normal', 3);
    data.addVertexAttribute('hx_tangent', 4);
    data.addVertexAttribute('hx_texCoord', 2);
    return data;
};

HX.MeshData.createDefaultBatchEmpty = function()
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 3);
    data.addVertexAttribute('hx_normal', 3);
    data.addVertexAttribute('hx_tangent', 4);
    data.addVertexAttribute('hx_texCoord', 2);
    data.addVertexAttribute('hx_instanceID', 1);
    return data;
};


HX.MeshData.prototype = {
    constructor: HX.MeshData,

    /**
     * Sets data from Array
     */
    setVertexData: function (data)
    {
        this._vertexData = new Float32Array(data);
    },

    /**
     * Sets data from Array
     */
    setIndexData: function (data)
    {
        this._indexData = new Uint16Array(data);
    },

    /**
     * Adds a named vertex attribute. All properties are given manually to make it easier to support multiple streams in the future.
     * @param name The name of the attribute, matching the attribute name used in the vertex shaders.
     * @param numComponents The amount of components used by the attribute value.
     */
    addVertexAttribute: function (name, numComponents)
    {
        var offset = this._vertexStride;
        this._vertexStride += numComponents;
        this._vertexAttributes.push({name: name, offset: offset, numComponents: numComponents});
    },

    getVertexAttribute: function(name)
    {
        var len = this._vertexAttributes.length;
        for (var i = 0; i < len; ++i) {
            if (this._vertexAttributes[i].name === name)
                return this._vertexAttributes[i];
        }
    },

    /**
     * Returns the stride of each vertex. This matches the total amount of elements used by all vertex attributes combined.
     */
    getVertexStride: function()
    {
        return this._vertexStride;
    }
}

/**
 *
 * @param meshData
 * @constructor
 */
HX.Mesh = function (meshData)
{
    this._vertexBuffer = new HX.VertexBuffer();
    this._indexBuffer = new HX.IndexBuffer();

    this._vertexBuffer.uploadData(meshData._vertexData, meshData.vertexUsage);
    this._indexBuffer.uploadData(meshData._indexData, meshData.indexUsage);

    this._numIndices = meshData._indexData.length;

    this._vertexStride = meshData.getVertexStride();

    this._vertexAttributes = meshData._vertexAttributes;
    this._renderOrderHint = ++HX.Mesh.ID_COUNTER;
}

HX.Mesh.ID_COUNTER = 0;


HX.Mesh.prototype = {
    constructor: HX.Mesh,

    dispose: function ()
    {
        this._vertexBuffer.dispose();
        this._indexBuffer.dispose();
    },

    numIndices: function ()
    {
        return this._numIndices;
    },

    numVertexAttributes: function ()
    {
        return this._vertexAttributes.length;
    },

    getVertexStride: function ()
    {
        return this._vertexStride;
    },

    getVertexAttribute: function (index)
    {
        return this._vertexAttributes[index];
    }
}

/**
 *
 * @constructor
 */
HX.ModelData = function ()
{
    this._meshDataList = [];
}

HX.ModelData.prototype = {
    constructor: HX.ModelData,

    numMeshes: function ()
    {
        return this._meshDataList.length;
    },
    getMeshData: function (index)
    {
        return this._meshDataList[index];
    },
    addMeshData: function (meshData)
    {
        this._meshDataList.push(meshData);
    }
}

/**
 *
 * @param modelData
 * @constructor
 */
HX.Model = function (modelData)
{
    this._localBounds = new HX.BoundingAABB();
    this.onChange = new HX.Signal();

    if (modelData) {
        this._meshes = null;
        this._setModelData(modelData);
    }
    else
        this._meshes = [];
}

HX.Model.prototype = {
    constructor: HX.Model,

    numMeshes: function ()
    {
        return this._meshes.length;
    },

    getMesh: function (index)
    {
        return this._meshes[index];
    },

    dispose: function()
    {
        if (this._meshes)
            for (var i = 0; i < this._meshes.length; ++i)
                this._meshes[i].dispose();
    },

    getLocalBounds: function()
    {
        return this._localBounds;
    },

    _setModelData: function (modelData)
    {
        this.dispose();

        this._localBounds.clear();
        this._meshes = [];

        for (var i = 0; i < modelData.numMeshes(); ++i) {
            var meshData = modelData.getMeshData(i);
            this._localBounds.growToIncludeMesh(meshData);
            this._meshes.push(new HX.Mesh(meshData));
        }

        this.onChange.dispatch();
    }
};

/**
 *
 * @param filename
 * @constructor
 */
HX.FileModel = function(filename)
{
    HX.Model.call(this);

    var self = this;

    var onComplete = function(modelData)
    {
        self._setModelData(modelData);
    };

    HX.ModelParser.parse(filename, onComplete);
};

HX.FileModel.prototype = Object.create(HX.Model.prototype);
/**
 *
 * @param mesh
 * @param pass
 * @constructor
 */
HX.VertexLayout = function(mesh, pass)
{
    var shader = pass.getShader();
    this.attributes = [];

    this._numAttributes = -1;

    var stride = mesh.getVertexStride();
    for (var i = 0; i < mesh.numVertexAttributes(); ++i) {
        var attribute = mesh.getVertexAttribute(i);
        var index = shader.getVertexAttributeIndex(attribute.name);

        this._numAttributes = Math.max(this._numAttributes, index);

        // convert offset and stride to bytes
        if (index >= 0)
            this.attributes.push({index: index, offset: attribute.offset * 4, numComponents: attribute.numComponents, stride: stride * 4});

    }

    ++this._numAttributes;
};

HX.VertexLayout.prototype = {
    constructor: HX.VertexLayout
};

/**
 *
 * @param mesh
 * @param material
 * @constructor
 */
HX.MeshInstance = function(mesh, material)
{
    this._mesh = mesh;
    this._meshMaterialLinkInvalid = false;

    this.setMaterial(material);
};

HX.MeshInstance.prototype = {
    constructor: HX.MeshInstance,

    getMaterial: function()
    {
        return this._material;
    },

    setMaterial: function(value)
    {
        if (this._material)
            this._material.onChange.unbind(this._onMaterialChange);

        this._material = value;

        // TODO: May want to set a default "purple" material when nothing is provided?
        if (this._material)
            this._material.onChange.bind(this, this._onMaterialChange);

        this._linkMeshWithMaterial();
    },

    /**
     * Sets state for this mesh/material combination.
     * @param passType
     */
    updateRenderState: function(passType)
    {
        if (this._meshMaterialLinkInvalid)
            this._linkMeshWithMaterial();

        this._mesh._vertexBuffer.bind();
        this._mesh._indexBuffer.bind();

        var layout = this._vertexLayouts[passType];
        var attributes = layout.attributes;
        var len = attributes.length;

        for (var i = 0; i < len; ++i) {
            var attribute = attributes[i];
            HX.GL.vertexAttribPointer(attribute.index, attribute.numComponents, HX.GL.FLOAT, false, attribute.stride, attribute.offset);
        }

        HX.enableAttributes(layout._numAttributes);
    },

    _initVertexLayouts: function()
    {
        this._vertexLayouts = new Array(HX.MaterialPass.NUM_TOTAL_PASS_TYPES);
        for (var type = 0; type < HX.MaterialPass.NUM_TOTAL_PASS_TYPES; ++type) {
            var pass = this._material.getPass(type);
            if (pass)
                this._vertexLayouts[type] = new HX.VertexLayout(this._mesh, pass);
        }
    },

    _linkMeshWithMaterial: function()
    {
        this._initVertexLayouts();

        this._uniformSetters = new Array( HX.MaterialPass.NUM_TOTAL_PASS_TYPES );

        for (var i = 0; i < HX.MaterialPass.NUM_TOTAL_PASS_TYPES; ++i) {
            if (this._material.hasPass(i)) {
                var pass = this._material.getPass(i);
                this._uniformSetters[i] = HX.UniformSetter.getSetters(pass._shader);
            }

        }

        this._meshMaterialLinkInvalid = false;
    },

    _onMaterialChange: function()
    {
        this._meshMaterialLinkInvalid = true;
    }
};

/**
 * Creates a new ModelInstance object. ModelInstances are a given combination of a Model and a set of Materials
 * (up to 1 per Mesh). They can be reused and attached to several SceneNode objects.
 * @param model
 * @param materials
 * @constructor
 */
HX.ModelInstance = function(model, materials)
{
    this._model = model;
    this._meshInstances = [];
    this._castsShadows = true;
    this.onChange = new HX.Signal();
    this._model.onChange.bind(this, this._onModelChange);

    this._materials = materials instanceof Array? materials : [ materials ];

    this._onModelChange();
};

HX.ModelInstance.prototype = {
    constructor: HX.ModelInstance,

    getModel: function() { return this._model; },

    getCastsShadows: function() { return this._castsShadows; },
    setCastsShadows: function(value) { this._castsShadows = value; },

    numMeshInstances: function() { return this._meshInstances.length; },
    getMeshInstance: function(index) { return this._meshInstances[index]; },

    getLocalBounds: function() { return this._model.getLocalBounds(); },

    _addMeshInstance: function(mesh, material)
    {
        this._meshInstances.push(new HX.MeshInstance(mesh, material));
    },

    _onModelChange: function()
    {
        var maxIndex = this._materials.length - 1;
        for (var i = 0; i < this._model.numMeshes(); ++i) {
            this._addMeshInstance(this._model.getMesh(i), this._materials[Math.min(i, maxIndex)]);
        }

        this.onChange.dispatch();
    }
};
/**
 * @constructor
 */
HX.BoxPrimitive = {};

HX.BoxPrimitive._createMeshData = function(definition)
{
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || 1;
    var numSegmentsD = definition.numSegmentsD || 1;
    var width = definition.width || 1;
    var height = definition.height || width;
    var depth = definition.depth || width;
    var scaleU = definition.scaleU || 1;
    var scaleV = definition.scaleV || 1;
    var flipSign = definition.invert? -1 : 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var VERTEX_SIZE = HX.MeshData.DEFAULT_VERTEX_SIZE;
    var data = new HX.MeshData.createDefaultEmpty();

    var NUM_FACES = 6;

    var vertices = [];
    var indices = [];

    var oppositeVertexIndex;
    var vertexIndex = 0;
    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var rcpNumSegmentsD = 1/numSegmentsD;
    var halfW = width * .5;
    var halfH = height * .5;
    var halfD = depth * .5;

    // front and back
    oppositeVertexIndex = vertexIndex + (numSegmentsW + 1)*(numSegmentsH + 1) * VERTEX_SIZE;

    for (var hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        var ratioV = hSegment * rcpNumSegmentsH;
        var y = height * ratioV - halfH;
        if (flipSign < 0) ratioV = 1.0 - ratioV;

        for (var wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            var ratioU = wSegment * rcpNumSegmentsW;
            var x = width * ratioU - halfW;

            if (flipSign < 0) ratioU = 1.0 - ratioU;

            // front
            vertices[vertexIndex] = x*flipSign; vertices[vertexIndex + 1] = y*flipSign; vertices[vertexIndex + 2] = halfD*flipSign;
            vertices[vertexIndex + 3] = 0; vertices[vertexIndex + 4] = 0; vertices[vertexIndex + 5] = 1;
            vertices[vertexIndex + 6] = 1; vertices[vertexIndex + 7] = 0; vertices[vertexIndex + 8] = 0; vertices[vertexIndex + 9] = 1;
            vertices[vertexIndex + 10] = ratioU*scaleU; vertices[vertexIndex + 11] = ratioV*scaleV;

            // back
            vertices[oppositeVertexIndex] = -x*flipSign; vertices[oppositeVertexIndex + 1] = y*flipSign; vertices[oppositeVertexIndex + 2] = -halfD*flipSign;
            vertices[oppositeVertexIndex + 3] = 0; vertices[oppositeVertexIndex + 4] = 0; vertices[oppositeVertexIndex + 5] = -1;
            vertices[oppositeVertexIndex + 6] = -1; vertices[oppositeVertexIndex + 7] = 0; vertices[oppositeVertexIndex + 8] = 0; vertices[vertexIndex + 9] = 1;
            vertices[oppositeVertexIndex + 10] = ratioU*scaleU; vertices[oppositeVertexIndex + 11] = ratioV*scaleV;

            vertexIndex += VERTEX_SIZE;
            oppositeVertexIndex += VERTEX_SIZE;
        }
    }

    vertexIndex = oppositeVertexIndex;
    oppositeVertexIndex = vertexIndex + (numSegmentsD + 1)*(numSegmentsH + 1) * VERTEX_SIZE;

    for (var hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        var ratioV = hSegment * rcpNumSegmentsH;
        var y = height * ratioV - halfH;

        for (var dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
            var ratioU = dSegment * rcpNumSegmentsD;
            var z = depth * ratioU - halfD;

            // left
            vertices[vertexIndex] = -halfW; vertices[vertexIndex + 1] = y; vertices[vertexIndex + 2] = z*flipSign;
            vertices[vertexIndex + 3] = -flipSign; vertices[vertexIndex + 4] = 0; vertices[vertexIndex + 5] = 0;
            vertices[vertexIndex + 6] = 0; vertices[vertexIndex + 7] = 0; vertices[vertexIndex + 8] = flipSign; vertices[vertexIndex + 9] = 1;
            vertices[vertexIndex + 10] = ratioU*scaleU; vertices[vertexIndex + 11] = ratioV*scaleV;

            // right
            vertices[oppositeVertexIndex] = halfW; vertices[oppositeVertexIndex + 1] = y; vertices[oppositeVertexIndex + 2] = -z*flipSign;
            vertices[oppositeVertexIndex + 3] = flipSign; vertices[oppositeVertexIndex + 4] = 0; vertices[oppositeVertexIndex + 5] = 0;
            vertices[oppositeVertexIndex + 6] = 0; vertices[oppositeVertexIndex + 7] = 0; vertices[oppositeVertexIndex + 8] = -flipSign; vertices[vertexIndex + 9] = 1;
            vertices[oppositeVertexIndex + 10] = ratioU*scaleU; vertices[oppositeVertexIndex + 11] = ratioV*scaleV;

            vertexIndex += VERTEX_SIZE;
            oppositeVertexIndex += VERTEX_SIZE;
        }
    }

    vertexIndex = oppositeVertexIndex;
    oppositeVertexIndex = vertexIndex + (numSegmentsW + 1)*(numSegmentsD + 1) * VERTEX_SIZE;

    for (var dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
        var ratioV = dSegment * rcpNumSegmentsD;
        var z = depth * ratioV - halfD;

        for (var wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            var ratioU = wSegment * rcpNumSegmentsW;
            var x = width * ratioU - halfW;

            // top
            vertices[vertexIndex] = x; vertices[vertexIndex + 1] = halfH; vertices[vertexIndex + 2] = -z*flipSign;
            vertices[vertexIndex + 3] = 0; vertices[vertexIndex + 4] = flipSign; vertices[vertexIndex + 5] = 0;
            vertices[vertexIndex + 6] = 1; vertices[vertexIndex + 7] = 0; vertices[vertexIndex + 8] = 0; vertices[vertexIndex + 9] = 1;
            vertices[vertexIndex + 10] = ratioU*scaleU; vertices[vertexIndex + 11] = ratioV*scaleV;

            // bottom
            vertices[oppositeVertexIndex] = x; vertices[oppositeVertexIndex + 1] = -halfH; vertices[oppositeVertexIndex + 2] = z*flipSign;
            vertices[oppositeVertexIndex + 3] = 0; vertices[oppositeVertexIndex + 4] = -flipSign; vertices[oppositeVertexIndex + 5] = 0;
            vertices[oppositeVertexIndex + 6] = 1; vertices[oppositeVertexIndex + 7] = 0; vertices[oppositeVertexIndex + 8] = 0; vertices[vertexIndex + 9] = 1;
            vertices[oppositeVertexIndex + 10] = ratioU*scaleU; vertices[oppositeVertexIndex + 11] = ratioV*scaleV;

            vertexIndex += VERTEX_SIZE;
            oppositeVertexIndex += VERTEX_SIZE;
        }
    }

    var offset = 0;
    var indexIndex = 0;
    for (var face = 0; face < NUM_FACES; ++face) {
        // order:
        // front, back, left, right, bottom, top
        var numSegmentsU = face == 2 || face == 3? numSegmentsD : numSegmentsW;
        var numSegmentsV = face == 4 || face == 5? numSegmentsD : numSegmentsH;

        for (var yi = 0; yi < numSegmentsV; ++yi) {
            for (var xi = 0; xi < numSegmentsU; ++xi) {
                var w = numSegmentsU + 1;
                var base = offset + xi + yi*w;

                indices[indexIndex] = base;
                indices[indexIndex + 1] = base + w + 1;
                indices[indexIndex + 2] = base + w;
                indices[indexIndex + 3] = base;
                indices[indexIndex + 4] = base + 1;
                indices[indexIndex + 5] = base + w + 1;

                indexIndex += 6;
            }
        }
        offset += (numSegmentsU + 1) * (numSegmentsV + 1);
    }

    if (doubleSided) {
        var i = 0;
        var len = indexIndex;

        while (i < len) {
            indices[indexIndex + i] = indices[i];
            indices[indexIndex + i + 1] = indices[i + 2];
            indices[indexIndex + i + 2] = indices[i + 1];
            indices[indexIndex + i + 3] = indices[i + 3];
            indices[indexIndex + i + 4] = indices[i + 5];
            indices[indexIndex + i + 5] = indices[i + 4];
            i += 6;
        }
    }

    data.setVertexData(vertices);
    data.setIndexData(indices);
    return data;
};

HX.BoxPrimitive.createMesh = function(definition)
{
    var data = HX.BoxPrimitive._createMeshData(definition);
    return new HX.Mesh(data);
};

HX.BoxPrimitive.create = function(definition)
{
    definition = definition || {};

    var data = HX.BoxPrimitive._createMeshData(definition);

    var modelData = new HX.ModelData();
    modelData.addMeshData(data);

    return new HX.Model(modelData);
};
/**
 * Provide a definition with the property names to automatically build a primitive. Properties provided in the definition
 * are the same as the setter names (without get/set).
 * @param definition
 * @constructor
 */
HX.PlanePrimitive = {};

HX.PlanePrimitive.ALIGN_XZ = 1;
HX.PlanePrimitive.ALIGN_XY = 2;
HX.PlanePrimitive.ALIGN_YZ = 3;

HX.PlanePrimitive.create = function(definition)
{
    definition = definition || {};
    var alignment = definition.alignment || HX.PlanePrimitive.ALIGN_XZ;
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || 1;
    var width = definition.width || 1;
    var height = definition.height || 1;
    var scaleU = definition.scaleU || 1;
    var scaleV = definition.scaleV || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var VERTEX_SIZE = HX.MeshData.DEFAULT_VERTEX_SIZE;
    var data = new HX.MeshData.createDefaultEmpty();

    var numIndices = numSegmentsH*numSegmentsW * 6;
    var numVertices = (numSegmentsH + 1)*(numSegmentsW + 1);

    if (doubleSided) {
        numIndices *= 2;
        numVertices *= 2;
    }

    var vertices = new Array(numVertices * VERTEX_SIZE);
    var indices = new Array(numIndices);

    var vertexIndex = 0;
    var indexIndex = 0;
    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var posX = 0, posY = 0, posZ = 0;
    var normalX = 0, normalY = 0, normalZ = 0;
    var tangentX = 0, tangentY = 0, tangentZ = 0;
    var bitangentX = 0, bitangentY = 0, bitangentZ = 0;
    var uvU = 0, uvV = 0;

    if (alignment == HX.PlanePrimitive.ALIGN_XY) {
        normalZ = -1;
        tangentX = 1;
        bitangentY = 1;
    }
    else if (alignment == HX.PlanePrimitive.ALIGN_XZ) {
        normalY = 1;
        tangentX = -1;
        bitangentZ = 1;
    }
    else {
        normalX = 1;
        tangentZ = 1;
        bitangentY = 1;
    }

    for (var yi = 0; yi <= numSegmentsH; ++yi) {
        var y = (yi*rcpNumSegmentsH - .5)*height;

        for (var xi = 0; xi <= numSegmentsW; ++xi) {
            var x = (xi*rcpNumSegmentsW - .5)*width;

            if (alignment == HX.PlanePrimitive.ALIGN_XY) {
                posX = x;
                posY = y;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }
            else if (alignment == HX.PlanePrimitive.ALIGN_XZ) {
                posX = x;
                posZ = y;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }
            else {
                posY = y;
                posZ = x;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }

            uvU *= scaleU;
            uvV *= scaleV;

            vertices[vertexIndex] = posX; vertices[vertexIndex + 1] = posY; vertices[vertexIndex + 2] = posZ;
            vertices[vertexIndex + 3] = normalX; vertices[vertexIndex + 4] = normalY; vertices[vertexIndex + 5] = normalZ;
            vertices[vertexIndex + 6] = tangentX; vertices[vertexIndex + 7] = tangentY; vertices[vertexIndex + 8] = tangentZ; vertices[vertexIndex + 9] = 1.0;
            vertices[vertexIndex + 10] = uvU; vertices[vertexIndex + 11] = uvV;

            vertexIndex += VERTEX_SIZE;

            // add vertex with same position, but with inverted normal & tangent
            if (doubleSided) {
                vertices[vertexIndex] = posX; vertices[vertexIndex + 1] = posY; vertices[vertexIndex + 2] = posZ;
                vertices[vertexIndex + 3] = -normalX; vertices[vertexIndex + 4] = -normalY; vertices[vertexIndex + 5] = -normalZ;
                vertices[vertexIndex + 6] = -tangentX; vertices[vertexIndex + 7] = -tangentY; vertices[vertexIndex + 8] = -tangentZ; vertices[vertexIndex + 9] = 1.0;
                vertices[vertexIndex + 10] = 1.0 - uvU; vertices[vertexIndex + 11] = uvV;

                vertexIndex += VERTEX_SIZE;
            }

            if (xi != numSegmentsW && yi != numSegmentsH) {
                var w = numSegmentsW + 1;
                var base = xi + yi*w;
                var mult = doubleSided ? 1 : 0;

                indices[indexIndex] = base << mult;
                indices[indexIndex + 1] = (base + w) << mult;
                indices[indexIndex + 2] = (base + w + 1) << mult;
                indices[indexIndex + 3] = base << mult;
                indices[indexIndex + 4] = (base + w + 1) << mult;
                indices[indexIndex + 5] = (base + 1) << mult;

                indexIndex += 6;

                if(doubleSided) {
                    indices[indexIndex] = ((base + w + 1) << mult) + 1;
                    indices[indexIndex + 1] = ((base + w) << mult) + 1;
                    indices[indexIndex + 2] = (base << mult) + 1;
                    indices[indexIndex + 3] = ((base + 1) << mult) + 1;
                    indices[indexIndex + 4] = ((base + w + 1) << mult) + 1;
                    indices[indexIndex + 5] = (base << mult) + 1;
                    indexIndex += 6;
                }
            }
        }
    }

    data.setVertexData(vertices);
    data.setIndexData(indices);

    var modelData = new HX.ModelData();
    modelData.addMeshData(data);

    return new HX.Model(modelData);
};
HX.RectMesh = {};

HX.RectMesh.create = function()
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 2);
    data.addVertexAttribute('hx_texCoord', 2);
    data.setVertexData([-1, 1, 0, 1,
                        1, 1, 1, 1,
                        1, -1, 1, 0,
                        -1, -1, 0, 0]);
    data.setIndexData([0, 1, 2, 0, 2, 3]);
    return new HX.Mesh(data);
}
/**
 * Provide a definition with the property names to automatically build a primitive. Properties provided in the definition
 * are the same as the setter names (without get/set).
 * @param definition
 * @constructor
 */
HX.SpherePrimitive = {};

HX.SpherePrimitive.createMeshData = function(definition)
{
    var numSegmentsW = definition.numSegmentsW || 16;
    var numSegmentsH = definition.numSegmentsH || 10;
    var radius = definition.radius || .5;
    var scaleU = definition.scaleU || 1;
    var scaleV = definition.scaleV || 1;
    var flipSign = definition.invert? -1 : 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var VERTEX_SIZE = HX.MeshData.DEFAULT_VERTEX_SIZE;
    var data = new HX.MeshData.createDefaultEmpty();

    var numIndices = numSegmentsH*numSegmentsW * 6;
    var numVertices = (numSegmentsH + 1)*(numSegmentsW + 1);

    var vertices = new Array(numVertices * VERTEX_SIZE);
    var indices = new Array(numIndices);

    var vertexIndex = 0;
    var indexIndex = 0;
    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    for (var polarSegment = 0; polarSegment <= numSegmentsH; ++polarSegment) {
        var ratioV = polarSegment * rcpNumSegmentsH;
        var theta = ratioV * Math.PI;

        var y = -Math.cos(theta);
        var segmentUnitRadius = Math.sin(theta);

        if (flipSign < 0) ratioV = 1.0 - ratioV;

        for (var azimuthSegment = 0; azimuthSegment <= numSegmentsW; ++azimuthSegment) {
            var ratioU = azimuthSegment * rcpNumSegmentsW;
            var phi = ratioU * Math.PI * 2.0;

            if (flipSign) ratioU = 1.0 - ratioU;

            var normalX = Math.cos(phi) * segmentUnitRadius * flipSign;
            var normalY = y * flipSign;
            var normalZ = Math.sin(phi) * segmentUnitRadius * flipSign;

            vertices[vertexIndex] = normalX*radius; vertices[vertexIndex + 1] = normalY*radius; vertices[vertexIndex + 2] = normalZ*radius;
            vertices[vertexIndex + 3] = normalX * flipSign; vertices[vertexIndex + 4] = normalY * flipSign; vertices[vertexIndex + 5] = normalZ * flipSign;
            vertices[vertexIndex + 6] = -normalZ; vertices[vertexIndex + 7] = 0; vertices[vertexIndex + 8] = normalX; vertices[vertexIndex + 9] = 1.0;
            vertices[vertexIndex + 10] = 1.0 - ratioU*scaleU; vertices[vertexIndex + 11] = ratioV*scaleV;

            vertexIndex += VERTEX_SIZE;
        }
    }

    for (var polarSegment = 0; polarSegment < numSegmentsH; ++polarSegment) {
        for (var azimuthSegment = 0; azimuthSegment < numSegmentsW; ++azimuthSegment) {
            var w = numSegmentsW + 1;
            var base = azimuthSegment + polarSegment*w;

            indices[indexIndex] = base;
            indices[indexIndex + 1] = base + w;
            indices[indexIndex + 2] = base + w + 1;
            indices[indexIndex + 3] = base;
            indices[indexIndex + 4] = base + w + 1;
            indices[indexIndex + 5] = base + 1;

            indexIndex += 6;

            if (doubleSided) {
                indices[indexIndex] = base;
                indices[indexIndex + 1] = base + w + 1;
                indices[indexIndex + 2] = base + w;
                indices[indexIndex + 3] = base;
                indices[indexIndex + 4] = base + 1;
                indices[indexIndex + 5] = base + w + 1;
            }
        }
    }

    data.setVertexData(vertices);
    data.setIndexData(indices);
    return data;
};

HX.SpherePrimitive.createMesh = function(definition)
{
    var data = HX.SpherePrimitive.createMeshData(definition);
    return new HX.Mesh(data);
};

HX.SpherePrimitive.create = function(definition)
{
    definition = definition || {};

    var data = HX.SpherePrimitive.createMeshData(definition);

    var modelData = new HX.ModelData();
    modelData.addMeshData(data);

    return new HX.Model(modelData);
}
/**
 * @constructor
 */
HX.FrameBuffer = function(colorTextures, depthBuffer)
{
    if (colorTextures && colorTextures[0] === undefined) colorTextures = [ colorTextures ];

    this._colorTextures = colorTextures;
    this._numColorTextures = this._colorTextures? this._colorTextures.length : 0;
    this._depthBuffer = depthBuffer;

    if (this._colorTextures && this._numColorTextures > 1) {

        this._drawBuffers = new Array(this._numColorTextures);
        for (var i = 0; i < this._numColorTextures; ++i) {
            this._drawBuffers[i] = HX.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i;
        }
    }
    else {
        this._drawBuffers = null;
    }

    this._fbo = HX.GL.createFramebuffer();
};

HX.FrameBuffer.prototype = {
    constructor: HX.FrameBuffer,

    width: function() { return this._width; },
    height: function() { return this._height; },

    /**
     *
     * @param width
     * @param height
     * @param formats An Array of formats for each color buffer. If only one provided, it will be used for all. Defaults to [ HX.GL.RGBA ]
     * @param dataTypes An Array of data types for each color buffer. If only one provided, it will be used for all. Defaults to [ HX.GL.UNSIGNED_BYTE ]
     */
    init: function()
    {
        HX.setRenderTarget(this);

        if (this._colorTextures) {
            this._width = this._colorTextures[0]._width;
            this._height = this._colorTextures[0]._height;
        }
        else  {
            this._width = this._depthBuffer._width;
            this._height = this._depthBuffer._height;
        }

        for (var i = 0; i < this._numColorTextures; ++i) {
            var texture = this._colorTextures[i];

            if (HX.EXT_DRAW_BUFFERS)
                HX.GL.framebufferTexture2D(HX.GL.FRAMEBUFFER, HX.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i, HX.GL.TEXTURE_2D, texture._texture, 0);
            else
            // try using default (will only work for 1 color texture tho)
                HX.GL.framebufferTexture2D(HX.GL.FRAMEBUFFER, HX.GL.COLOR_ATTACHMENT0 + i, HX.GL.TEXTURE_2D, texture._texture, 0);
        }


        if (this._depthBuffer) {
            if (this._depthBuffer instanceof HX.Texture2D) {
                HX.GL.framebufferTexture2D(HX.GL.FRAMEBUFFER, HX.GL.DEPTH_STENCIL_ATTACHMENT, HX.GL.TEXTURE_2D, this._depthBuffer._texture, 0);
            }
            else {
                HX.GL.bindRenderbuffer(HX.GL.RENDERBUFFER, this._depthBuffer._renderBuffer);
                HX.GL.framebufferRenderbuffer(HX.GL.FRAMEBUFFER, HX.GL.DEPTH_STENCIL_ATTACHMENT, HX.GL.RENDERBUFFER, this._depthBuffer._renderBuffer);
            }
        }

        var status = HX.GL.checkFramebufferStatus(HX.GL.FRAMEBUFFER);

        switch (status) {
            case HX.GL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                break;
            case HX.GL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                break;
            case HX.GL.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                break;
            case HX.GL.FRAMEBUFFER_UNSUPPORTED:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_UNSUPPORTED");
                break;
        }

        HX.setRenderTarget(null);
    },

    dispose: function()
    {
        HX.GL.deleteFramebuffer(this._fbo);
    }
};
/**
 * @constructor
 */
HX.ReadOnlyDepthBuffer = function()
{
    this._renderBuffer = HX.GL.createRenderbuffer();
};

HX.ReadOnlyDepthBuffer.prototype = {
    constructor: HX.FrameBuffer,

    width: function() { return this._width; },
    height: function() { return this._height; },

    /**
     *
     * @param width
     * @param height
     * @param formats An Array of formats for each color buffer. If only one provided, it will be used for all. Defaults to [ HX.GL.RGBA ]
     * @param dataTypes An Array of data types for each color buffer. If only one provided, it will be used for all. Defaults to [ HX.GL.UNSIGNED_BYTE ]
     */
    init: function(width, height)
    {
        this._width = width;
        this._height = height;

        HX.GL.bindRenderbuffer(HX.GL.RENDERBUFFER, this._renderBuffer);
        HX.GL.renderbufferStorage(HX.GL.RENDERBUFFER, HX.GL.DEPTH_STENCIL, width, height);
    },

    dispose: function()
    {
        HX.GL.deleteRenderBuffer(this._fbo);
    }
};
/**
 *
 * @constructor
 */
HX.Texture2D = function()
{
    this._default = HX.DEFAULT_TEXTURE_2D;
    this._texture = HX.GL.createTexture();
    this._width = 0;
    this._height = 0;

    this.bind();
    // set defaults
    HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MIN_FILTER, HX.TextureFilter.DEFAULT.min);
    HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MAG_FILTER, HX.TextureFilter.DEFAULT.mag);
    HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_S, HX.TextureWrapMode.DEFAULT.s);
    HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_T, HX.TextureWrapMode.DEFAULT.t);

    if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC && HX.DEFAULT_TEXTURE_MAX_ANISOTROPY > 0) {
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, HX.DEFAULT_TEXTURE_MAX_ANISOTROPY);
    }

    this._isReady = false;
};

HX.Texture2D.prototype =
{
    constructor: HX.Texture2D,

    dispose: function()
    {
        HX.GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX.GL.generateMipmap(HX.GL.TEXTURE_2D);
    },

    setFilter: function(filter)
    {
        this.bind();
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MIN_FILTER, filter.min);
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_MAG_FILTER, filter.mag);
    },

    setWrapMode: function(mode)
    {
        this.bind();
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_S, mode.s);
        HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.GL.TEXTURE_WRAP_T, mode.t);
    },

    setMaxAnisotropy: function(value)
    {
        if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC)
            HX.GL.texParameteri(HX.GL.TEXTURE_2D, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
    },

    width: function() { return this._width; },
    height: function() { return this._height; },

    initEmpty: function(width, height, format, dataType)
    {
        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;

        this.bind();
        this._width = width;
        this._height = height;

        HX.GL.texImage2D(HX.GL.TEXTURE_2D, 0, format, width, height, 0, format, dataType, null);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    uploadData: function(data, width, height, generateMips, format, dataType)
    {
        this._width = width;
        this._height = height;

        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? false: generateMips;

        this.bind();

        HX.GL.texImage2D(HX.GL.TEXTURE_2D, 0, format, width, height, 0, format, dataType, data);

        if (generateMips)
            HX.GL.generateMipmap(HX.GL.TEXTURE_2D);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    uploadImage: function(image, width, height, generateMips, format, dataType)
    {
        this._width = width;
        this._height = height;

        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        if (image)
            HX.GL.pixelStorei(HX.GL.UNPACK_FLIP_Y_WEBGL, 1);

        HX.GL.texImage2D(HX.GL.TEXTURE_2D, 0, format, format, dataType, image);

        if (generateMips)
            HX.GL.generateMipmap(HX.GL.TEXTURE_2D);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    isReady: function() { return this._isReady; },

    // binds a texture to a given texture unit
    bind: function(unitIndex)
    {
        if (unitIndex !== undefined)
            HX.GL.activeTexture(HX.GL.TEXTURE0 + unitIndex);

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, this._texture);

        if (unitIndex > HX._numActiveTextures)
            HX._numActiveTextures = unitIndex;
    }
};

HX.FileTexture2D = function(url, generateMipmaps, onComplete, onError)
{
    HX.Texture2D.call(this);

    generateMipmaps = generateMipmaps === undefined? true : generateMipmaps;
    var image = new Image();
    var texture = this;

    image.onload = function() {
        texture.uploadImage(image, image.naturalWidth, image.naturalHeight, generateMipmaps);
        if (onComplete) onComplete();
    };

    image.onError = function() {
        console.warn("Failed loading texture '" + url + "'");
        if (onError) onError();
    };

    image.src = url;
};

HX.FileTexture2D.prototype = Object.create(HX.Texture2D.prototype);


/**
 *
 * @constructor
 */
HX.TextureCube = function()
{
    this._default = HX.DEFAULT_TEXTURE_CUBE;
    this._texture = HX.GL.createTexture();
    this._size = 0;

    this.bind();
    // set defaults
    HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MIN_FILTER, HX.TextureFilter.DEFAULT.min);
    HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MAG_FILTER, HX.TextureFilter.DEFAULT.mag);

    if (HX.EXT_TEXTURE_FILTER_ANISOTROPIC && HX.DEFAULT_TEXTURE_MAX_ANISOTROPY > 0) {
        HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, HX.DEFAULT_TEXTURE_MAX_ANISOTROPY);
    }

    this._isReady = false;
};

HX.TextureCube.prototype =
{
    constructor: HX.TextureCube,

    dispose: function()
    {
        HX.GL.deleteTexture(this._texture);
        this._isReady = false;
    },

    generateMipmap: function()
    {
        this.bind();
        HX.GL.generateMipmap(HX.GL.TEXTURE_CUBE_MAP);
    },

    setFilter: function(filter)
    {
        this.bind();
        HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MIN_FILTER, filter.min);
        HX.GL.texParameteri(HX.GL.TEXTURE_CUBE_MAP, HX.GL.TEXTURE_MAG_FILTER, filter.mag);
    },

    size: function() { return this._size; },

    initEmpty: function(size, format, dataType)
    {
        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;

        this._size = size;

        this.bind();

        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, null);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, null);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    },

    uploadData: function(data, size, generateMips, format, dataType)
    {
        this._size = size;

        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        HX.GL.pixelStorei(HX.GL.UNPACK_FLIP_Y_WEBGL, 0);

        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, data[0]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, data[1]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, data[2]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, data[3]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, data[4]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, data[5]);

        if (generateMips)
            HX.GL.generateMipmap(HX.GL.TEXTURE_CUBE_MAP);

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
    },

    uploadImages: function(images, generateMips, format, dataType)
    {
        generateMips = generateMips === undefined? true: generateMips;

        this.uploadImagesToMipLevel(images, 0, format, dataType);

        if (generateMips) {
            this.bind();
            HX.GL.generateMipmap(HX.GL.TEXTURE_CUBE_MAP);
        }

        this._isReady = true;

        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
    },

    uploadImagesToMipLevel: function(images, mipLevel, format, dataType)
    {
        format = format || HX.GL.RGBA;
        dataType = dataType || HX.GL.UNSIGNED_BYTE;

        if (mipLevel == 0)
            this._size = images[0].naturalWidth;

        this.bind();

        HX.GL.pixelStorei(HX.GL.UNPACK_FLIP_Y_WEBGL, 0);

        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_X, mipLevel, format, format, dataType, images[0]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_X, mipLevel, format, format, dataType, images[1]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Y, mipLevel, format, format, dataType, images[2]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, mipLevel, format, format, dataType, images[3]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_POSITIVE_Z, mipLevel, format, format, dataType, images[4]);
        HX.GL.texImage2D(HX.GL.TEXTURE_CUBE_MAP_NEGATIVE_Z, mipLevel, format, format, dataType, images[5]);

        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, null);
    },

    isReady: function() { return this._isReady; },

    // binds a texture to a given texture unit
    bind: function(unitIndex)
    {
        if (unitIndex !== undefined)
            HX.GL.activeTexture(HX.GL.TEXTURE0 + unitIndex);

        HX.GL.bindTexture(HX.GL.TEXTURE_CUBE_MAP, this._texture);

        if (unitIndex > HX._numActiveTextures)
            HX._numActiveTextures = unitIndex;
    }
};


/**
 *
 * @param urls
 * @param generateMipmaps
 * @param onComplete
 * @param onError
 * @constructor
 */
HX.FileTextureCube = function(urls, generateMipmaps, onComplete, onError)
{
    HX.TextureCube.call(this);

    generateMipmaps = generateMipmaps === undefined? true : generateMipmaps;
    var images = [];
    var texture = this;

    for (var i = 0; i < 6; ++i) {
        var image = new Image();
        image.nextID = i + 1;
        if (i < 5) {
            image.onload = function()
            {
                images[this.nextID].src = urls[this.nextID];
            }
        }
        // last image to load
        else {
            image.onload = function() {
                texture.uploadImages(images, this.naturalWidth, generateMipmaps);
                if (onComplete) onComplete();
            };
        }

        image.onError = function() {
            console.warn("Failed loading texture '" + url + "'");
            if (onError) onError();
        };

        images[i] = image;
    }

    images[0].src = urls[0];
};

HX.FileTextureCube.prototype = Object.create(HX.TextureCube.prototype);


/**
 * A MippedTextureCube that loads an entire mip-chain from files rather than generating it using generateMipmap. This is
 * useful for precomputed specular mip levels. The files are expected to be in a folder structure and with filenames as
 * such:
 * <path>/<mip-level>/posX.<extension>
 * <path>/<mip-level>/negX.<extension>
 * <path>/<mip-level>/posY.<extension>
 * <path>/<mip-level>/negY.<extension>
 * <path>/<mip-level>/posZ.<extension>
 * <path>/<mip-level>/negZ.<extension>
 * @param path The path to the mip-level subdirectories
 * @param extension The extension of the filenames
 * @param numMips The number of mips to be loaded
 * @param onComplete
 * @param onError
 * @constructor
 */
HX.MippedTextureCube = function(path, extension, numMips, onComplete, onError)
{
    HX.TextureCube.call(this);

    var images = [];
    var texture = this;
    var len = numMips * 6;
    var urls = [];
    var dirToken = path.charAt(-1) === "/"? "" : "/";
    path = path + dirToken;
    for (var i = 0; i < numMips; ++i) {
        var dir = path + i + "/";
        urls.push(dir + "posX." + extension);
        urls.push(dir + "negX." + extension);
        urls.push(dir + "posY." + extension);
        urls.push(dir + "negY." + extension);
        urls.push(dir + "posZ." + extension);
        urls.push(dir + "negZ." + extension);
    }

    for (var i = 0; i < len; ++i) {
        var image = new Image();
        image.nextID = i + 1;
        if (i < len - 1) {
            image.onload = function()
            {
                images[this.nextID].src = urls[this.nextID];
            }
        }
        // last image to load
        else {
            image.onload = function() {
                for (var m = 0; m < numMips; ++m)
                    texture.uploadImagesToMipLevel(images.slice(m*6, m*6 + 6), m);

                texture._isReady = true;
                if (onComplete) onComplete();
            };
        }

        image.onError = function() {
            console.warn("Failed loading texture '" + url + "'");
            if (onError) onError();
        };

        images[i] = image;
    }

    images[0].src = urls[0];
};

HX.MippedTextureCube.prototype = Object.create(HX.TextureCube.prototype);
/**
 *
 * @constructor
 */
HX.CascadeShadowCasterCollector = function(numCascades)
{
    HX.SceneVisitor.call(this);
    this._renderCameras = null;
    this._bounds = new HX.BoundingAABB();
    this._numCascades = numCascades;
    this._cullPlanes = null;
    this._numCullPlanes = 0;
    this._renderLists = [];
};

HX.CascadeShadowCasterCollector.prototype = Object.create(HX.SceneVisitor.prototype);

HX.CascadeShadowCasterCollector.prototype.getRenderList = function(index) { return this._renderLists[index]; };

HX.CascadeShadowCasterCollector.prototype.collect = function(camera, scene)
{
    this._collectorCamera = camera;
    this._bounds.clear();

    for (var i = 0; i < this._numCascades; ++i) {
        this._renderLists[i] = [];
    }

    scene.acceptVisitor(this);
};

HX.CascadeShadowCasterCollector.prototype.getBounds = function()
{
    return this._bounds;
};

HX.CascadeShadowCasterCollector.prototype.setRenderCameras = function(cameras)
{
    this._renderCameras = cameras;
};

HX.CascadeShadowCasterCollector.prototype.setCullPlanes = function(cullPlanes, numPlanes)
{
    this._cullPlanes = cullPlanes;
    this._numCullPlanes = numPlanes;
};

HX.CascadeShadowCasterCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    if (modelInstance._castsShadows == false) return;

    this._bounds.growToIncludeBound(worldBounds);

    var passIndex = HX.MaterialPass.GEOMETRY_PASS;

    var numCascades = this._numCascades;
    var numMeshes = modelInstance.numMeshInstances();

    var lastCascade = numCascades - 1;
    for (var cascade = lastCascade; cascade >= 0; --cascade) {
        // no need to test the last split plane, always assume in if it's not entirely inside the previous (since it passed the frustum test)
        var renderList = this._renderLists[cascade];
        var renderCamera = this._renderCameras[cascade];

        if (cascade == lastCascade || worldBounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes)) {

            for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
                var meshInstance = modelInstance.getMeshInstance(meshIndex);
                var material = meshInstance.getMaterial();

                // TODO: ignore individual geometry passes if MRT is supported
                if (material.hasPass(passIndex)) {
                    var renderItem = new HX.RenderItem();
                    renderItem.pass = material.getPass(passIndex);
                    renderItem.meshInstance = meshInstance;
                    renderItem.worldMatrix = worldMatrix;
                    renderItem.camera = renderCamera;
                    renderItem.uniformSetters = meshInstance._uniformSetters[passIndex];

                    renderList.push(renderItem);
                }
            }

        }
        else
            cascade = 0;
    }
};

HX.CascadeShadowCasterCollector.prototype.qualifies = function(object)
{
    return object.getWorldBounds().intersectsConvexSolid(this._cullPlanes, this._numCullPlanes);
};

/**
 *
 * @constructor
 */
HX.CascadeShadowMapRenderer = function(light, numCascades, shadowMapSize)
{
    HX.Renderer.call(this);
    this._light = light;
    this._numCascades = numCascades || 3;
    if (this._numCascades > 4) this._numCascades = 4;
    this._shadowMapSize = shadowMapSize || 1024;
    this._shadowMapInvalid = true;
    this._shadowMap = new HX.Texture2D();
    this._fbo = new HX.FrameBuffer(null, this._shadowMap);
    this._shadowMap.setFilter(HX.TextureFilter.NEAREST_NOMIP);
    this._shadowMap.setWrapMode(HX.TextureWrapMode.CLAMP);
    this._shadowMatrices = [ new HX.Matrix4x4(), new HX.Matrix4x4(), new HX.Matrix4x4(), new HX.Matrix4x4() ];
    this._transformToUV = [ new HX.Matrix4x4(), new HX.Matrix4x4(), new HX.Matrix4x4(), new HX.Matrix4x4() ];
    this._inverseLightMatrix = new HX.Matrix4x4();
    this._splitRatios = null;
    this._splitDistances = null;
    this._shadowMapCameras = null;
    this._collectorCamera = new HX.OrthographicOffCenterCamera();
    this._minZ = 0;
    this._numCullPlanes = 0;
    this._cullPlanes = [];
    this._localBounds = new HX.BoundingAABB();
    this._casterCollector = new HX.CascadeShadowCasterCollector(this._numCascades);

    this._initSplitRatios();
    this._initCameras();

    this._viewports = [];
};

HX.CascadeShadowMapRenderer.prototype = Object.create(HX.Renderer.prototype);

HX.CascadeShadowMapRenderer.prototype.setNumCascades = function(value)
{
    if (this._numCascades == value) return;
    this._numCascades = value;
    this._invalidateShadowMap();
    this._initSplitRatios();
    this._initCameras();
    this._casterCollector = new HX.CascadeShadowCasterCollector(value);
};

HX.CascadeShadowMapRenderer.prototype.setShadowMapSize = function(value)
{
    if (this._setShadowMapSize == value) return;
    this._setShadowMapSize = value;
    this._invalidateShadowMap();
};

HX.CascadeShadowMapRenderer.prototype.render = function(viewCamera, scene)
{
    if (this._shadowMapInvalid)
        this._initShadowMap();

    this._inverseLightMatrix.inverseAffineOf(this._light.getWorldMatrix());
    this._updateCollectorCamera(viewCamera);
    this._updateSplitDistances(viewCamera);
    this._updateCullPlanes(viewCamera);
    this._collectShadowCasters(scene);
    this._updateCascadeCameras(viewCamera, this._casterCollector.getBounds());

    HX.setRenderTarget(this._fbo);
    HX.GL.clear(HX.GL.DEPTH_BUFFER_BIT);

    for (var pass = 0; pass < this._numCascades; ++pass)
    {
        var viewport = this._viewports[pass];
        HX.GL.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

        this._renderPass(HX.MaterialPass.GEOMETRY_PASS, this._casterCollector.getRenderList(pass));
    }
};

HX.CascadeShadowMapRenderer.prototype._updateCollectorCamera = function(viewCamera)
{
    var corners = viewCamera.getFrustum()._corners;
    var min = new HX.Float4();
    var max = new HX.Float4();
    var tmp = new HX.Float4();

    this._inverseLightMatrix.transformPointTo(corners[0], min);
    max.copyFrom(min);

    for (var i = 1; i < 8; ++i) {
        this._inverseLightMatrix.transformPointTo(corners[i], tmp);
        min.minimize(tmp);
        max.maximize(tmp);
    }

    this._minZ = min.z;

    this._collectorCamera.getTransformationMatrix().copyFrom(this._light.getWorldMatrix());
    this._collectorCamera._invalidateWorldTransformation();
    this._collectorCamera.setBounds(min.x, max.x + 1, max.y + 1, min.y);
    this._collectorCamera._setRenderTargetResolution(this._shadowMap._width, this._shadowMap._height);
};

HX.CascadeShadowMapRenderer.prototype._updateSplitDistances = function(viewCamera)
{
    var nearDist = viewCamera.getNearDistance();
    var frustumRange = viewCamera.getFarDistance() - nearDist;

    for (var i = 0; i < this._numCascades; ++i)
        this._splitDistances[i] = nearDist + this._splitRatios[i]*frustumRange;
};

HX.CascadeShadowMapRenderer.prototype._updateCascadeCameras = function(viewCamera, bounds)
{
    this._localBounds.transformFrom(bounds, this._inverseLightMatrix);
    var minBound = this._localBounds.getMinimum();
    var maxBound = this._localBounds.getMaximum();

    var scaleSnap = 1.0;	// always scale snap to a meter

    var localNear = new HX.Float4();
    var localFar = new HX.Float4();
    var min = new HX.Float4();
    var max = new HX.Float4();

    var corners = viewCamera.getFrustum().getCorners();

    for (var cascade = 0; cascade < this._numCascades; ++cascade) {
        var farRatio = this._splitRatios[cascade];
        var camera = this._shadowMapCameras[cascade];

        camera.setNearDistance(-maxBound.z);

        camera.getTransformationMatrix().copyFrom(this._light.getWorldMatrix());
        camera._invalidateWorldTransformation();

        // figure out frustum bound
        for (var i = 0; i < 4; ++i) {
            var nearCorner = corners[i];
            var farCorner = corners[i + 4];

            localFar.x = nearCorner.x + (farCorner.x - nearCorner.x)*farRatio;
            localFar.y = nearCorner.y + (farCorner.y - nearCorner.y)*farRatio;
            localFar.z = nearCorner.z + (farCorner.z - nearCorner.z)*farRatio;

            this._inverseLightMatrix.transformPointTo(nearCorner, localNear);
            this._inverseLightMatrix.transformPointTo(localFar, localFar);

            if (i == 0) {
                min.copyFrom(localNear);
                max.copyFrom(localNear);
            }
            else {
                min.minimize(localNear);
                max.maximize(localNear);
            }

            min.minimize(localFar);
            max.maximize(localFar);
        }

        // do not render beyond range of view camera or scene depth
        min.z = Math.max(this._minZ, min.z);

        var left = Math.max(min.x, minBound.x);
        var right = Math.min(max.x, maxBound.x);
        var bottom = Math.max(min.y, minBound.y);
        var top = Math.min(max.y, maxBound.y);

        var width = right - left;
        var height = top - bottom;

        width = Math.ceil(width / scaleSnap) * scaleSnap;
        height = Math.ceil(height / scaleSnap) * scaleSnap;
        width = Math.max(width, scaleSnap);
        height = Math.max(height, scaleSnap);

        // snap to pixels
        var offsetSnapX = this._shadowMap._width / width * .5;
        var offsetSnapY = this._shadowMap._height / height * .5;

        left = Math.floor(left * offsetSnapX) / offsetSnapX;
        bottom = Math.floor(bottom * offsetSnapY) / offsetSnapY;
        right = left + width;
        top = bottom + height;

        // TODO: Reenable!
        var softness = 0;
        //var softness = light->GetShadowSoftness();

        camera.setBounds(left - softness, right + softness, top + softness, bottom - softness);

        camera.setFarDistance(-min.z);

        camera._setRenderTargetResolution(this._shadowMap._width, this._shadowMap._height);

        this._shadowMatrices[cascade].product(this._transformToUV[cascade], camera.getViewProjectionMatrix());
    }
};

HX.CascadeShadowMapRenderer.prototype._updateCullPlanes = function(viewCamera)
{
    var frustum = this._collectorCamera.getFrustum();
    var planes = frustum._planes;

    for (var i = 0; i < 4; ++i)
        this._cullPlanes[i] = planes[i];

    this._numCullPlanes = 4;

    frustum = viewCamera.getFrustum();
    planes = frustum._planes;

    var dir = this._light.getDirection();

    for (var j = 0; j < 6; ++j) {
        var plane = planes[j];

        // view frustum planes facing away from the light direction mark a boundary beyond which no shadows need to be known
        if (HX.dot3(plane, dir) < -0.001)
            this._cullPlanes[this._numCullPlanes++] = plane;
    }
};

HX.CascadeShadowMapRenderer.prototype._collectShadowCasters = function(scene)
{
    this._casterCollector.setCullPlanes(this._cullPlanes, this._numCullPlanes);
    this._casterCollector.setRenderCameras(this._shadowMapCameras);
    this._casterCollector.collect(this._collectorCamera, scene);
};

HX.CascadeShadowMapRenderer.prototype.getSplitDistances = function()
{
    return this._splitDistances
};

HX.CascadeShadowMapRenderer.prototype.getShadowMatrix = function(cascade)
{
    return this._shadowMatrices[cascade];
};

HX.CascadeShadowMapRenderer.prototype.dispose = function()
{
    HX.Renderer.call.dispose(this);
    this._shadowMap.dispose();
    this._shadowMap = null;
};

HX.CascadeShadowMapRenderer.prototype._invalidateShadowMap = function()
{
    this._shadowMapInvalid = true;
};

HX.CascadeShadowMapRenderer.prototype._initShadowMap = function()
{
    var numMapsW = this._numCascades > 1? 2 : 1;
    var numMapsH = Math.ceil(this._numCascades / 2);

    // TODO: Check if 16 bits is enough
    this._shadowMap.initEmpty(this._shadowMapSize * numMapsW, this._shadowMapSize * numMapsH, HX.GL.DEPTH_STENCIL, HX.EXT_DEPTH_TEXTURE.UNSIGNED_INT_24_8_WEBGL);
    this._fbo.init();
    this._shadowMapInvalid = false;

    this._viewports = [];
    this._viewports.push({x: 0, y: 0, width: this._shadowMapSize, height: this._shadowMapSize});
    this._viewports.push({x: this._shadowMapSize, y: 0, width: this._shadowMapSize, height: this._shadowMapSize});
    this._viewports.push({x: 0, y: this._shadowMapSize, width: this._shadowMapSize, height: this._shadowMapSize});
    this._viewports.push({x: this._shadowMapSize, y: this._shadowMapSize, width: this._shadowMapSize, height: this._shadowMapSize});

    this._initViewportMatrices(1.0 / numMapsW, 1.0 / numMapsH);
};

HX.CascadeShadowMapRenderer.prototype._initSplitRatios = function()
{
    var ratio = 1.0;
    this._splitRatios = [];
    this._splitDistances = [0, 0, 0, 0];
    for (var i = this._numCascades - 1; i >= 0; --i)
    {
        this._splitRatios[i] = ratio;
        this._splitDistances[i] = 0;
        ratio *= .4;
    }
};

HX.CascadeShadowMapRenderer.prototype._initCameras = function()
{
    this._shadowMapCameras = [];
    for (var i = this._numCascades - 1; i >= 0; --i)
    {
        this._shadowMapCameras[i] = new HX.OrthographicOffCenterCamera();
    }
}

HX.CascadeShadowMapRenderer.prototype._initViewportMatrices = function(scaleW, scaleH)
{
    for (var i = 0; i < 4; ++i) {
        // transform [-1, 1] to [0 - 1] (also for Z)
        this._transformToUV[i].scaleMatrix(.5, .5, .5);
        this._transformToUV[i].appendTranslation(.5, .5, .5);

        // transform to tiled size
        this._transformToUV[i].appendScale(scaleW, scaleH, 1.0);
    }

    this._transformToUV[1].appendTranslation(0.5, 0.0, 0.0);
    this._transformToUV[2].appendTranslation(0.0, 0.5, 0.0);
    this._transformToUV[3].appendTranslation(0.5, 0.5, 0.0);
};
/**
 *
 * @constructor
 */
HX.RenderCollector = function()
{
    HX.SceneVisitor.call(this);

    // linked lists of RenderItem
    this._passes = new Array( HX.MaterialPass.NUM_TOTAL_PASS_TYPES ); // add in individual pass types
    this._camera = null;
    this._frustum = null;
    this._lights = null;
    this._shadowCasters = null;
    this._effects = null;
    this._globalSpecularProbe = null;
    this._globalIrradianceProbe = null;
};

HX.RenderCollector.prototype = Object.create(HX.SceneVisitor.prototype);

HX.RenderCollector.prototype.getRenderList = function(passType) { return this._passes[passType]; };
HX.RenderCollector.prototype.getLights = function() { return this._lights; };
HX.RenderCollector.prototype.getShadowCasters = function() { return this._shadowCasters; };
HX.RenderCollector.prototype.getEffects = function() { return this._effects; };
HX.RenderCollector.prototype.getGlobalSpecularProbe = function() { return this._globalSpecularProbe; };
HX.RenderCollector.prototype.getGlobalIrradianceProbe = function() { return this._globalIrradianceProbe; };

HX.RenderCollector.prototype.collect = function(camera, scene)
{
    this._camera = camera;
    this._frustum = camera.getFrustum();
    this._nearPlane = this._frustum._planes[HX.Frustum.PLANE_NEAR];
    this._reset();

    scene.acceptVisitor(this);

    this._passes[HX.MaterialPass.GEOMETRY_PASS].sort(this._sortOpaques);
    this._passes[HX.MaterialPass.TRANSPARENT_DIFFUSE_PASS].sort(this._sortBlended);
    this._passes[HX.MaterialPass.TRANSPARENT_SPECULAR_PASS].sort(this._sortBlended);
    this._passes[HX.MaterialPass.POST_PASS].sort(this._sortOpaques);

    if (!HX.EXT_DRAW_BUFFERS)
        this._copyLegacyPasses();

    this._lights.sort(this._sortLights);
};

HX.RenderCollector.prototype.qualifies = function(object)
{
    return object.getWorldBounds().intersectsConvexSolid(this._frustum._planes, 6);
};

HX.RenderCollector.prototype.visitScene = function (scene)
{
    var skybox = scene._skybox;
    if (skybox) {
        this.visitModelInstance(skybox._modelInstance, null);
        this._globalSpecularProbe = skybox.getGlobalSpecularProbe();
        this._globalIrradianceProbe = skybox.getGlobalIrradianceProbe();
    }
};

HX.RenderCollector.prototype.visitEffects = function(effects, ownerNode)
{
    if (ownerNode == this._camera) return;
    var len = effects.length;

    for (var i = 0; i < len; ++i) {
        this._effects.push(effects[i]);
    }
};

HX.RenderCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    var numMeshes = modelInstance.numMeshInstances();

    for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
        var meshInstance = modelInstance.getMeshInstance(meshIndex);
        var material = meshInstance.getMaterial();

        for (var passIndex = 0; passIndex < HX.MaterialPass.NUM_PASS_TYPES; ++passIndex) {
            var pass = material.getPass(passIndex);
            if (pass && pass._enabled) {
                var renderItem = new HX.RenderItem();
                renderItem.pass = pass;
                renderItem.meshInstance = meshInstance;
                renderItem.worldMatrix = worldMatrix;
                renderItem.camera = this._camera;
                renderItem.uniformSetters = meshInstance._uniformSetters[passIndex];

                this._passes[passIndex].push(renderItem);
            }
        }
    }
};

HX.RenderCollector.prototype.visitLight = function(light)
{
    this._lights.push(light);
    if (light._castsShadows) this._shadowCasters.push(light._shadowMapRenderer);

    var bounds = light.getWorldBounds();
    var near = this._nearPlane;

    light._renderOrderHint = bounds._centerX * near.x + bounds._centerY * near.y + bounds._centerZ * near.z + near.w - bounds.getRadius();
};

HX.RenderCollector.prototype._reset = function()
{
    for (var i = 0; i < HX.MaterialPass.NUM_TOTAL_PASS_TYPES; ++i)
        this._passes[i] = [];

    this._lights = [];
    this._shadowCasters = [];
    this._effects = [];
    this._globalIrradianceProbe = null;
    this._globalSpecularProbe = null;
};

HX.RenderCollector.prototype._sortOpaques = function(a, b)
{
    var diff = a.pass._shader._renderOrderHint - b.pass._shader._renderOrderHint;
    if (diff !== 0) return diff;

    var diff = a.pass._renderOrderHint - b.pass._renderOrderHint;
    if (diff !== 0) return diff;

    return a.meshInstance._renderOrderHint - b.meshInstance._renderOrderHint;
};

HX.RenderCollector.prototype._sortBlended = function(a, b)
{
    return b.meshInstance._renderOrderHint - a.meshInstance._renderOrderHint;
};

HX.RenderCollector.prototype._sortLights = function(a, b)
{
    return  a._type == b._type?
                a._castsShadows == b._castsShadows ?
                    a._renderOrderHint - b._renderOrderHint :
                    a._castsShadows? 1 : -1 :
            a._type < b._type? -1 : 1;
};

HX.RenderCollector.prototype._copyLegacyPasses = function(a, b)
{
    var colorPasses = this._passes[HX.MaterialPass.GEOMETRY_COLOR_PASS];
    var normalPasses = this._passes[HX.MaterialPass.GEOMETRY_NORMAL_PASS];
    var specularPasses = this._passes[HX.MaterialPass.GEOMETRY_SPECULAR_PASS];
    var len = colorPasses.length;

    for (var i = 0; i < len; ++i) {
        var renderItem = colorPasses[i];
        var normalItem = new HX.RenderItem();
        var specItem = new HX.RenderItem();
        var meshInstance = renderItem.meshInstance;
        var material = meshInstance.getMaterial();
        normalItem.pass = material.getPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS);
        specItem.pass = material.getPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS);
        normalItem.uniformSetters = meshInstance._uniformSetters[HX.MaterialPass.GEOMETRY_NORMAL_PASS];
        specItem.uniformSetters = meshInstance._uniformSetters[HX.MaterialPass.GEOMETRY_SPECULAR_PASS];

        normalItem.meshInstance = specItem.meshInstance = renderItem.meshInstance;
        normalItem.worldMatrix = specItem.worldMatrix = renderItem.worldMatrix;
        normalItem.camera = specItem.camera = this._camera;

        normalPasses.push(normalItem);
        specularPasses.push(specItem);
    }

};
/**
 * Base function for basic copies
 * @param fragmentShader The fragment shader to use while copying.
 * @constructor
 */
HX.CustomCopyShader = function(fragmentShader)
{
    HX.Shader.call(this);
    this.init(HX.ShaderLibrary.get("copy_vertex.glsl"), fragmentShader);

    this._textureLocation = HX.GL.getUniformLocation(this._program, "sampler");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.CustomCopyShader.prototype = Object.create(HX.Shader.prototype);

HX.CustomCopyShader.prototype.execute = function(rect, texture)
{
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    rect._vertexBuffer.bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
};


/**
 * Copies one texture's channels (in configurable ways) to another's.
 * @param channel Can be either x, y, z, w or any 4-component swizzle. default is xyzw, meaning a simple copy
 * @constructor
 */
HX.CopyChannelsShader = function(channel)
{
    channel = channel || "xyzw";

    var define = "#define extractChannels(src) ((src)." + channel + ")\n";

    HX.CustomCopyShader.call(this, define + HX.ShaderLibrary.get("copy_fragment.glsl"));
};

HX.CopyChannelsShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Unpack and draw depth values to screen
 */
HX.DebugDepthShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("debug_depth_fragment.glsl"));
};

HX.DebugDepthShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Copies the texture from linear space to gamma space.
 */
HX.ApplyGammaShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("copy_to_gamma_fragment.glsl"));
};

HX.ApplyGammaShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Draw the normals to screen.
 * @constructor
 */
HX.DebugNormalsShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("debug_normals_fragment.glsl"));
};

HX.DebugNormalsShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Converts depth buffer values to linear depth values
 */
HX.LinearizeDepthShader = function()
{
    HX.Shader.call(this);

    this.init(HX.ShaderLibrary.get("linearize_depth_vertex.glsl"), HX.ShaderLibrary.get("linearize_depth_fragment.glsl"));

    this._textureLocation = HX.GL.getUniformLocation(this._program, "sampler");
    this._rcpFrustumRangeLocation = HX.GL.getUniformLocation(this._program, "hx_rcpCameraFrustumRange");
    this._projectionLocation = HX.GL.getUniformLocation(this._program, "hx_projectionMatrix");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.LinearizeDepthShader.prototype = Object.create(HX.Shader.prototype);

HX.LinearizeDepthShader.prototype.execute = function(rect, texture, camera)
{
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    rect._vertexBuffer.bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);
    HX.GL.uniform1f(this._rcpFrustumRangeLocation, 1.0/(camera.getNearDistance() - camera.getFarDistance()));
    HX.GL.uniformMatrix4fv(this._projectionLocation, false, camera.getProjectionMatrix()._m);

    HX.enableAttributes(2);

    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
};
/**
 *
 * @constructor
 */
HX.BloomThresholdPass = function()
{
    HX.EffectPass.call(this, null, HX.ShaderLibrary.get("bloom_threshold_fragment.glsl"));
    this.setThresholdLuminance(1.0);
};

HX.BloomThresholdPass.prototype = Object.create(HX.EffectPass.prototype);

HX.BloomThresholdPass.prototype.setThresholdLuminance = function(value)
{
    this._thresholdLuminance = value;
    this.setUniform("threshold", value);
};

HX.BloomThresholdPass.prototype.getThresholdLuminance = function()
{
    return this._thresholdLuminance;
};

/**
 * @constructor
 */
HX.BloomBlurPass = function(kernelSizes, weights, directionX, directionY, resolutionX, resolutionY)
{
    this._initWeights(kernelSizes, weights);

    var defines = {
        SOURCE_RES: "vec2(float(" + resolutionX + "), float(" + resolutionY + "))",
        RADIUS: "float(" + Math.ceil(this._kernelSize * .5) + ")",
        DIRECTION: "vec2(" + directionX + ", " + directionY + ")",
        NUM_SAMPLES: this._kernelSize
    };

    var vertex = HX.ShaderLibrary.get("bloom_blur_vertex.glsl", defines);
    var fragment = HX.ShaderLibrary.get("bloom_blur_fragment.glsl", defines);

    HX.EffectPass.call(this, vertex, fragment);

    this.setUniformArray("gaussianWeights", new Float32Array(this._weights));
};

HX.BloomBlurPass.prototype = Object.create(HX.EffectPass.prototype);

HX.BloomBlurPass.prototype._initWeights = function(kernelSizes, weights)
{
    this._kernelSize = 0;
    this._weights = [];

    var gaussians = [];

    for (var i = 0; i < kernelSizes.length; ++i) {
        var radius = Math.ceil(kernelSizes[i] * .5);
        var size = Math.ceil(kernelSizes[i]);
        if (size > this._kernelSize)
            this._kernelSize = size;
        gaussians[i] = HX.CenteredGaussianCurve.fromRadius(radius);
    }

    var radius = Math.ceil(this._kernelSize * .5);

    for (var j = 0; j < this._kernelSize; ++j) {
        this._weights[j] = 0;
        for (var i = 0; i < kernelSizes.length; ++i) {
            this._weights[j] += gaussians[i].getValueAt(j - radius) * weights[i];
        }
    }
};

/**
 *
 * @constructor
 */
HX.BloomCompositePass = function()
{
    HX.EffectPass.call(this, HX.ShaderLibrary.get("bloom_composite_vertex.glsl"), HX.ShaderLibrary.get("bloom_composite_fragment.glsl"));
};

HX.BloomCompositePass.prototype = Object.create(HX.EffectPass.prototype);


/**
 *
 * @constructor
 */
HX.BloomEffect = function(blurSizes, weights)
{
    HX.Effect.call(this);

    this._downScale = 4;

    this._targetWidth = -1;
    this._targetHeight = -1;

    this._thresholdPass = new HX.BloomThresholdPass();
    this._compositePass = new HX.BloomCompositePass();

    this.addPass(this._thresholdPass);
    this.addPass(null);
    this.addPass(null);
    this.addPass(this._compositePass);

    this._thresholdMaps = [];
    this._thresholdFBOs = [];

    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i] = new HX.Texture2D();
        this._thresholdMaps[i].setFilter(HX.TextureFilter.BILINEAR_NOMIP);
        this._thresholdMaps[i].setWrapMode(HX.TextureWrapMode.CLAMP);
        this._thresholdFBOs[i] = new HX.FrameBuffer([this._thresholdMaps[i]]);
    }

    this._blurSizes = blurSizes || [ 512, 256 ];

    if (HX.EXT_HALF_FLOAT_TEXTURES_LINEAR && HX.EXT_HALF_FLOAT_TEXTURES)
        this._weights = weights || [.05,.05 ];
    else {
        this._weights = weights || [1.5, 5.0 ];
        this.setThresholdLuminance(.9);
    }

    this._compositePass.setTexture("bloomTexture", this._thresholdMaps[0]);
};

HX.BloomEffect.prototype = Object.create(HX.Effect.prototype);

HX.BloomEffect.prototype.setThresholdLuminance = function(value)
{
    this._thresholdLuminance = value;
    this.setUniform("threshold", value);
};

HX.BloomEffect.prototype._initTextures = function()
{
    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i].initEmpty(Math.ceil(this._targetWidth / this._downScale), Math.ceil(this._targetHeight / this._downScale), HX.GL.RGB, HX.HDR_FORMAT);
        this._thresholdFBOs[i].init();
    }
};

HX.BloomEffect.prototype._initBlurPass = function()
{
    var sizesX = [];
    var sizesY = [];
    var len = this._blurSizes.length;
    for (var i = 0; i < len; ++i) {
        sizesX[i] = this._blurSizes[i] / this._downScale;
        sizesY[i] = this._blurSizes[i] / this._downScale;
    }

    var width = this._targetWidth / this._downScale;
    var height = this._targetHeight / this._downScale;
    // direction used to provide step size
    this._passes[1] = new HX.BloomBlurPass(sizesX, this._weights, 1, 0, width, height);
    this._passes[2] = new HX.BloomBlurPass(sizesY, this._weights, 0, 1, width, height);
    this._passes[1].setTexture("sourceTexture", this._thresholdMaps[0]);
    this._passes[2].setTexture("sourceTexture", this._thresholdMaps[1]);

    var mesh = this._mesh;
    if (mesh) {
        this._mesh = null;
        this.setMesh(mesh);
    }
};

HX.BloomEffect.prototype.draw = function(dt)
{
    if (this._hdrTarget._width != this._targetWidth || this._hdrTarget._height != this._targetHeight) {
        this._targetWidth = this._hdrTarget._width;
        this._targetHeight = this._hdrTarget._height;
        this._initTextures();
        this._initBlurPass();
    }

    var targetIndex = 0;
    HX.GL.viewport(0, 0, this._thresholdMaps[0]._width, this._thresholdMaps[0]._height);

    for (var i = 0; i < 3; ++i) {
        HX.setRenderTarget(this._thresholdFBOs[targetIndex]);
        this._drawPass(this._passes[i]);
        targetIndex = 1 - targetIndex;
    }

    HX.setRenderTarget(this._hdrTarget);
    HX.GL.viewport(0, 0, this._targetWidth, this._targetHeight);
    this._drawPass(this._compositePass);
    this._swapHDRBuffers();
};

HX.BloomEffect.prototype.dispose = function()
{
    for (var i = 0; i < 2; ++i) {
        this._thresholdFBOs[i].dispose();
        this._thresholdMaps[i].dispose();
    }

    this._thresholdFBOs = null;
    this._thresholdMaps = null;
};

HX.BloomEffect.prototype.getThresholdLuminance = function()
{
    return this.getPass(0).getThresholdLuminance();
};

HX.BloomEffect.prototype.setThresholdLuminance = function(value)
{
    return this.getPass(0).setThresholdLuminance(value);
};
/**
 *
 * @param blurX
 * @param blurY
 * @constructor
 */
HX.SeparableGaussianBlurPass = function(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)
{
    if (forceSourceResolutionX)
        forceSourceResolutionY = forceSourceResolutionY || forceSourceResolutionX;
    inputTextureName = inputTextureName || "hx_source";

    kernelSize = Math.round(kernelSize);

    var vertex = HX.SeparableGaussianBlurPass.getVertexShader(kernelSize, directionX, directionY, forceSourceResolutionX, forceSourceResolutionY);
    var fragment = HX.SeparableGaussianBlurPass.getFragmentShader(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)

    HX.EffectPass.call(this, vertex, fragment);

    this._initWeights(kernelSize);
};

HX.SeparableGaussianBlurPass.prototype = Object.create(HX.EffectPass.prototype);

HX.SeparableGaussianBlurPass.prototype._initWeights = function(kernelSize)
{
    var radius = Math.floor(kernelSize * .5);
    var weights = [];
    var gauss = HX.CenteredGaussianCurve.fromRadius(radius);
    for (var i = 0; i < kernelSize; ++i) {
        weights[i] = gauss.getValueAt(i - radius);
    }

    this.setUniformArray("gaussianWeights", new Float32Array(weights));
};



HX.GaussianBlurEffect = function(blurX, blurY)
{
    HX.Effect.call(this);
    this.addPass(new HX.SeparableGaussianBlurPass(blurX, 1, 0));
    this.addPass(new HX.SeparableGaussianBlurPass(blurY, 0, 1));
};

HX.GaussianBlurEffect.prototype = Object.create(HX.Effect.prototype);


/**
 *
 * @param blurX
 * @param blurY
 * @constructor
 */
HX.DirectionalBlurPass = function(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)
{
    kernelSize = Math.round(kernelSize);
    if (forceSourceResolutionX)
        forceSourceResolutionY = forceSourceResolutionY || forceSourceResolutionX;
    inputTextureName = inputTextureName || "hx_source";
    HX.EffectPass.call(this, HX.DirectionalBlurPass.getVertexShader(kernelSize, directionX, directionY), HX.DirectionalBlurPass.getFragmentShader(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY));
};

HX.DirectionalBlurPass.prototype = Object.create(HX.EffectPass.prototype);

HX.DirectionalBlurEffect = function(amount, directionX, directionY)
{
    HX.Effect.call(this);
    this.addPass(new HX.DirectionalBlurPass(amount, directionX, directionY));
};

HX.DirectionalBlurEffect.prototype = Object.create(HX.Effect.prototype);

HX.BoxBlurEffect = function(blurX, blurY)
{
    HX.Effect.call(this);
    this.addPass(new HX.DirectionalBlurPass(blurX, 1, 0));
    this.addPass(new HX.DirectionalBlurPass(blurY, 0, 1));
};

HX.BoxBlurEffect.prototype = Object.create(HX.Effect.prototype);

HX.DirectionalBlurPass.getVertexShader = function(kernelSize, directionX, directionY, forceSourceResolutionX, forceSourceResolutionY)
{
    var sourceRes;

    if (forceSourceResolutionX)
        sourceRes = "vec2(float(" + forceSourceResolutionX + "), float(" + forceSourceResolutionY + "))";
    else
        sourceRes = "hx_renderTargetResolution";

    return  "#define SOURCE_RES " + sourceRes + "\n\
            #define NUM_SAMPLES " + Math.ceil(kernelSize/2) + "\n\
            #define DIRECTION vec2(" + directionX + ", " + directionY + ")\n\
    \n\
    attribute vec4 hx_position;\n\
    attribute vec2 hx_texCoord;\n\
    \n\
    uniform vec2 hx_renderTargetResolution;\n\
    \n\
    varying vec2 uv;\n\
    \n\
    void main()\n\
    {\n\
            vec2 firstPixel = floor(hx_texCoord * SOURCE_RES - DIRECTION * float(NUM_SAMPLES));\
            uv = (firstPixel - .5) / SOURCE_RES;\n\
            gl_Position = hx_position;\n\
    }";
};

HX.DirectionalBlurPass.getFragmentShader = function(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)
{
    var sourceRes;

    if (forceSourceResolutionX)
        sourceRes = "vec2(float(" + forceSourceResolutionX + "), float(" + forceSourceResolutionY + "))";
    else
        sourceRes = "hx_renderTargetResolution";

    return  "#define SOURCE_RES " + sourceRes + "\n\
            #define NUM_SAMPLES " + Math.ceil(kernelSize/2) + "\n\
            #define DIRECTION vec2(" + 2.0 * directionX + ", " + 2.0 * directionY + ")\n\
            \n\
            varying vec2 uv;\n\
            \n" +
            (forceSourceResolutionX? "" : "uniform vec2 hx_renderTargetResolution;\n") +
            "\n\
            uniform sampler2D " + inputTextureName + ";\n\
            \n\
            void main()\n\
            {\n\
                vec4 total = vec4(0.0);\n\
                vec2 sampleUV = uv;\n\
                vec2 stepSize = DIRECTION / SOURCE_RES;\n\
                for (int i = 0; i < NUM_SAMPLES; ++i) {\n\
                    total += texture2D(" + inputTextureName + ", sampleUV);\n\
                    sampleUV += stepSize;\n\
                }\n\
                gl_FragColor = total / float(NUM_SAMPLES);\n\
            \n\
            }";
};

HX.SeparableGaussianBlurPass.getVertexShader = function(kernelSize, directionX, directionY, forceSourceResolutionX, forceSourceResolutionY)
{
    var sourceRes;

    if (forceSourceResolutionX)
        sourceRes = "vec2(float(" + forceSourceResolutionX + "), float(" + forceSourceResolutionY + "))";
    else
        sourceRes = "hx_renderTargetResolution";

    return  "#define SOURCE_RES " + sourceRes + "\n\
             #define RADIUS float(" + Math.ceil(kernelSize * .5) + ")\n\
             #define DIRECTION vec2(" + directionX + ", " + directionY + ")\n\
    precision mediump float;\n\
    \n\
    attribute vec4 hx_position;\n\
    attribute vec2 hx_texCoord;\n\
    \n\
    varying vec2 uv;\n\
    \n" + (forceSourceResolutionX? "" : "uniform vec2 hx_renderTargetResolution;\n") + "\n\
    void main()\n\
    {\n\
            uv = hx_texCoord - RADIUS * DIRECTION / SOURCE_RES;\n\
            gl_Position = hx_position;\n\
    }";
};

HX.SeparableGaussianBlurPass.getFragmentShader = function(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)
{
    var sourceRes;

    if (forceSourceResolutionX)
        sourceRes = "vec2(float(" + forceSourceResolutionX + "), float(" + forceSourceResolutionY + "))";
    else
        sourceRes = "hx_renderTargetResolution";

    return  "#define SOURCE_RES " + sourceRes + "\n\
            #define NUM_SAMPLES " + kernelSize + "\n\
            #define DIRECTION vec2(" + directionX + ", " + directionY + ")\n\
            \n\
            varying vec2 uv;\n\
            \n" +
            (forceSourceResolutionX? "" : "uniform vec2 hx_renderTargetResolution;\n") +
            "\n\
            uniform sampler2D " + inputTextureName + ";\n\
            \n\
            uniform float gaussianWeights[NUM_SAMPLES];\n\
            \n\
            void main()\n\
            {\n\
                vec4 total = vec4(0.0);\n\
                vec2 sampleUV = uv;\n\
                vec2 stepSize = DIRECTION / SOURCE_RES;\n\
                float totalWeight = 0.0;\n\
                for (int i = 0; i < NUM_SAMPLES; ++i) {\n\
                    total += texture2D(" + inputTextureName + ", sampleUV) * gaussianWeights[i];\n\
                    sampleUV += stepSize;\n\
                }\n\
                gl_FragColor = total;\n\
            \n\
            }";
};
/**
 *
 * @constructor
 */
HX.CopyTexturePass = function()
{
    HX.EffectPass.call(this, null, HX.ShaderLib.get("copy_fragment.glsl"));
};

HX.CopyTexturePass.prototype = Object.create(HX.EffectPass.prototype);

HX.CopyTexturePass.prototype.setSourceTexture = function(value)
{
    this.setTexture("sampler", value);
};
/**
 *
 * @param density
 * @param tint
 * @param startDistance
 * @param height
 * @constructor
 */
HX.FogEffect = function(density, tint, startDistance, height)
{
    HX.Effect.call(this);

    this.addPass(new HX.EffectPass(HX.ShaderLibrary.get("fog_vertex.glsl"), HX.ShaderLibrary.get("fog_fragment.glsl")));

    this.setDensity(density === undefined? .001 : density);
    this.setTint(tint === undefined? new HX.Color(1, 1, 1, 1) : tint);
    this.setStartDistance(startDistance === undefined? 0 : startDistance);
    this.setHeight(height === undefined? 1000 : height);
};

HX.FogEffect.prototype = Object.create(HX.Effect.prototype);

HX.FogEffect.prototype.getDensity = function()
{
    return this._density;
};

HX.FogEffect.prototype.setDensity = function(value)
{
    this._density = value;
    this.setUniform("density", value);
};


HX.FogEffect.prototype.getTint = function()
{
    return this._tint;
};

HX.FogEffect.prototype.setTint = function(value)
{
    this._tint = value;
    this.setUniform("tint", {x: value.r, y: value.g, z: value.b});
};


HX.FogEffect.prototype.getStartDistance = function()
{
    return this._startDistance;
};

HX.FogEffect.prototype.setStartDistance = function(value)
{
    this._startDistance = value;
    this.setUniform("startDistance", value);
};


HX.FogEffect.prototype.getHeight = function()
{
    return this._height;
};

HX.FogEffect.prototype.setHeight = function(value)
{
    this._height = value;
    this.setUniform("height", value);
};
HX.FXAA = function()
{
    HX.Effect.call(this);

    this.addPass(new HX.EffectPass(null, HX.ShaderLibrary.get("fxaa_fragment.glsl")));
    this.setUniform("edgeThreshold", 1/8);
    this.setUniform("edgeThresholdMin", 1/16);
    this.setUniform("edgeSharpness", 4.0);
};

HX.FXAA.prototype = Object.create(HX.Effect.prototype);
/**
 *
 * @param numSamples
 * @constructor
 */
HX.HBAO = function(numRays, numSamplesPerRay)
{
    numRays = numRays || 4;
    numSamplesPerRay = numSamplesPerRay || 4;
    if (numRays > 32) numRays = 32;
    if (numSamplesPerRay > 32) numSamplesPerRay = 32;

    this._numRays = numRays;
    this._strength = 1.0;
    this._bias = .01;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._sampleDirTexture = null;
    this._ditherTexture = null;

    HX.Effect.call(this);
    this.addPass(this._aoPass = new HX.EffectPass(
        HX.ShaderLibrary.get("hbao_vertex.glsl"),
        HX.ShaderLibrary.get("hbao_fragment.glsl", {
            NUM_RAYS: numRays,
            NUM_SAMPLES_PER_RAY: numSamplesPerRay
        })
    ));
    this.addPass(this._blurPassX = new HX.DirectionalBlurPass(4, 1, 0));
    this.addPass(this._blurPassY = new HX.DirectionalBlurPass(4, 0, 1));

    this._initSampleDirTexture();
    this._initDitherTexture();
    this._aoPass.setUniform("strengthPerRay", 3.1415 * this._strength / this._numRays);
    this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._aoPass.setUniform("halfSampleRadius", this._radius *.5);
    this._aoPass.setUniform("bias", this._bias);
    this._aoPass.setTexture("ditherTexture", this._ditherTexture);
    this._aoPass.setTexture("sampleDirTexture", this._sampleDirTexture);

    this._aoTexture = new HX.Texture2D();
    this._aoTexture.setFilter(HX.TextureFilter.BILINEAR_NOMIP);
    this._aoTexture.setWrapMode(HX.TextureWrapMode.CLAMP);
    this._fbo = new HX.FrameBuffer(this._aoTexture);
};

HX.HBAO.prototype = Object.create(HX.Effect.prototype);

// every AO type should implement this
HX.HBAO.prototype.getAOTexture = function()
{
    return this._aoTexture;
};

HX.HBAO.prototype.setSampleRadius = function(value)
{
    this._radius = value;
    this._aoPass.setUniform("halfSampleRadius", this._radius *.5);
};

HX.HBAO.prototype.setFallOffDistance = function(value)
{
    this._fallOffDistance = value;
    this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
};

HX.HBAO.prototype.setStrength = function(value)
{
    this._strength = value;
    this._aoPass.setUniform("strengthPerRay", 3.1415 * this._strength / this._numRays);
};

HX.HBAO.prototype.setBias = function(value)
{
    this._bias = value;
    this._aoPass.setUniform("bias", this._bias);
};

HX.HBAO.prototype._initTargetTexture = function(width, height)
{
    this._aoTexture.initEmpty(width, height);
    this._fbo.init();
};

HX.HBAO.prototype.draw = function(dt)
{
    var targetWidth = this._hdrTarget.width();
    var targetHeight = this._hdrTarget.height();

    if (targetWidth != this._aoTexture.width() || targetHeight != this._aoTexture.height())
        this._initTargetTexture(targetWidth, targetHeight);

    HX.setRenderTarget(this._hdrTarget);
    this._drawPass(this._aoPass);
    this._swapHDRBuffers();

    HX.setRenderTarget(this._hdrTarget);
    this._drawPass(this._blurPassX);
    this._swapHDRBuffers();

    HX.setRenderTarget(this._fbo);
    this._drawPass(this._blurPassY);
};

HX.HBAO.prototype._initSampleDirTexture = function()
{
    this._sampleDirTexture = new HX.Texture2D();
    var data = [];
    var j = 0;

    for (var i = 0; i < 256; ++i)
    {
        var angle = i / 256 * 2.0 * Math.PI;
        var r = Math.cos(angle)*.5 + .5;
        var g = Math.sin(angle)*.5 + .5;
        data[j] = Math.round(r * 0xff);
        data[j+1] = Math.round(g * 0xff);
        data[j+2] = 0x00;
        data[j+3] = 0xff;
        j += 4;
    }

    this._sampleDirTexture.uploadData(new Uint8Array(data), 256, 1, false);
    this._sampleDirTexture.setFilter(HX.TextureFilter.NEAREST_NOMIP);
    this._sampleDirTexture.setWrapMode(HX.TextureWrapMode.REPEAT);
};

HX.HBAO.prototype._initDitherTexture = function()
{
    this._ditherTexture = new HX.Texture2D();
    var data = [];

    var i;
    var j = 0;
    var offsets1 = [];
    var offsets2 = [];

    for (i = 0; i < 16; ++i) {
        offsets1.push(i / 16.0);
        offsets2.push(i / 15.0);
    }

    HX.shuffle(offsets1);
    HX.shuffle(offsets2);

    i = 0;

    for (var y = 0; y < 4; ++y) {
        for (var x = 0; x < 4; ++x) {
            var r = offsets1[i];
            var g = offsets2[i];

            ++i;

            data[j] = Math.round(r * 0xff);
            data[j + 1] = Math.round(g * 0xff);
            data[j + 2] = 0x00;
            data[j + 3] = 0xff;

            j += 4;
        }
    }

    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.setFilter(HX.TextureFilter.NEAREST_NOMIP);
    this._ditherTexture.setWrapMode(HX.TextureWrapMode.REPEAT);
};
/**
 *
 * @param numSamples
 * @param range
 * @constructor
 */
HX.ScreenSpaceReflections = function(numSamples, range)
{
    HX.Effect.call(this);
    numSamples = numSamples || 5;
    range = range || 1.0;
    this._numSamples = numSamples;
    var pass = new HX.EffectPass(HX.ScreenSpaceReflections._vertexShader, HX.ScreenSpaceReflections.getFragmentShader(numSamples));
    this.addPass(pass);
    this.setUniform("stepSize", range/numSamples);
    this.setUniform("nearSampleRatio",.1);
};

HX.ScreenSpaceReflections.prototype = Object.create(HX.Effect.prototype);

HX.ScreenSpaceReflections._vertexShader =
    "precision mediump float;\n\
    \n\
    varying vec2 uv;\n\
    varying vec3 viewDir;\n\
    varying vec3 nearViewPos;\n\
    \n\
    void main()\
    {\n\
            uv = hx_texCoord;\n\
            viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n\
            gl_Position = hx_position;\n\
    }";

// TODO: Perform stencil test to rule out based on distance & angle
HX.ScreenSpaceReflections.getFragmentShader = function(numSamples)
{
    return "#define NUM_SAMPLES " + numSamples + "\n\
            \n\
            varying vec2 uv;\n\
            varying vec3 viewDir;\n\
            \n\
            uniform float stepSize;\n\
            uniform float nearSampleRatio;\n\
            \n\
            void main()\n\
            {\n\
                vec4 colorSample = hx_gammaToLinear(texture2D(hx_gbufferColor, uv));\n\
                vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n\
                float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n\
                vec3 normalSpecularReflectance;\n\
                float roughness;\n\
                hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness);\n\
                vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n\
                vec3 normal = hx_decodeNormal(normalSample);\n\
                normal = mat3(hx_viewMatrix) * normal;\n\
                vec3 reflDir = reflect(normalize(viewDir), normal);\n\
                float fadeFactor = clamp(-reflDir.z * 10000.0, 0.0, 1.0); \n\
                vec3 fresnel = hx_fresnel(normalSpecularReflectance, reflDir, normal);\n\
                // not physically correct, but attenuation is required to look good\n\
                fresnel *= (1.0 - roughness);\n\
                bool hitFound = false;\n\
                // TURNS SAMPLE_POS.z > 0\n\
                vec3 projScale = vec3(hx_projectionMatrix[0][0], hx_projectionMatrix[1][1], -1.0);\n\
                float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n\
                vec3 viewPos = absViewZ * viewDir;\n\
                vec3 samplePos = viewPos * projScale;\n\
                float perspStepSize = stepSize * max(1.0, samplePos.z);\n\
                vec3 sampleStep = reflDir * perspStepSize * projScale / length(reflDir.xy);\n\
                float depthStep = sampleStep.z / hx_cameraFrustumRange;\n\
                \n\
                float originalDepth = depth;\n\
                float prevDepth = depth;\n\
                float finalHitDepth;\n\
                float finalPrevHitDepth;\n\
                float finalMarchDepth;\n\
                vec3 finalSamplePos;\n\
                \n\
                samplePos += sampleStep * nearSampleRatio;\n\
                depth += depthStep * nearSampleRatio;\n\
                \n\
                for (int i = 0; i < NUM_SAMPLES; ++i) {\n\
                    \n\
                    vec2 sampleUV = samplePos.xy / samplePos.z * .5 + .5;\n\
                    float hitDepth = hx_sampleLinearDepth(hx_gbufferDepth, sampleUV);\n\
                    \n\
                    if (depth > hitDepth && !hitFound) {\n\
                        finalMarchDepth = depth;\n\
                        finalSamplePos = samplePos;\n\
                        finalHitDepth = hitDepth;\n\
                        finalPrevHitDepth = prevDepth;\n\
                        hitFound = true;\n\
                    }\n\
                    prevDepth = hitDepth;\n\
                    samplePos += sampleStep;\n\
                    depth += depthStep;\n\
                }\n\
                \n\
                // interpolation for first hit breaks for some reason \n\
                if (finalPrevHitDepth != originalDepth) {\n\
                    float deltaDepth = finalHitDepth - finalPrevHitDepth;\n\
                    float d = depthStep - deltaDepth;\n\
                    float t = (finalMarchDepth - finalHitDepth) / d;\n\
                    finalSamplePos -= sampleStep * t;\n\
                }\n\
                vec2 sampleUV = finalSamplePos.xy / finalSamplePos.z;\n\
                vec2 borderFactors = abs(sampleUV);\n\
                borderFactors = (1.0 - borderFactors) * 10.0;\n\
                sampleUV = sampleUV * .5 + .5;\n\
                fadeFactor *= clamp((finalHitDepth - originalDepth)/.0001, 0.1, 1.1) - .1;\n\
                fadeFactor *= clamp(borderFactors.x, 0.0, 1.0) * clamp(borderFactors.y, 0.0, 1.0);\n\
                vec4 reflColor = texture2D(hx_source, sampleUV);\n\
                vec4 srcColor = texture2D(hx_source, uv);\n\
                float amountUsed = hitFound? fadeFactor : 0.0;\n\
                gl_FragColor = vec4(srcColor.xyz + fresnel * reflColor.xyz * amountUsed, 1.0 - amountUsed);\n\
            }";
};
/**
 *
 * @param numSamples
 * @constructor
 */
HX.SSAO = function(numSamples)
{
    numSamples = numSamples || 8;
    if (numSamples > 64) numSamples = 64;

    this._numSamples = numSamples;
    this._strength = 1.0;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._ditherTexture = null;

    HX.Effect.call(this);

    this.addPass(this._ssaoPass = new HX.EffectPass(null,
        HX.ShaderLibrary.get("ssao_fragment.glsl",
            {
                NUM_SAMPLES: numSamples
            }
        )));
    this.addPass(this._blurPassX = new HX.DirectionalBlurPass(4, 1, 0));
    this.addPass(this._blurPassY = new HX.DirectionalBlurPass(4, 0, 1));

    this._initSamples();
    this._initDitherTexture();
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * 3.1415 * this._strength / this._numSamples);
    this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._ssaoPass.setUniform("sampleRadius", this._radius);
    this._ssaoPass.setTexture("ditherTexture", this._ditherTexture);

    this._ssaoTexture = new HX.Texture2D();
    this._ssaoTexture.setFilter(HX.TextureFilter.BILINEAR_NOMIP);
    this._ssaoTexture.setWrapMode(HX.TextureWrapMode.CLAMP);
    this._fbo = new HX.FrameBuffer(this._ssaoTexture);
};

HX.SSAO.prototype = Object.create(HX.Effect.prototype);

// every SSAO type should implement this
HX.SSAO.prototype.getAOTexture = function()
{
    return this._ssaoTexture;
};

HX.SSAO.prototype.setSampleRadius = function(value)
{
    this._radius = value;
    this._ssaoPass.setUniform("sampleRadius", this._radius);
};

HX.SSAO.prototype.setFallOffDistance = function(value)
{
    this._fallOffDistance = value;
    this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
};

HX.SSAO.prototype.setStrength = function(value)
{
    this._strength = value;
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * 3.1415 * this._strength / this._numSamples);
};

HX.SSAO.prototype._initSamples = function()
{
    var samples = [];
    var j = 0;
    var poisson = HX.DEFAULT_POISSON_SPHERE;

    for (var i = 0; i < this._numSamples; ++i) {
        var x = poisson[i * 3];
        var y = poisson[i * 3 + 1];
        var z = poisson[i * 3 + 2];

        samples[j++] = Math.pow(x, 6);
        samples[j++] = Math.pow(y, 6);
        samples[j++] = Math.pow(z, 6);
    }

    this._ssaoPass.setUniformArray("samples", new Float32Array(samples));
};

HX.SSAO.prototype._initTargetTexture = function(width, height)
{
    this._ssaoTexture.initEmpty(width, height);
    this._fbo.init();
};

HX.SSAO.prototype.draw = function(dt)
{
    var targetWidth = this._hdrTarget.width();
    var targetHeight = this._hdrTarget.height();

    if (targetWidth != this._ssaoTexture.width() || targetHeight != this._ssaoTexture.height())
        this._initTargetTexture(targetWidth, targetHeight);

    HX.setRenderTarget(this._hdrTarget);
    this._drawPass(this._ssaoPass);
    this._swapHDRBuffers();

    HX.setRenderTarget(this._hdrTarget);
    this._drawPass(this._blurPassX);
    this._swapHDRBuffers();

    HX.setRenderTarget(this._fbo);
    this._drawPass(this._blurPassY);
};

HX.SSAO.prototype._initDitherTexture = function()
{
    this._ditherTexture = new HX.Texture2D();
    var data = [
        0x40, 0x1d, 0x4b, 0xff,
        0xca, 0x44, 0x2b, 0xff,
        0x17, 0xaa, 0x44, 0xff,
        0xa1, 0xd1, 0x24, 0xff,
        0x5d, 0x2d, 0xda, 0xff,
        0xe7, 0x54, 0xba, 0xff,
        0x34, 0xba, 0xd3, 0xff,
        0xbe, 0xe1, 0xb3, 0xff,
        0x52, 0x6c, 0x09, 0xff,
        0xc3, 0x23, 0x46, 0xff,
        0x88, 0xeb, 0x3c, 0xff,
        0xf9, 0xa2, 0x78, 0xff,
        0x05, 0x5c, 0x86, 0xff,
        0x76, 0x13, 0xc2, 0xff,
        0x3b, 0xdb, 0xb8, 0xff,
        0xac, 0x92, 0xf5, 0xff
    ];
    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.setFilter(HX.TextureFilter.NEAREST_NOMIP);
    this._ditherTexture.setWrapMode(HX.TextureWrapMode.REPEAT);
};
HX.ToneMapEffect = function(adaptive)
{
    this._adaptive = adaptive === undefined? false : adaptive;

    if (this._adaptive && (!HX.EXT_SHADER_TEXTURE_LOD || !HX.EXT_HALF_FLOAT_TEXTURES)) {
        console.log("Warning: adaptive tone mapping not supported, using non-adaptive");
        this._adaptive = false;
        return;
    }

    HX.Effect.call(this);

    this._toneMapPass = this._createToneMapPass();

    if (this._adaptive) {
        this.addPass(new HX.EffectPass(null, HX.ShaderLibrary.get("tonemap_reference_fragment.glsl")));

        this._luminanceMap = new HX.Texture2D();
        this._luminanceMap.initEmpty(256, 256, HX.GL.RGBA, HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES);
        this._luminanceFBO = new HX.FrameBuffer([this._luminanceMap]);
        this._luminanceFBO.init();

        this._adaptationRate = 500.0;

        this._toneMapPass.setTexture("hx_luminanceMap", this._luminanceMap);
        this._toneMapPass.setUniform("hx_luminanceMipLevel", Math.log(this._luminanceMap._width) / Math.log(2));
    }

    this.addPass(this._toneMapPass);

    this.exposure = 0.0;
};

HX.ToneMapEffect.prototype = Object.create(HX.Effect.prototype);

HX.ToneMapEffect.prototype._createToneMapPass = function()
{
    throw new Error("Abstract method called!");
}


HX.ToneMapEffect.prototype.dispose = function()
{
    HX.Effect.prototype.dispose.call(this);
    this._luminanceFBO.dispose();
    this._luminanceMap.dispose();
};

HX.ToneMapEffect.prototype.draw = function(dt)
{
    if (this._adaptive) {
        if (!this._isSupported) return;

        var amount = this._adaptationRate > 0 ? dt / this._adaptationRate : 1.0;
        if (amount > 1) amount = 1;

        HX.GL.enable(HX.GL.BLEND);
        HX.GL.blendFunc(HX.GL.CONSTANT_ALPHA, HX.GL.ONE_MINUS_CONSTANT_ALPHA);
        HX.GL.blendColor(1.0, 1.0, 1.0, amount);

        HX.setRenderTarget(this._luminanceFBO);
        HX.GL.viewport(0, 0, this._luminanceFBO._width, this._luminanceFBO._height);
        this._drawPass(this._passes[0]);
        this._luminanceMap.generateMipmap();
        HX.GL.disable(HX.GL.BLEND);
    }

    HX.setRenderTarget(this._hdrTarget);
    HX.GL.viewport(0, 0, this._hdrTarget._width, this._hdrTarget._height);
    this._drawPass(this._toneMapPass);
    this._swapHDRBuffers();
};


Object.defineProperty(HX.ToneMapEffect.prototype, "exposure", {
    get: function()
    {
        return this._exposure;
    },

    set: function(value)
    {
        this._exposure = value;
        if (this._isSupported)
            this._toneMapPass.setUniform("hx_exposure", Math.pow(2.0, value));
    }
});

/**
 * The amount of time in milliseconds for the "lens" to adapt to the frame's exposure.
 */
Object.defineProperty(HX.ToneMapEffect.prototype, "adaptationRate", {
    get: function()
    {
        return this._adaptationRate;
    },

    set: function(value)
    {
        this._adaptationRate = value;
    }
});

/**
 *
 * @constructor
 */
HX.ReinhardToneMapEffect = function(adaptive)
{
    HX.ToneMapEffect.call(this, adaptive);
};

HX.ReinhardToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);

HX.ReinhardToneMapEffect.prototype._createToneMapPass = function()
{
    var defines = {};
    var extensions;

    if (this._adaptive) {
        defines.ADAPTIVE = 1;
        extensions = "#extension GL_EXT_shader_texture_lod : require";
    }

    return new HX.EffectPass(
        null,
        HX.ShaderLibrary.get("snippets_tonemap.glsl", defines) + "\n" +
        HX.ShaderLibrary.get("tonemap_reinhard_fragment.glsl"),
        null,
        null,
        extensions
    );
};

/**
 *
 * @constructor
 */
HX.FilmicToneMapEffect = function(adaptive)
{
    HX.ToneMapEffect.call(this, adaptive);
    this._outputsGamma = true;

};

HX.FilmicToneMapEffect.prototype = Object.create(HX.ToneMapEffect.prototype);

HX.FilmicToneMapEffect.prototype._createToneMapPass = function()
{
    var defines = {};
    var extensions;

    if (this._adaptive) {
        defines.ADAPTIVE = 1;
        extensions = "#extension GL_EXT_shader_texture_lod : require";
    }

    return new HX.EffectPass(
        null,
        HX.ShaderLibrary.get("snippets_tonemap.glsl", defines) + "\n" +
        HX.ShaderLibrary.get("tonemap_filmic_fragment.glsl"),
        null,
        null,
        extensions
    );
};
HX.ModelParser =
{
    _registeredParsers: []
};

HX.ModelParser.registerParser = function(extension, type)
{
    HX.ModelParser._registeredParsers[extension] = type;
};

HX.ModelParser.getParser = function(filename)
{
    var index = filename.lastIndexOf(".");
    var extension = filename.substr(index + 1).toLowerCase();
    return new HX.ModelParser._registeredParsers[extension]();
};

HX.ModelParser.parse = function(filename, onComplete, onFail)
{
    var parser = HX.ModelParser.getParser(filename);

    var urlLoader = new HX.URLLoader();
    urlLoader.setType(parser.dataType());

    urlLoader.onComplete = function(data)
    {
        parser.parse(data, onComplete, onFail);
    };

    urlLoader.onError = function(code)
    {
        console.warn("Failed loading " + filename + ". Error code: " + code);
        if (onFail) onFail(code);
    };

    urlLoader.load(filename);
};
/**
 *
 * @constructor
 */
HX.OBJParser = function()
{
    this._groupData = [];
    this._vertices = [];
    this._normals = [];
    this._uvs = [];
    this._modelData = null;
    this._hasNormals = false;
};

HX.OBJParser.prototype =
{
    // must yield ModelData after load
    dataType: function() { return HX.URLLoader.DATA_TEXT; },

    parse: function(data, onComplete)
    {
        var lines = data.split("\n");
        var numLines = lines.length;

        this._pushNewGroup("default");

        for (var line = 0; line < numLines; ++line) {
            this._parseLine(lines[line]);
        }

        this._translateModelData();
        onComplete(this._modelData);
    },

    _parseLine: function(line)
    {
        // skip line
        if (line.length == 0 || line.charAt(0) == "#") return;
        var tokens = line.split(" ");

        switch (tokens[0]) {
            // ignore mtllib for now
            case "usemtl":
                this._pushNewGroup();
                break;
            case "v":
                this._vertices.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
                break;
            case "vt":
                this._uvs.push(parseFloat(tokens[1]), parseFloat(tokens[2]));
                break;
            case "vn":
                this._normals.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
                break;
            case "o":
                this._pushNewGroup(tokens[1]);
                break;
            case "g":
                this._pushNewGroup(tokens[1]);
                break;
            case "f":
                this._parseFaceData(tokens);
                break;
            default:
                // ignore following tags:
                // mtllib, g, s
                console.log("OBJ tag ignored or unsupported: " + tokens[0]);
                break;
        }
    },

    _pushNewGroup: function(name)
    {
        this._activeGroup = new HX.OBJParser.GroupData();
        this._activeGroup.name = name || "Group"+this._groupData.length;
        this._groupData.push(this._activeGroup);
    },

    _parseFaceData: function(tokens)
    {
        // TODO: if numVertices > limit, start new group with same name
        var face = new HX.OBJParser.FaceData();
        var numTokens = tokens.length;

        for (var i = 1; i < numTokens; ++i) {
            var faceVertexData = new HX.OBJParser.FaceVertexData();
            face.vertices.push(faceVertexData);

            var indices = tokens[i].split("/");
            var index = (indices[0] - 1) * 3;

            faceVertexData.posX = this._vertices[index];
            faceVertexData.posY = this._vertices[index + 1];
            faceVertexData.posZ = this._vertices[index + 2];

            if(indices.length > 1) {
                index = (indices[1] - 1) * 2;

                faceVertexData.uvU = this._uvs[index];
                faceVertexData.uvV = this._uvs[index + 1];

                if (indices.length > 2) {
                    index = (indices[2] - 1) * 3;
                    this._hasNormals = true;
                    faceVertexData.normalX = this._normals[index];
                    faceVertexData.normalY = this._normals[index + 1];
                    faceVertexData.normalZ = this._normals[index + 2];
                }
            }
        }

        this._activeGroup.faces.push(face);
        this._activeGroup.numIndices += tokens.length == 4 ? 3 : 6;
    },

    _translateModelData: function()
    {
        this._modelData = new HX.ModelData();
        var numGroups = this._groupData.length;

        for (var i = 0; i < numGroups; ++i) {
            var group = this._groupData[i];
            if (group.numIndices == 0) continue;

            this._modelData.addMeshData(this._translateMeshData(group));
        }
    },

    _translateMeshData: function(group)
    {
        var meshData = HX.MeshData.createDefaultEmpty();
        var realIndices = [];
        var indices = new Array(group.numIndices);
        var numVertices = 0;
        var currentIndex = 0;

        var faces = group.faces;
        var numFaces = faces.length;
        for (var i = 0; i < numFaces; ++i) {
            var face = faces[i];

            var faceVerts = face.vertices;
            var numVerts = faceVerts.length;

            for (var j = 0; j < numVerts; ++j) {
                var vert = faceVerts[j];
                var hash = vert.getHash();
                if (!realIndices.hasOwnProperty(hash)) {
                    realIndices[hash] = {index: numVertices++, vertex: vert};
                }

            }

            indices[currentIndex] = realIndices[faceVerts[0].getHash()].index;
            indices[currentIndex+1] = realIndices[faceVerts[1].getHash()].index;
            indices[currentIndex+2] = realIndices[faceVerts[2].getHash()].index;
            currentIndex += 3;

            if (numVerts == 4) {
                indices[currentIndex] = realIndices[faceVerts[0].getHash()].index;
                indices[currentIndex+1] = realIndices[faceVerts[2].getHash()].index;
                indices[currentIndex+2] = realIndices[faceVerts[3].getHash()].index;
                currentIndex += 3;
            }
        }

        var vertices = new Array(numVertices * HX.MeshData.DEFAULT_VERTEX_SIZE);

        for (var hash in realIndices) {
            if (!realIndices.hasOwnProperty(hash)) continue;
            var data = realIndices[hash];
            var vertex = data.vertex;
            var index = data.index * HX.MeshData.DEFAULT_VERTEX_SIZE;

            vertices[index] = vertex.posX;
            vertices[index+1] = vertex.posY;
            vertices[index+2] = vertex.posZ;
            vertices[index+3] = vertex.normalX;
            vertices[index+4] = vertex.normalY;
            vertices[index+5] = vertex.normalZ;
            vertices[index+6] = 0;
            vertices[index+7] = 0;
            vertices[index+8] = 0;
            vertices[index+9] = 1;
            vertices[index+10] = vertex.uvU;
            vertices[index+11] = vertex.uvV;
        }

        meshData.setVertexData(vertices);
        meshData.setIndexData(indices);

        var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
        if (!this._hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
        var generator = new HX.NormalTangentGenerator();
        generator.generate(meshData, mode, true);
        return meshData;
    }
};

HX.ModelParser.registerParser("obj", HX.OBJParser);

HX.OBJParser.FaceVertexData = function()
{
    this.posX = 0;
    this.posY = 0;
    this.posZ = 0;
    this.uvU = 0;
    this.uvV = 0;
    this.normalX = 0;
    this.normalY = 0;
    this.normalZ = 0;
    this._hash = "";
};

HX.OBJParser.FaceVertexData.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash)
            this._hash = this.posX + "/" + this.posY + "/" + this.posZ + "/" + this.uvU + "/" + this.uvV + "/" + this.normalX + "/" + this.normalY + "/" + this.normalZ + "/";

        return this._hash;
    }
};

HX.OBJParser.FaceData = function()
{
    this.vertices = []; // <FaceVertexData>
};

HX.OBJParser.GroupData = function()
{
    this.numIndices = 0;
    this.faces = [];    // <FaceData>
    this.name = "";    // <FaceData>
};
/**
 *
 * @param numFrames The amount of frames to average
 * @constructor
 */
HX.FPSCounter = function(numFrames)
{
    this._numFrames = numFrames || 1;
    this._frames = [ ];
    this._maxFPS = undefined;
    this._minFPS = undefined;
    this._currentFPS = 0;
    this._averageFPS = 0;
    this._runningSum = 0;

    for (var i = 0; i < this._numFrames; ++i)
        this._frames[i] = 0;

    this._index = 0;
};

HX.FPSCounter.prototype =
{
    /**
     * Updates the counter with a new frame time
     * @param dt The time in milliseconds for the last frame
     */
    update: function(dt)
    {
        this._currentFPS = 1000 / dt;

        this._runningSum -= this._frames[this._index];
        this._runningSum += this._currentFPS;
        this._averageFPS = this._runningSum / this._numFrames;
        this._frames[this._index++] = this._currentFPS;

        if (this._index == this._numFrames) this._index = 0;

        if (this._maxFPS === undefined || this._currentFPS > this._maxFPS)
            this._maxFPS = this._currentFPS;

        if (this._minFPS === undefined || this._currentFPS < this._minFPS)
            this._minFPS = this._currentFPS;


    },

    getLastFrameFPS: function()
    {
        return Math.round(this._currentFPS);
    },

    getAverageFPS: function()
    {
        return Math.round(this._averageFPS);
    },

    getMaxFPS: function()
    {
        return Math.round(this._maxFPS);
    },

    getMinFPS: function()
    {
        return Math.round(this._minFPS);
    },

    reset: function()
    {
        this._maxFPS = undefined;
        this._minFPS = undefined;
    }

};
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if(!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    if(!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());


/**
 * Encapsulates behaviour to handle frames and time differences.
 * @constructor
 */

HX.FrameTicker = function()
{
    this._isRunning = false;
    this._callback = undefined;
    this._dt = 0;
    this._currentTime = 0;
}

HX.FrameTicker.prototype = {
    constructor: HX.FrameTicker,

    /**
     * Starts automatically calling a callback function every animation frame.
     * @param callback Function to call when a frame needs to be processed.
     */
    start: function(callback) {
        this._callback = callback;
        this._currentTime = this._getTime();
        this._isRunning = true;
        this._tick();
        this._tick._this = this;
    },

    /**
     * Stops calling the function.
     */
    stop: function() {
        this._isRunning = false;
    },

    /**
     * @returns {number} The time passed in between two frames
     */
    get dt() { return this._dt; },
    get time() { return this._currentTime; },

    /**
     * @private
     */
    _tick: function() {
        if (!this._isRunning) return;

        self.requestAnimationFrame(this._tick.bind(this));

        var currentTime = this._getTime();
        this._dt = currentTime - this._currentTime;
        // IsNan (on Safari?)
        if (this._dt !== this._dt) this._dt = 0;
        this._currentTime = currentTime;

        this._callback();
    },

    /**
     * @private
     */
    _getTime: function() {
        if (self.performance === undefined || self.performance.now == undefined)
            return Date.now();
        else
            return self.performance.now();
    }
}
HX.NormalTangentGenerator = function()
{
    this._meshData = null;
    this._mode = 0;
    this._positionOffset = 0;
    this._normalOffset = 0;
    this._tangentOffset = 0;
    this._faceNormals = null;
    this._faceTangents = null;
    this._faceBitangents = null;
};

HX.NormalTangentGenerator.MODE_NORMALS = 1;
HX.NormalTangentGenerator.MODE_TANGENTS = 2;

HX.NormalTangentGenerator.prototype =
{
    generate: function(meshData, mode, useFaceWeights)
    {
        if (useFaceWeights === undefined) useFaceWeights = true;
        this._mode = mode === undefined? HX.NormalTangentGenerator.MODE_NORMALS | HX.NormalTangentGenerator.MODE_TANGENTS : mode;

        this._meshData = meshData;

        this._positionOffset = meshData.getVertexAttribute("hx_position").offset;
        this._normalOffset = meshData.getVertexAttribute("hx_normal").offset;
        this._tangentOffset = meshData.getVertexAttribute("hx_tangent").offset;
        this._uvOffset = meshData.getVertexAttribute("hx_texCoord").offset;
        this._vertexStride = meshData.getVertexStride();

        this._calculateFaceVectors(useFaceWeights);
        this._calculateVertexVectors();
    },

    _calculateFaceVectors: function(useFaceWeights)
    {
        var numIndices = this._meshData._indexData.length;

        if ((this._mode & HX.NormalTangentGenerator.MODE_NORMALS) != 0) this._faceNormals = new Array(numIndices);
        if ((this._mode & HX.NormalTangentGenerator.MODE_TANGENTS) != 0) {
            this._faceTangents = new Array(numIndices);
            this._faceBitangents = new Array(numIndices);
        }

        var temp = new HX.Float4();
        var temp1 = new HX.Float4();
        var temp2 = new HX.Float4();
        var v0 = new HX.Float4();
        var v1 = new HX.Float4();
        var v2 = new HX.Float4();
        var uv0 = new HX.Float2();
        var uv1 = new HX.Float2();
        var uv2 = new HX.Float2();
        var st1 = new HX.Float2();
        var st2 = new HX.Float2();

        for (var i = 0; i < numIndices; i += 3) {
            this._getFloat3At(i, this._positionOffset, v0);
            this._getFloat3At(i + 1, this._positionOffset, v1);
            this._getFloat3At(i + 2, this._positionOffset, v2);
            this._getFloat2At(i, this._uvOffset, uv0);
            this._getFloat2At(i + 1, this._uvOffset, uv1);
            this._getFloat2At(i + 2, this._uvOffset, uv2);

            if (this._faceNormals) {
                v1.subtract(v0);
                v2.subtract(v0);
                temp.cross(v1, v2);

                if (!useFaceWeights) temp.normalize();

                this._faceNormals[i] = temp.x;
                this._faceNormals[i + 1] = temp.y;
                this._faceNormals[i + 2] = temp.z;
            }

            if (this._faceTangents) {
                //var div = ((uv1.x - uv0.x)*(uv2.y - uv0.y) - (uv1.y - uv0.y)*(uv2.x - uv0.x));
                st1.difference(uv1, uv0);
                st2.difference(uv2, uv0);

                temp1.scaled(st2.y, v1);
                temp2.scaled(st1.y, v2);
                temp.difference(temp1, temp2);
                temp.normalize();

                this._faceTangents[i] = temp.x;
                this._faceTangents[i + 1] = temp.y;
                this._faceTangents[i + 2] = temp.z;

                temp1.scaled(st2.x, v1);
                temp2.scaled(st1.x, v2);
                temp.difference(temp2, temp1);
                // no need to normalize bitangent, just need it for orientation

                this._faceBitangents[i] = temp.x;
                this._faceBitangents[i + 1] = temp.y;
                this._faceBitangents[i + 2] = temp.z;
            }
        }
    },

    _calculateVertexVectors: function()
    {
        this._zeroVectors();

        var bitangents = this._faceTangents ? [] : 0.0;
        var indexData = this._meshData._indexData;
        var vertexData = this._meshData._vertexData;
        var numIndices = indexData.length;

        for (var i = 0; i < numIndices; ++i) {
            var index = indexData[i];
            var normalIndex = this._normalOffset + index * this._vertexStride;
            var tangentIndex = this._tangentOffset + index * this._vertexStride;
            var bitangentIndex = index * 3;
            var faceIndex = Math.floor(i / 3) * 3;

            if (this._faceNormals) {
                vertexData[normalIndex] += this._faceNormals[faceIndex];
                vertexData[normalIndex + 1] += this._faceNormals[faceIndex + 1];
                vertexData[normalIndex + 2] += this._faceNormals[faceIndex + 2];
            }

            if (this._faceTangents) {
                vertexData[tangentIndex] += this._faceTangents[faceIndex];
                vertexData[tangentIndex + 1] += this._faceTangents[faceIndex + 1];
                vertexData[tangentIndex + 2] += this._faceTangents[faceIndex + 2];

                bitangents[bitangentIndex] += this._faceBitangents[faceIndex];
                bitangents[bitangentIndex + 1] += this._faceBitangents[faceIndex + 1];
                bitangents[bitangentIndex + 2] += this._faceBitangents[faceIndex + 2];
            }
            tangentIndex += this._vertexStride;
        }

        this._normalize(bitangents);
    },

    _zeroVectors: function()
    {
        var vertexData = this._meshData._vertexData;
        var numVertices = vertexData.length / this._vertexStride;
        var normalIndex = this._normalOffset;
        var tangentIndex = this._tangentOffset;

        for (var i = 0; i < numVertices; ++i) {
            if (this._mode & HX.NormalTangentGenerator.MODE_NORMALS) {
                vertexData[normalIndex] = 0.0;
                vertexData[normalIndex + 1] = 0.0;
                vertexData[normalIndex + 2] = 0.0;
            }
            if (this._mode & HX.NormalTangentGenerator.MODE_TANGENTS) {
                vertexData[tangentIndex] = 0.0;
                vertexData[tangentIndex + 1] = 0.0;
                vertexData[tangentIndex + 2] = 0.0;
            }
            normalIndex += this._vertexStride;
            tangentIndex += this._vertexStride;
        }
    },

    _normalize: function(bitangents)
    {
        var vertexData = this._meshData._vertexData;
        var numVertices = vertexData.length / this._vertexStride;
        var normalIndex = this._normalOffset;
        var tangentIndex = this._tangentOffset;
        var bitangentIndex = 0;
        var normal = new HX.Float4();
        var tangent = new HX.Float4();
        var bitangent = new HX.Float4();
        var cross = new HX.Float4();

        for (var i = 0; i < numVertices; ++i) {
            normal.x = vertexData[normalIndex];
            normal.y = vertexData[normalIndex + 1];
            normal.z = vertexData[normalIndex + 2];

            if (this._mode & HX.NormalTangentGenerator.MODE_NORMALS) {
                normal.normalize();
                vertexData[normalIndex] = normal.x;
                vertexData[normalIndex + 1] = normal.y;
                vertexData[normalIndex + 2] = normal.z;
            }
            if (this._mode & HX.NormalTangentGenerator.MODE_TANGENTS) {
                tangent.x = vertexData[tangentIndex];
                tangent.y = vertexData[tangentIndex + 1];
                tangent.z = vertexData[tangentIndex + 2];
                tangent.normalize();

                bitangent.x = bitangents[bitangentIndex];
                bitangent.y = bitangents[bitangentIndex + 1];
                bitangent.z = bitangents[bitangentIndex + 2];
                cross.cross(tangent, normal);

                vertexData[tangentIndex] = tangent.x;
                vertexData[tangentIndex + 1] = tangent.y;
                vertexData[tangentIndex + 2] = tangent.z;
                vertexData[tangentIndex + 3] = HX.dot3(bitangent, cross) > 0.0? 1.0 : -1.0;
            }

            normalIndex += this._vertexStride;
            tangentIndex += this._vertexStride;
        }
    },

    _getFloat3At: function(i, offset, target)
    {
        var indices = this._meshData._indexData;
        var posIndex = offset + indices[i] * this._vertexStride;
        target.x = this._meshData._vertexData[posIndex];
        target.y = this._meshData._vertexData[posIndex + 1];
        target.z = this._meshData._vertexData[posIndex + 2];
    },

    _getFloat2At: function(i, offset, target)
    {
        var indices = this._meshData._indexData;
        var posIndex = offset + indices[i] * this._vertexStride;
        target.x = this._meshData._vertexData[posIndex];
        target.y = this._meshData._vertexData[posIndex + 1];
    }
};