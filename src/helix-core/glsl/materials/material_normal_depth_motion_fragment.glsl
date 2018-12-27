#drawbuffers

varying_in float hx_linearDepth;
varying_in vec4 hx_newPos;
varying_in vec4 hx_oldPos;
uniform vec2 hx_cameraJitter;

void main()
{
    HX_GeometryData data = hx_geometry();

    // undo jitter
    vec2 newPos = hx_newPos.xy / hx_newPos.w - hx_cameraJitter;
    vec2 oldPos = hx_oldPos.xy / hx_oldPos.w;

    // express in uv coords: newPos, oldPos * .5 + .5
    // then map [-1, 1] to [0, 1]: *.5 + .5
    vec2 velocity = saturate((newPos - oldPos) * .25  + .5);

    gl_FragData[0].xy = hx_encodeNormal(data.normal);
    gl_FragData[0].zw = hx_floatToRG8(hx_linearDepth);
    gl_FragData[1].xy = hx_floatToRG8(velocity.x);
    gl_FragData[1].zw = hx_floatToRG8(velocity.y);
}