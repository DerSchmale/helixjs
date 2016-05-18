attribute vec4 hx_position;
attribute vec2 hx_texCoord;

varying vec2 uv;
varying vec2 uvBottom;

uniform float pixelHeight;

void main()
{
    uv = hx_texCoord;
    uvBottom = hx_texCoord + vec2(0.0, pixelHeight);
    gl_Position = hx_position;
}