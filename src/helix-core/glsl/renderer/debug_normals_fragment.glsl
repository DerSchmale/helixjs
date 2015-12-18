varying vec2 uv;

uniform sampler2D sampler;

void main()
{
   vec4 data = texture2D(sampler, uv);
   vec3 normal = hx_decodeNormal(data);
   gl_FragColor = vec4(normal * .5 + .5, 1.0);
}