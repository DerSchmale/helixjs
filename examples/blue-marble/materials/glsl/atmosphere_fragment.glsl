varying vec3 viewDir;
varying vec3 color0;
varying vec3 color1;

uniform vec3 lightDir;
uniform float mieG;
uniform float hx_transparencyMode;
uniform float boost;

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
    vec3 view = -normalize(viewDir);
    float cosTheta = dot(lightDir, view);
    vec4 color = vec4(color0 + color1 * miePhase(cosTheta), 1.0);

    GeometryData data;
    data.color = color;
    data.transparencyMode = hx_transparencyMode;
    data.emission = 1.0 + boost;
    data.linearDepth = 1.0;

    hx_processGeometry(data);
}