varying vec2 uv;
varying vec3 viewDir;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormalDepth;
uniform sampler2D hx_gbufferSpecular;
uniform sampler2D hx_ssao;
uniform samplerCube hx_diffuseProbeMap;
uniform samplerCube hx_specularProbeMap;

uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;
uniform float hx_specularProbeNumMips;
uniform mat4 hx_cameraWorldMatrix;


void main()
{
// TODO: move this to snippets_deferred file, along with the hx_decodeGBufferSpecular method
    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);

    vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.geometry.normal;

    vec3 viewVector = normalize(viewDir);
    vec3 reflectedViewDir = reflect(viewVector, data.geometry.normal);
    vec3 fresnel = hx_fresnelProbe(data.normalSpecularReflectance, reflectedViewDir, data.geometry.normal, data.geometry.roughness);
    reflectedViewDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;

    vec3 diffuse = vec3(0.0);
    vec3 specular = vec3(0.0);
#ifdef HX_DIFFUSE_PROBE
    diffuse = hx_calculateDiffuseProbeLight(hx_diffuseProbeMap, worldNormal);
#endif
#ifdef HX_SPECULAR_PROBE
    specular = hx_calculateSpecularProbeLight(hx_specularProbeMap, hx_specularProbeNumMips, reflectedViewDir, fresnel, data.geometry.roughness);
#endif

    float ssao = texture2D(hx_ssao, uv).x;
    gl_FragColor.xyz = (diffuse * data.geometry.color.xyz + specular) * ssao;
    gl_FragColor.w = 1.0;

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}