varying_in vec2 hx_velocity;

void main()
{
    vec2 velocity = saturate(hx_velocity);
    HX_GeometryData data = hx_geometry();
    hx_FragColor.xy = hx_floatToRG8(velocity.x);
    hx_FragColor.zw = hx_floatToRG8(velocity.y);
}