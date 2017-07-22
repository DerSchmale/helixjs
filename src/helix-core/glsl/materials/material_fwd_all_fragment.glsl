varying vec3 hx_viewPosition;

uniform vec3 hx_ambientColor;

#if HX_NUM_DIR_LIGHTS > 0
uniform HX_DirectionalLight hx_directionalLights[HX_NUM_DIR_LIGHTS];
#endif

#if HX_NUM_DIR_LIGHT_CASTERS > 0
uniform HX_DirectionalLight hx_directionalLightCasters[HX_NUM_DIR_LIGHT_CASTERS];

uniform sampler2D hx_directionalShadowMaps[HX_NUM_DIR_LIGHT_CASTERS];
#endif

#if HX_NUM_POINT_LIGHTS > 0
uniform HX_PointLight hx_pointLights[HX_NUM_POINT_LIGHTS];
#endif

#if HX_NUM_SPOT_LIGHTS > 0
uniform HX_PointLight hx_spotLights[HX_NUM_SPOT_LIGHTS];
#endif

#if HX_NUM_DIFFUSE_PROBES > 0 || HX_NUM_SPECULAR_PROBES > 0
uniform mat4 hx_cameraWorldMatrix;
#endif

#if HX_NUM_DIFFUSE_PROBES > 0
uniform samplerCube hx_diffuseProbeMaps[HX_NUM_DIFFUSE_PROBES];
#endif

#if HX_NUM_SPECULAR_PROBES > 0
uniform samplerCube hx_specularProbeMaps[HX_NUM_SPECULAR_PROBES];
uniform float hx_specularProbeNumMips[HX_NUM_SPECULAR_PROBES];
#endif

#ifdef HX_SSAO
uniform sampler2D hx_ssao;

uniform vec2 hx_rcpRenderTargetResolution;
#endif


void main()
{
    HX_GeometryData data = hx_geometry();

    // update the colours
    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);
    data.color.xyz *= 1.0 - data.metallicness;

    vec3 diffuseAccum = vec3(0.0);
    vec3 specularAccum = vec3(0.0);
    vec3 viewVector = normalize(hx_viewPosition);

    float ssao = 1.0;

    #ifdef HX_SSAO
        vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
        ssao = texture2D(hx_ssao, screenUV).x;
    #endif

    #if HX_NUM_DIR_LIGHTS > 0
    for (int i = 0; i < HX_NUM_DIR_LIGHTS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_directionalLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);
        diffuseAccum += diffuse;
        specularAccum += specular;
    }
    #endif

    #if HX_NUM_DIR_LIGHT_CASTERS > 0
    for (int i = 0; i < HX_NUM_DIR_LIGHT_CASTERS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_directionalLightCasters[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);
        float shadow = hx_calculateShadows(hx_directionalLightCasters[i], hx_directionalShadowMaps[i], hx_viewPosition);
        diffuseAccum += diffuse * shadow;
        specularAccum += specular * shadow;
    }
    #endif


    #if HX_NUM_POINT_LIGHTS > 0
    for (int i = 0; i < HX_NUM_POINT_LIGHTS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_pointLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);
        diffuseAccum += diffuse;
        specularAccum += specular;
    }
    #endif

    #if HX_NUM_SPOT_LIGHTS > 0
    for (int i = 0; i < HX_NUM_SPOT_LIGHTS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_spotLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);
        diffuseAccum += diffuse;
        specularAccum += specular;
    }
    #endif

    #if HX_NUM_DIFFUSE_PROBES > 0
    vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.normal;
    for (int i = 0; i < HX_NUM_DIFFUSE_PROBES; ++i) {
        diffuseAccum += hx_calculateDiffuseProbeLight(hx_diffuseProbeMaps[i], worldNormal) * ssao;
    }
    #endif

    #if HX_NUM_SPECULAR_PROBES > 0
    vec3 reflectedViewDir = reflect(viewVector, data.normal);
    vec3 fresnel = hx_fresnelProbe(specularColor, reflectedViewDir, data.normal, data.roughness);

    reflectedViewDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;

   for (int i = 0; i < HX_NUM_SPECULAR_PROBES; ++i) {
        specularAccum += hx_calculateSpecularProbeLight(hx_specularProbeMaps[i], hx_specularProbeNumMips[i], reflectedViewDir, fresnel, data.roughness) * ssao;
    }
    #endif

    gl_FragColor = vec4((diffuseAccum + hx_ambientColor * ssao) * data.color.xyz + specularAccum + data.emission, data.color.w);

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}