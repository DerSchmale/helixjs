varying vec3 hx_viewPosition;

uniform vec3 hx_ambientColor;

#if HX_NUM_DIR_LIGHTS > 0
uniform HX_DirectionalLight hx_directionalLights[HX_NUM_DIR_LIGHTS];
#endif

#if HX_NUM_DIR_LIGHT_CASTERS > 0
uniform HX_DirectionalLight hx_directionalLightCasters[HX_NUM_DIR_LIGHT_CASTERS];

uniform sampler2D hx_directionalShadowMaps[HX_NUM_DIR_LIGHT_CASTERS];
uniform float test[HX_NUM_DIR_LIGHT_CASTERS];
#endif

#if HX_NUM_POINT_LIGHTS > 0
uniform HX_PointLight hx_pointLights[HX_NUM_POINT_LIGHTS];
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


void main()
{
    HX_GeometryData data = hx_geometry();

    // TODO: Provide support for proper AO so it's not a bad post-process effect?

    // update the colours
    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);
    data.color.xyz *= 1.0 - data.metallicness;

    vec3 diffuseAccum = vec3(0.0);
    vec3 specularAccum = vec3(0.0);
    vec3 viewVector = normalize(hx_viewPosition);

    #if HX_NUM_DIR_LIGHTS > 0
    for (int i = 0; i < HX_NUM_DIR_LIGHTS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_directionalLights[i], data.normal, viewVector, specularColor, data.roughness, diffuse, specular);
        diffuseAccum += diffuse;
        specularAccum += specular;
    }
    #endif

    #if HX_NUM_DIR_LIGHT_CASTERS > 0
    for (int i = 0; i < HX_NUM_DIR_LIGHT_CASTERS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_directionalLightCasters[i], data.normal, viewVector, specularColor, data.roughness, diffuse, specular);
        float shadow = hx_calculateShadows(hx_directionalLightCasters[i], hx_directionalShadowMaps[i], hx_viewPosition);
        diffuseAccum += diffuse * shadow;
        specularAccum += specular * shadow;
    }
    #endif


    #if HX_NUM_POINT_LIGHTS > 0
    for (int i = 0; i < HX_NUM_POINT_LIGHTS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_pointLights[i], data.normal, viewVector, hx_viewPosition, specularColor, data.roughness, diffuse, specular);
        diffuseAccum += diffuse;
        specularAccum += specular;
    }
    #endif

    #if HX_NUM_DIFFUSE_PROBES > 0
    vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.normal;
    for (int i = 0; i < HX_NUM_DIFFUSE_PROBES; ++i) {
        diffuseAccum += hx_calculateDiffuseProbeLight(hx_diffuseProbeMaps[i], worldNormal);
    }
    #endif

    #if HX_NUM_SPECULAR_PROBES > 0
    vec3 reflectedViewDir = reflect(viewVector, data.normal);
    vec3 fresnel = hx_fresnel(specularColor, reflectedViewDir, data.normal);
    float geometricShadowing = hx_probeGeometricShadowing(data.normal, reflectedViewDir, data.roughness, data.metallicness);

    reflectedViewDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;

    for (int i = 0; i < HX_NUM_SPECULAR_PROBES; ++i) {
        specularAccum += hx_calculateSpecularProbeLight(hx_specularProbeMaps[i], hx_specularProbeNumMips[i], reflectedViewDir, fresnel, geometricShadowing, data.roughness);
    }
    #endif

    gl_FragColor = vec4((diffuseAccum + hx_ambientColor) * data.color.xyz + specularAccum, data.color.w);

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}