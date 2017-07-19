attribute vec4 hx_position;


#ifdef HX_SPHERE_MESH
uniform HX_PointLight hx_pointLight;
uniform mat4 hx_projectionMatrix;

#else

attribute vec2 hx_texCoord;
#endif

varying vec2 uv;
varying vec3 viewDir;

uniform mat4 hx_inverseProjectionMatrix;

void main()
{
#ifdef HX_SPHERE_MESH
    vec4 viewPos = vec4(hx_position.xyz * hx_pointLight.radius + hx_pointLight.position, 1.0);

    gl_Position = hx_projectionMatrix * viewPos;
    uv = gl_Position.xy / gl_Position.w * .5 + .5;
    viewDir = hx_getLinearDepthViewVector(gl_Position.xy / gl_Position.w, hx_inverseProjectionMatrix);
#else
    uv = hx_texCoord;
    gl_Position = hx_position;
    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);
#endif
}