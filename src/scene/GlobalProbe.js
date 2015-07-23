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
    var pass = new HX.EffectPass(HX.GlobalSpecularProbe.vertexShader, HX.GlobalSpecularProbe.getFragmentShader(this._texture), HX.Light._rectMesh);

    this._numMipsLocation = pass.getUniformLocation("numMips");

    pass.setTexture("specularProbeSampler", this._texture);

    var minRoughness = 0.0014;
    var maxPower = 2.0 / (minRoughness * minRoughness) - 2.0;
    var maxMipFactor = (Math.pow(2.0, -10.0/Math.sqrt(maxPower)) - HX.GlobalSpecularProbe.powerRange0)/HX.GlobalSpecularProbe.powerRange1;
    pass.setUniform("maxMipFactor", maxMipFactor);

    return pass;
};

HX.GlobalSpecularProbe.vertexShader =
    "precision mediump float;\n\
    \n\
    varying vec3 viewWorldDir;\n\
    varying vec2 uv;\n\
    \n\
    // using rect mesh for rendering skyboxes!\n\
    void main()\n\
    {\n\
        vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;\n\
        viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;\n\
        viewWorldDir.y = viewWorldDir.y;\n\
        vec4 pos = hx_position;\n\
        pos.z = 1.0;\n\
        gl_Position = pos;\n\
        uv = hx_texCoord;\n\
    }";

HX.GlobalSpecularProbe.getFragmentShader = function(specular) {
    return (HX.EXT_SHADER_TEXTURE_LOD? "#extension GL_EXT_shader_texture_lod : require\n#define USE_TEX_LOD\n" : "") +
        (specular._hdrInAlphaRange > 0? "#define SPECULAR_HDR_FROM_ALPHA float(" + specular._hdrInAlphaRange + ")\n" : "") +
        HX.DEFERRED_LIGHT_MODEL +
        "#define K0 " + HX.GlobalSpecularProbe.powerRange0 +  "\n\
        #define K1 " + HX.GlobalSpecularProbe.powerRange1 +  "\n\
        varying vec3 viewWorldDir;\n\
        varying vec2 uv;\n\
        \n\
        uniform samplerCube specularProbeSampler;\n\
        uniform float numMips;\n\
        uniform float mipOffset;\n\
        uniform float maxMipFactor;\n\
        \n\
        void main()\n\
        {\n\
            vec4 albedoSample = texture2D(hx_gbufferAlbedo, uv);\n\
            vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n\
            vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n\
            vec3 normal = normalize(normalSample.xyz - .5);\n\
            vec3 totalLight = vec3(0.0);\n\
            albedoSample = hx_gammaToLinear(albedoSample);\n\
            \n\
            vec3 reflectedViewDir = reflect(normalize(viewWorldDir), normal);\n\
            vec3 normalSpecularReflectance;\n\
            float roughness;\n\
            hx_decodeReflectionData(albedoSample, specularSample, normalSpecularReflectance, roughness);\n\
            #ifdef USE_TEX_LOD\n\
            // knald method:\n\
                float power = 2.0/(roughness * roughness) - 2.0;\n\
                float factor = (exp2(-10.0/sqrt(power)) - K0)/K1;\n\
                float mipLevel = numMips*(1.0 - clamp(factor/maxMipFactor, 0.0, 1.0));\n\
                vec4 specProbeSample = textureCubeLodEXT(specularProbeSampler, reflectedViewDir, mipLevel);\n\
            #else\n\
                vec4 specProbeSample = textureCube(specularProbeSampler, reflectedViewDir);\n\
            #endif\n\
            specProbeSample = hx_gammaToLinear(specProbeSample);\n\
            #ifdef SPECULAR_HDR_FROM_ALPHA\n\
                specProbeSample.xyz *= specProbeSample.w * SPECULAR_HDR_FROM_ALPHA;\n\
            #endif\n\
            vec3 fresnel = hx_fresnel(normalSpecularReflectance, reflectedViewDir, normal);\n\
            // not physically correct, but attenuation is required to look good\n\
            fresnel *= (1.0 - roughness);\n\
            totalLight += fresnel * specProbeSample.xyz;\n\
            \n\
            gl_FragColor = vec4(totalLight, 1.0);\n\
        }";
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
    var pass = new HX.EffectPass(HX.GlobalIrradianceProbe.vertexShader, HX.GlobalIrradianceProbe.getFragmentShader(this._texture, this._usingAO), HX.Light._rectMesh);

    this._numMipsLocation = pass.getUniformLocation("numMips");

    pass.setTexture("irradianceProbeSampler", this._texture);

    return pass;
};

