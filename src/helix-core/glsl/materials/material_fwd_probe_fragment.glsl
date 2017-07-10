varying vec3 hx_viewPosition;

uniform samplerCube hx_diffuseProbeMap;
uniform samplerCube hx_specularProbeMap;
uniform float hx_specularProbeNumMips;

uniform mat4 hx_cameraWorldMatrix;

#if HX_APPLY_SSAO
uniform vec2 hx_rcpRenderTargetResolution;
uniform sampler2D hx_ssao;
#endif

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
    vec3 diffuse = hx_calculateDiffuseProbeLight(hx_diffuseProbeMap, worldNormal);
    vec3 specular = hx_calculateSpecularProbeLight(hx_specularProbeMap, hx_specularProbeNumMips, reflectedViewDir, fresnel, data.roughness);

    gl_FragColor = vec4(diffuse * data.color.xyz + specular, data.color.w);

    #if HX_APPLY_SSAO
    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
    gl_FragColor.xyz *= texture2D(hx_ssao, screenUV).x;
    #endif

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}