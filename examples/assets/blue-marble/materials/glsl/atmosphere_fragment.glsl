varying_in vec3 viewDir;
varying_in vec3 color0;
varying_in vec3 color1;

uniform vec3 lightDir;
uniform float mieG;
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

HX_GeometryData hx_geometry()
{
    vec3 view = normalize(viewDir);
    float cosTheta = dot(lightDir, view);
    vec4 color = vec4(color0 + color1 * miePhase(cosTheta), 1.0);
    HX_GeometryData data;
    data.color = color * (1.0 + boost);
    data.emission = vec3(0.0);
    return data;
}