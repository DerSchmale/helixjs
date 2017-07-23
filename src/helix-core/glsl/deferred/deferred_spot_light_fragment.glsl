varying vec2 uv;
varying vec3 viewDir;

uniform HX_SpotLight hx_spotLight;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormalDepth;
uniform sampler2D hx_gbufferSpecular;

uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;

#ifdef HX_SHADOW_MAP
uniform sampler2D hx_shadowMap;
#endif

void main()
{
    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);

    float absViewZ = hx_cameraNearPlaneDistance + data.linearDepth * hx_cameraFrustumRange;

	vec3 viewPosition = viewDir * absViewZ;
    vec3 viewVector = normalize(viewPosition);
    vec3 diffuse, specular;

    hx_calculateLight(hx_spotLight, data.geometry, viewVector, viewPosition, data.normalSpecularReflectance, diffuse, specular);

    gl_FragColor.xyz = diffuse * data.geometry.color.xyz + specular;
    gl_FragColor.w = 1.0;

    #ifdef HX_SHADOW_MAP
        gl_FragColor.xyz *= hx_calculateShadows(hx_spotLight, hx_shadowMap, viewPosition);
//        gl_FragColor.xyz = vec3(hx_calculateShadows(hx_spotLight, hx_shadowMap, viewPosition));
    #endif

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}