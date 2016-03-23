uniform vec3 color;

varying vec2 uv;

uniform sampler2D map;

void main()
{
    gl_FragColor = texture2D(map, uv);
}