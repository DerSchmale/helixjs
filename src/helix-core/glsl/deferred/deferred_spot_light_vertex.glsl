attribute vec4 hx_position;

#ifdef HX_CONE_MESH
uniform HX_SpotLight hx_spotLight;
uniform mat4 hx_viewProjectionMatrix;
uniform mat4 hx_projectionMatrix;
uniform mat4 hx_spotLightWorldMatrix;
#else

attribute vec2 hx_texCoord;
#endif

varying vec2 uv;
varying vec3 viewDir;

uniform mat4 hx_inverseProjectionMatrix;

void main()
{
#ifdef HX_CONE_MESH
    vec3 localPos = hx_position.xyz;
    // need to flip z, but also another axis to keep windedness
    localPos.xz = -localPos.xz;
    // align to origin, with height 1
    localPos.z += .5;
    // adapt to correct radius
    localPos.xyz *= hx_spotLight.radius;
    // make sure the base is correctly sized
    localPos.xy *= hx_spotLight.sinOuterAngle;

    // this just rotates, it does not translate
    vec4 worldPos = hx_spotLightWorldMatrix * vec4(localPos, 1.0);
    gl_Position = hx_viewProjectionMatrix * worldPos;
    gl_Position /= gl_Position.w;
    uv = gl_Position.xy / gl_Position.w * .5 + .5;
    viewDir = hx_getLinearDepthViewVector(gl_Position.xy / gl_Position.w, hx_inverseProjectionMatrix);
#else
    uv = hx_texCoord;
    gl_Position = hx_position;
    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);
#endif
}