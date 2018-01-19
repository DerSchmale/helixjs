varying vec2 uv;
varying vec3 viewDir;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormalDepth;
uniform sampler2D hx_gbufferSpecular;

#ifdef HX_SSAO
uniform sampler2D hx_ssao;
#endif

uniform samplerCube hx_diffuseProbeMap;
uniform samplerCube hx_specularProbeMap;

uniform float hx_specularProbeNumMips;
uniform mat4 hx_cameraWorldMatrix;

#ifdef HX_LOCAL_PROBE
uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;

uniform float hx_probeSize;
uniform vec3 hx_probePosition;
#endif

void main()
{
    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);

    vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.geometry.normal;

    vec3 viewVector = normalize(viewDir);
    vec3 reflectedViewDir = reflect(viewVector, data.geometry.normal);
    vec3 fresnel = hx_fresnelProbe(data.normalSpecularReflectance, reflectedViewDir, data.geometry.normal, data.geometry.roughness);
    reflectedViewDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;

#ifdef HX_LOCAL_PROBE
    float absViewY = hx_cameraNearPlaneDistance + data.linearDepth * hx_cameraFrustumRange;
    vec3 viewPosition = viewDir * absViewY;
    vec3 worldPosition = mat3(hx_cameraWorldMatrix) * viewPosition;
#endif

    vec3 diffuse = vec3(0.0);
    vec3 specular = vec3(0.0);

#ifdef HX_DIFFUSE_PROBE
    vec3 diffRay = worldNormal;
    #ifdef HX_LOCAL_PROBE
        diffRay = hx_intersectCubeMap(worldPosition, hx_probePosition, diffRay, hx_probeSize);
    #endif
    diffuse = hx_calculateDiffuseProbeLight(hx_diffuseProbeMap, diffRay);
#endif
#ifdef HX_SPECULAR_PROBE
    vec3 specRay = reflectedViewDir;
    #ifdef HX_LOCAL_PROBE
        specRay = hx_intersectCubeMap(worldPosition, hx_probePosition, specRay, hx_probeSize);
    #endif
    specular = hx_calculateSpecularProbeLight(hx_specularProbeMap, hx_specularProbeNumMips, specRay, fresnel, data.geometry.roughness);
#endif

    gl_FragColor.xyz = diffuse * data.geometry.color.xyz + specular;

    gl_FragColor.xyz *= data.geometry.occlusion;

    #ifdef HX_SSAO
    gl_FragColor.xyz *= texture2D(hx_ssao, uv).x;
    #endif

    gl_FragColor.w = 1.0;

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}