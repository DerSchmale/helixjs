//#ifdef HX_SPHERE_MESH
//uniform mat4 hx_inverseProjectionMatrix;
//uniform vec2 hx_rcpRenderTargetResolution;
//#else
varying vec2 uv;
varying vec3 viewDir;
//#endif

uniform HX_PointLight hx_pointLight;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormalDepth;
uniform sampler2D hx_gbufferSpecular;

uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;


void main()
{
//    #ifdef HX_SPHERE_MESH
//    vec2 uv = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
//    vec3 viewDir = hx_getLinearDepthViewVector(uv * 2.0 - 1.0, hx_inverseProjectionMatrix);
//    #endif

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