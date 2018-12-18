varying_in vec2 uv;

uniform sampler2D hx_backBuffer;

uniform float threshold;

void main()
{
        vec4 color = texture2D(hx_backBuffer, uv);
        float originalLuminance = .05 + hx_luminance(color);
        float targetLuminance = max(originalLuminance - threshold, 0.0);
        hx_FragColor = color * targetLuminance / originalLuminance;
}
