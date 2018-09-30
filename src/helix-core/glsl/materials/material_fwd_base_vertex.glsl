#ifdef HX_NUM_DIFFUSE_PROBES
uniform mat4 hx_inverseProjectionMatrix;

varying_out vec3 hx_viewPosition;
#endif

void main()
{
    hx_geometry();

#ifdef HX_NUM_DIFFUSE_PROBES
    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;
#endif
}