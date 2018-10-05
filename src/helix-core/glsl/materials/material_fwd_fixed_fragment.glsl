varying_in vec3 hx_viewPosition;

uniform vec3 hx_ambientColor;

uniform sampler2D hx_shadowMap;

#if HX_NUM_DIFFUSE_PROBES > 0 || HX_NUM_SPECULAR_PROBES > 0
uniform mat4 hx_cameraWorldMatrix;
#endif

#if HX_NUM_DIFFUSE_PROBES > 0
uniform HX_DiffuseProbe hx_diffuseProbes[HX_NUM_DIFFUSE_PROBES];
#endif

#if HX_NUM_SPECULAR_PROBES > 0
uniform HX_SpecularProbe hx_specularProbes[HX_NUM_SPECULAR_PROBES];
uniform samplerCube hx_specularProbeTextures[HX_NUM_SPECULAR_PROBES];
#endif

#if HX_NUM_DIR_LIGHTS > 0
uniform HX_DirectionalLight hx_directionalLights[HX_NUM_DIR_LIGHTS];
#endif

#if HX_NUM_POINT_LIGHTS > 0
uniform HX_PointLight hx_pointLights[HX_NUM_POINT_LIGHTS];
#endif

#if HX_NUM_SPOT_LIGHTS > 0
uniform HX_SpotLight hx_spotLights[HX_NUM_SPOT_LIGHTS];
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

    float ao = data.occlusion;

    #ifdef HX_SSAO
        vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
        ao = texture2D(hx_ssao, screenUV).x;
    #endif

    vec3 diffuseAccum = vec3(0.0);
    vec3 specularAccum = vec3(0.0);
    vec3 viewVector = normalize(hx_viewPosition);

    #if HX_NUM_DIFFUSE_PROBES > 0
    float diffuseWeightSum = 0.0;
    vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.normal;

    vec3 sh[9];

    for (int i = 0; i < 9; ++i)
        sh[i] = vec3(0.0);

    for (int i = 0; i < HX_NUM_DIFFUSE_PROBES; ++i) {
        float weight = hx_getProbeWeight(hx_diffuseProbes[i], hx_viewPosition);
        float w = weight * hx_diffuseProbes[i].intensity;
        sh[0] += hx_diffuseProbes[i].sh[0] * w;
        sh[1] += hx_diffuseProbes[i].sh[1] * w;
        sh[2] += hx_diffuseProbes[i].sh[2] * w;
        sh[3] += hx_diffuseProbes[i].sh[3] * w;
        sh[4] += hx_diffuseProbes[i].sh[4] * w;
        sh[5] += hx_diffuseProbes[i].sh[5] * w;
        sh[6] += hx_diffuseProbes[i].sh[6] * w;
        sh[7] += hx_diffuseProbes[i].sh[7] * w;
        sh[8] += hx_diffuseProbes[i].sh[8] * w;
        diffuseWeightSum += weight;
    }

    if (diffuseWeightSum > 0.0)
        diffuseAccum += hx_evaluateSH(sh, worldNormal) / diffuseWeightSum;

    #endif

    diffuseAccum += hx_ambientColor;
    diffuseAccum *= ao;

    #if HX_NUM_SPECULAR_PROBES > 0
    vec3 reflectedViewDir = reflect(viewVector, data.normal);
    vec3 fresnel = hx_fresnelProbe(specularColor, reflectedViewDir, data.normal, data.roughness);

    vec3 reflectedWorldDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;

    float specularWeightSum = 0.0;

    for (int i = 0; i < HX_NUM_SPECULAR_PROBES; ++i) {
        float weight = hx_getProbeWeight(hx_specularProbes[i], hx_viewPosition);
        specularAccum += hx_calculateSpecularProbeLight(hx_specularProbes[i], hx_specularProbeTextures[i], reflectedWorldDir, fresnel, data.roughness) * weight;
        specularWeightSum += weight;
    }

    if (specularWeightSum > 0.0)
        specularAccum /= specularWeightSum;

    specularAccum *= ao;
    #endif

    #if HX_NUM_DIR_LIGHTS > 0
    for (int i = 0; i < HX_NUM_DIR_LIGHTS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_directionalLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);

        if (hx_directionalLights[i].castShadows == 1) {
            float shadow = hx_calculateShadows(hx_directionalLights[i], hx_shadowMap, hx_viewPosition);
            diffuse *= shadow;
            specular *= shadow;
        }

        diffuseAccum += diffuse;
        specularAccum += specular;
    }
    #endif

    #if HX_NUM_POINT_LIGHTS > 0
    for (int i = 0; i < HX_NUM_POINT_LIGHTS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_pointLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);

        if (hx_pointLights[i].castShadows == 1) {
            float shadow = hx_calculateShadows(hx_pointLights[i], hx_shadowMap, hx_viewPosition);
            diffuse *= shadow;
            specular *= shadow;
        }

        diffuseAccum += diffuse;
        specularAccum += specular;
    }
    #endif

    #if HX_NUM_SPOT_LIGHTS > 0
    for (int i = 0; i < HX_NUM_SPOT_LIGHTS; ++i) {
        vec3 diffuse, specular;
        hx_calculateLight(hx_spotLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);

        if (hx_spotLights[i].castShadows == 1) {
            float shadow = hx_calculateShadows(hx_spotLights[i], hx_shadowMap, hx_viewPosition);
            diffuse *= shadow;
            specular *= shadow;
        }

        diffuseAccum += diffuse;
        specularAccum += specular;
    }
    #endif

    hx_FragColor = vec4(diffuseAccum * data.color.xyz + specularAccum + data.emission, data.color.w);
}