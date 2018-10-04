varying_in vec2 uv;

uniform samplerCube sampler;

void main()
{
    vec3 dir;

    float theta = (-(uv.x * 2.0 - 1.0) + .5) * HX_PI;
    float phi = (uv.y * 2.0 - 1.0) * HX_PI / 2.0;

    dir.x = cos(theta) * cos(phi);
	dir.y = -sin(phi);
	dir.z = sin(theta) * cos(phi);

    hx_FragColor = textureCube(sampler, dir);
}