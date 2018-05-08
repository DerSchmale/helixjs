varying_in vec3 hx_viewPosition;
varying_in vec3 hx_worldPosition;

uniform samplerCube hx_diffuseProbeMap;
uniform samplerCube hx_specularProbeMap;
uniform float hx_specularProbeNumMips;

uniform mat4 hx_cameraWorldMatrix;

#ifdef HX_SSAO
uniform vec2 hx_rcpRenderTargetResolution;
uniform sampler2D hx_ssao;
#endif

uniform float hx_probeSize;
uniform vec3 hx_probePosition;
uniform float hx_probeLocal;

void main()
{
    HX_GeometryData data = hx_geometry();

    vec3 viewVector = normalize(hx_viewPosition);

    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);
    data.color.xyz *= 1.0 - data.metallicness;

    // TODO: We should be able to change the base of TBN in vertex shader
    vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.normal;
    vec3 reflectedViewDir = reflect(viewVector, data.normal);
    vec3 fresnel = hx_fresnelProbe(specularColor, reflectedViewDir, data.normal, data.roughness);
    reflectedViewDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;
    vec3 diffRay = hx_intersectCubeMap(hx_worldPosition, hx_probePosition, worldNormal, hx_probeSize);
    vec3 specRay = hx_intersectCubeMap(hx_worldPosition, hx_probePosition, reflectedViewDir, hx_probeSize);
    diffRay = mix(worldNormal, diffRay, hx_probeLocal);
    specRay = mix(reflectedViewDir, specRay, hx_probeLocal);
    vec3 diffuse = hx_calculateDiffuseProbeLight(hx_diffuseProbeMap, diffRay);
    vec3 specular = hx_calculateSpecularProbeLight(hx_specularProbeMap, hx_specularProbeNumMips, specRay, fresnel, data.roughness);

    hx_FragColor = vec4((diffuse * data.color.xyz + specular) * data.occlusion, data.color.w);

    #ifdef HX_SSAO
    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
    hx_FragColor.xyz *= texture2D(hx_ssao, screenUV).x;
    #endif
}