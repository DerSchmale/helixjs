uniform vec3 hx_ambientColor;

#ifdef HX_SSAO
uniform sampler2D hx_ssao;
#endif

#ifdef HX_NUM_DIFFUSE_PROBES
    uniform HX_DiffuseProbe hx_diffuseProbes[HX_NUM_DIFFUSE_PROBES];
    uniform HX_SpecularProbe hx_specularProbes[HX_NUM_SPECULAR_PROBES];
    uniform samplerCube hx_specularProbeTextures[HX_NUM_SPECULAR_PROBES];
    uniform mat4 hx_cameraWorldMatrix;
    varying_in vec3 hx_viewPosition;
#endif


uniform vec2 hx_rcpRenderTargetResolution;

void main()
{
    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;

    HX_GeometryData data = hx_geometry();

    vec3 diffuseAccum = vec3(0.0);
    vec3 specularAccum = vec3(0.0);

    #ifdef HX_NUM_DIFFUSE_PROBES
        vec3 viewVector = normalize(hx_viewPosition);
        vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);
        data.color.xyz *= 1.0 - data.metallicness;

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
        diffuseAccum += hx_evaluateSH(sh, worldNormal) / max(diffuseWeightSum, 0.001);

        vec3 reflectedViewDir = reflect(viewVector, data.normal);
        vec3 fresnel = hx_fresnelProbe(specularColor, reflectedViewDir, data.normal, data.roughness);

        vec3 reflectedWorldDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;

        float specularWeightSum = 0.0;

        for (int i = 0; i < HX_NUM_SPECULAR_PROBES; ++i) {
            float weight = hx_getProbeWeight(hx_specularProbes[i], hx_viewPosition);
            specularAccum += hx_calculateSpecularProbeLight(hx_specularProbes[i], hx_specularProbeTextures[i], reflectedWorldDir, fresnel, data.roughness) * weight;
            specularWeightSum += weight;
        }

        specularAccum /= max(specularWeightSum, 0.001);
    #endif

    diffuseAccum += hx_ambientColor;

    float ao = data.occlusion;
    #ifdef HX_SSAO
    ao *= texture2D(hx_ssao, screenUV).x;
    #endif

    hx_FragColor = data.color;
    hx_FragColor.xyz = (hx_FragColor.xyz * diffuseAccum + specularAccum) * ao + data.emission;
}