#define RECIPROCAL_PI2 0.15915494

varying vec3 direction;

uniform sampler2D source;

void main()
{
    vec3 dir = normalize(direction);
    vec2 uv;
    uv.x = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	uv.y = dir.y * 0.5 + 0.5;
    gl_FragColor = texture2D(source, uv);
}
