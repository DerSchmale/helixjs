varying vec3 normal;

void main()
{
    gl_FragColor = hx_encodeNormalDepth(normal, gl_FragCoord.z);
}