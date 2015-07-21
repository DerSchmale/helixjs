#includeHelix

varying vec3 normal;

void main()
{
    gl_FragColor = vec4(normal * .5 + .5, 1.0);
}