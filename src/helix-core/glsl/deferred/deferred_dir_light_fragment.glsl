varying vec2 uv;
varying vec3 viewDir;

uniform HX_DirectionalLight hx_directionalLight;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormalDepth;
uniform sampler2D hx_gbufferSpecular;

#ifdef HX_SHADOW_MAP
uniform sampler2D hx_shadowMap;
#endif

uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;


void main()
{
// TODO: move this to snippets_deferred file, along with the hx_decodeGBufferSpecular method
    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);

    float absViewZ = hx_cameraNearPlaneDistance + data.linearDepth * hx_cameraFrustumRange;
	vec3 viewPosition = viewDir * absViewZ;
    vec3 viewVector = normalize(viewPosition);
    vec3 diffuse, specular;

    float normalSpecularReflectance, roughness;

    hx_calculateLight(hx_directionalLight, data.geometry, viewVector, viewPosition, data.normalSpecularReflectance, diffuse, specular);

    gl_FragColor.xyz = diffuse * data.geometry.color.xyz + specular;
    gl_FragColor.w = 1.0;

    #ifdef HX_SHADOW_MAP
        gl_FragColor.xyz *= hx_calculateShadows(hx_directionalLight, hx_shadowMap, viewPosition);
    #endif

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}