varying vec3 viewDir;
varying vec3 color0;
varying vec3 color1;

uniform vec3 lightDir;
uniform float mieG;
uniform float hx_transparencyMode;
uniform float lightIntensity;

#ifdef GROUND_MODE
varying vec2 uv;
varying vec3 normal;
uniform vec2 hx_rcpRenderTargetResolution;
uniform sampler2D hx_backbuffer;
uniform sampler2D emissionMap;
#endif

float rayleighPhase(float cosTheta)
{
    return (.75 + (1.0 + cosTheta * cosTheta)) / 12.566370; // div 4*PI
}

float miePhase(float cosTheta)
{
    float g2 = mieG * mieG;
    return 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + cosTheta*cosTheta) / pow(1.0 + g2 - 2.0*mieG*cosTheta, 1.5);
}

void main()
{
#ifdef GROUND_MODE
    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
    vec4 source = texture2D(hx_backbuffer, screenUV);
    vec4 emit = texture2D(emissionMap, uv);
    emit *= max(-dot(lightDir, normal), 0.0);
    gl_FragColor = vec4(color0 + source.xyz * color1 + emit.xyz, 1.0);
#else
    vec3 view = -normalize(viewDir);
    float cosTheta = dot(lightDir, view);
//    float rayleigh = rayleighPhase(cosTheta);
    vec4 color = vec4(color0 + color1 * miePhase(cosTheta), 1.0);

    GeometryData data;
    data.color = color;
    data.transparencyMode = hx_transparencyMode;
    data.emission = lightIntensity;
    data.linearDepth = 1.0;

    hx_processGeometry(data);
#endif
}