HX.GlobalIrradianceProbe.vertexShader =
    "precision mediump float;\n\
    \n\
    attribute vec4 hx_position;\n\
    attribute vec2 hx_texCoord;\n\
    \n\
    uniform mat4 hx_inverseViewProjectionMatrix;\n\
    uniform vec3 hx_cameraWorldPosition;\n\
    \n\
    varying vec3 viewWorldDir;\n\
    varying vec2 uv;\n\
    \n\
    // using rect mesh for rendering skyboxes!\n\
    void main()\n\
    {\n\
        vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;\n\
        viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;\n\
        viewWorldDir.y = viewWorldDir.y;\n\
        vec4 pos = hx_position;\n\
        pos.z = 1.0;\n\
        gl_Position = pos;\n\
        uv = hx_texCoord;\n\
    }";

HX.GlobalIrradianceProbe.getFragmentShader = function(irradiance, useAO) {
    return (useAO && irradiance? "#define USE_AO\n" : "") +
        (irradiance._hdrInAlphaRange > 0? "#define IRRADIANCE_HDR_FROM_ALPHA float(" + irradiance._hdrInAlphaRange + ")\n" : "") +
        (HX.OPTIONS.useBentNormals? "#define BENT_NORMALS\n" : "") +
        HX.DEFERRED_LIGHT_MODEL +
        "varying vec3 viewWorldDir;\n\
        varying vec2 uv;\n\
        \n\
        uniform sampler2D hx_gbufferAlbedo;\n\
        uniform sampler2D hx_gbufferNormals;\n\
        \n\
        #ifdef USE_AO\n\
            uniform sampler2D hx_source;    //contains AO \n\
        #endif\n\
        uniform samplerCube irradianceProbeSampler;\n\
        \n\
        void main()\n\
        {\n\
            vec4 albedoSample = texture2D(hx_gbufferAlbedo, uv);\n\
            vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n\
            vec3 normal = normalize(normalSample.xyz - .5);\n\
            vec3 totalLight = vec3(0.0);\n\
            albedoSample = hx_gammaToLinear(albedoSample);\n\
            \n\
            #ifdef USE_AO\n\
                vec4 occlusionSample = texture2D(hx_source, uv);\n\
                #ifdef BENT_NORMALS\n\
                    vec3 irrNormal = occlusionSample.xyz * 2.0 - 1.0; // use bent normal\n\
                #else\n\
                    vec3 irrNormal = normal;\n\
                #endif\n\
                albedoSample.xyz *= occlusionSample.w;\n\
            #else\n\
                vec3 irrNormal = normal;\n\
            #endif\n\
            vec4 irradianceSample = textureCube(irradianceProbeSampler, irrNormal);\n\
            irradianceSample = hx_gammaToLinear(irradianceSample);\n\
            #ifdef IRRADIANCE_HDR_FROM_ALPHA\n\
                irradianceSample.xyz *= irradianceSample.w * IRRADIANCE_HDR_FROM_ALPHA;\n\
            #endif\n\
            #ifdef ENABLE_SPECULAR\n\
                irradianceSample.xyz *= (vec3(1.0) - fresnel);\n\
            #endif\n\
            //irradianceSample.xyz *= (1.0 - specularSample.x);\n\
            totalLight += irradianceSample.xyz * albedoSample.xyz;\n\
            \n\
            gl_FragColor = vec4(totalLight, 1.0);\n\
        }";
};