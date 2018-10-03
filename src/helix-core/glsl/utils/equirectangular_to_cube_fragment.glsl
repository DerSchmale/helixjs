#define RECIPROCAL_PI2 0.15915494
#define RECIPROCAL_PI 0.31830989

varying_in vec3 direction;

uniform sampler2D source;

void main()
{
    vec3 dir = normalize(direction);
    vec2 uv;

    uv.x = -atan( dir.z, dir.x ) * RECIPROCAL_PI2 - .25;
	uv.y = 0.5 - asin(dir.y) * RECIPROCAL_PI;
    hx_FragColor = texture2D(source, uv);
}
