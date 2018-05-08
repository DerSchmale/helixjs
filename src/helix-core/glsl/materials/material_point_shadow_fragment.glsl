varying_in vec3 hx_viewPosition;

uniform float hx_rcpRadius;

void main()
{
    // geometry is really only used for kil instructions if necessary
    // hopefully the compiler optimizes the rest out for us
    HX_GeometryData data = hx_geometry();

    hx_FragColor = hx_point_getShadowMapValue(length(hx_viewPosition) * hx_rcpRadius);
}