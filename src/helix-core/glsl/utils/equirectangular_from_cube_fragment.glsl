varying_in vec2 uv;

uniform samplerCube source;

void main()
{
    vec3 dir;

    float theta = -(u * 2.0 - 1.0) + .5;
    float phi = (v * 2.0 - 1.0) * HX_PI / 2.0;

    dir.x = Math.cos(u * HX_PI) * cos(phi);
	dir.y = Math.sin(phi);
	dir.z = Math.sin(u * HX_PI) * cos(phi);

    hx_FragColor = textureCube(source, dir);
}