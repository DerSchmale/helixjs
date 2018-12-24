varying_in vec4 hx_newPos;
varying_in vec4 hx_oldPos;

uniform vec2 hx_cameraJitter;

void main()
{
    // undo jitter
    vec2 newPos = hx_newPos.xy / hx_newPos.w - hx_cameraJitter;
    vec2 oldPos = hx_oldPos.xy / hx_oldPos.w;

    // express in uv coords: newPos, oldPos * .5 + .5
    // then map [-1, 1] to [0, 1]: *.5 + .5
    vec2 velocity = saturate((newPos - oldPos) * .25  + .5);
    HX_GeometryData data = hx_geometry();
    hx_FragColor.xy = hx_floatToRG8(velocity.x);
    hx_FragColor.zw = hx_floatToRG8(velocity.y);
}