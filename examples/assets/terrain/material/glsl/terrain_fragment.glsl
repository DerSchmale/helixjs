#derivatives

uniform sampler2D hx_heightMap;
uniform float hx_heightMapSize;
uniform float hx_worldSize;
uniform float hx_elevationScale;
uniform mat4 hx_viewMatrix;

uniform sampler2D sandNormals;
uniform sampler2D terrainMap;
uniform sampler2D sandTexture;
uniform sampler2D grassTexture;
uniform sampler2D rockTexture;
uniform sampler2D rockNormals;
uniform sampler2D grassDetailNormals;
uniform sampler2D terrainNormals;

varying_in vec3 viewPosition;
varying_in vec2 uv;

uniform float terrainNormalsScale;
uniform float detailFadeNear;
uniform float detailFadeFar;
uniform float grassScale;
uniform float grassScaleClose;
uniform float sandScale;
uniform float rockScale;

vec3 getSandColor()
{
    return texture2D(sandTexture, uv * sandScale).xyz;
}

vec3 getSandNormal()
{
    return texture2D(sandNormals, uv * sandScale).xyz;
}

vec3 getGrassColor(float detail)
{
    vec3 colorClose = texture2D(grassTexture, uv * grassScaleClose).xyz;
    vec3 colorFar = texture2D(grassTexture, uv * grassScale).xyz;
    return mix(colorClose, colorFar, detail);
}

vec3 getGrassNormal()
{
    return texture2D(grassDetailNormals, uv * grassScaleClose).xyz;
}

vec3 getRockColor(float detail)
{
    return texture2D(rockTexture, uv * rockScale).xyz;
}

vec3 getRockNormal()
{
    return texture2D(rockNormals, uv * rockScale).xyz;
}

vec3 getSnowColor(float detail)
{
    return vec3(1.0, 1.0, 1.0);
}


vec3 getSnowNormal()
{
    return vec3(0.0, 0.0, 1.0);
}

// Could use https://gamedevelopment.tutsplus.com/articles/use-tri-planar-texture-mapping-for-better-terrain--gamedev-13821
// but it'd be pretty heavy
HX_GeometryData hx_geometry()
{
    float detailFactor = hx_linearStep(detailFadeNear, detailFadeFar, viewPosition.y);
    vec2 dUV = abs(dFdx(uv));
    float stepSize = max(max(dUV.x, dUV.y), 1.0 / hx_heightMapSize);

    // all normal/tangent calculations are in world space
    vec3 tangentX = vec3(2.0 * stepSize * hx_worldSize, 0.0, 0.0);
    vec3 tangentY = vec3(0.0, 2.0 * stepSize * hx_worldSize, 0.0);

    float h_r = texture2D(hx_heightMap, uv + vec2(stepSize, 0.0)).x;
    float h_l = texture2D(hx_heightMap, uv - vec2(stepSize, 0.0)).x;
    float h_t = texture2D(hx_heightMap, uv + vec2(0.0, stepSize)).x;
    float h_b = texture2D(hx_heightMap, uv - vec2(0.0, stepSize)).x;
    tangentX.z = (h_r - h_l) * hx_elevationScale;
    tangentY.z = (h_t - h_b) * hx_elevationScale;

    tangentX = normalize(tangentX);
    tangentY = normalize(tangentY);

    float grassRoughness = .7;
    float sandRoughness = .8;
    float rockRoughness = .7;
    float snowRoughness = .5;

    vec3 normal = cross(tangentX, tangentY);
    mat3 TBN = mat3(tangentX, tangentY, normal);

    HX_GeometryData data;
    vec4 terrain = texture2D(terrainMap, uv);
    vec3 terrainNormal = texture2D(terrainNormals, uv * terrainNormalsScale).xyz;
    terrainNormal.z *= 2.0;
    vec3 sand = getSandColor();
    vec3 sandNormal = getSandNormal();
    vec3 grass = getGrassColor(detailFactor);
    vec3 grassNormal = getGrassNormal();
    vec3 rock = getRockColor(detailFactor);
    vec3 rockNormal = getRockNormal();
    vec3 snow = getSnowColor(detailFactor);
    vec3 snowNormal = getSnowNormal();
    vec3 color = mix(grass, snow, terrain.z);
    float rockAlpha = clamp((terrain.y - rock.x) / .5, 0.0, 1.0);
    color = mix(color, rock, rockAlpha);
    color = mix(color, sand, terrain.x);
    color = hx_gammaToLinear(color);

    float roughness = mix(grassRoughness, sandRoughness, terrain.x);
    roughness = mix(roughness, snowRoughness, terrain.z);
    roughness = mix(roughness, rockRoughness, terrain.y);

    vec3 localNorm = mix(grassNormal, snowNormal, terrain.z);
    localNorm = mix(localNorm, rockNormal, terrain.y);
    localNorm = mix(localNorm, sandNormal, terrain.x);
    normal = mix(localNorm, terrainNormal, detailFactor);
    normal = mat3(hx_viewMatrix) * TBN * normalize(normal * 2.0 - 1.0);

    data.color = vec4(color, 1.0);
//    data.color = vec4(normal * .5 + .5, 1.0);
    data.normal = normal;
    data.metallicness = 0.0;
    data.normalSpecularReflectance = 0.027;
    data.roughness = roughness;
    data.occlusion = 1.0;
    data.emission = vec3(0.0);
    return data;
}