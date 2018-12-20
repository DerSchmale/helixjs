varying_in vec4 hx_newPos;
varying_in vec4 hx_oldPos;

void main()
{
    vec2 velocity = saturate((hx_newPos.xy / hx_newPos.w - hx_oldPos.xy / hx_oldPos.w) * .25  + .5);
    HX_GeometryData data = hx_geometry();
    hx_FragColor.xy = hx_floatToRG8(velocity.x);
    hx_FragColor.zw = hx_floatToRG8(velocity.y);
}