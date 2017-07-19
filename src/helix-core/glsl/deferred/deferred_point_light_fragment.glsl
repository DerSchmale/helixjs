varying vec2 uv;
varying vec3 viewDir;

uniform HX_PointLight hx_pointLight;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormalDepth;
uniform sampler2D hx_gbufferSpecular;

uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;


void main()
{
    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);

    float absViewZ = hx_cameraNearPlaneDistance + data.linearDepth * hx_cameraFrustumRange;

	vec3 viewPosition = viewDir * absViewZ;
    vec3 viewVector = normalize(viewPosition);
    vec3 diffuse, specular;

    hx_calculateLight(hx_pointLight, data.geometry, viewVector, viewPosition, data.normalSpecularReflectance, diffuse, specular);

    gl_FragColor.xyz = diffuse * data.geometry.color.xyz + specular;
    gl_FragColor.w = 1.0;

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}