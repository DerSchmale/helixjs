uniform sampler2D hx_gbufferSpecular;

varying_in vec2 uv;

uniform float maxRoughness;

void main()
{
    vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
    if (specularSample.x > maxRoughness)
        discard;
}

