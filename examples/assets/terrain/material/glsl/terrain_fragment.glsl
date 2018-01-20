#derivatives

uniform sampler2D heightMap;
uniform sampler2D sandNormals;
uniform sampler2D terrainMap;
uniform sampler2D sandTexture;
uniform sampler2D grassTexture;
uniform sampler2D rockTexture;
uniform sampler2D detailTexture;
uniform sampler2D rockNormals;
uniform sampler2D grassDetailNormals;
uniform sampler2D terrainNormals;

uniform float hx_elevationScale;
uniform mat4 hx_viewMatrix;

varying vec3 viewPosition;
varying vec2 uv;

uniform float terrainNormalsDistance;
uniform float terrainNormalsFade;

uniform float terrainNormalsScale;
uniform float detailScale;
uniform float grassScale;
uniform float sandScale;
uniform float rockScale;
uniform float heightMapSize;
uniform float worldSize;

vec3 getSandColor()
{
    return texture2D(sandTexture, uv * sandScale).xyz;
}

vec3 getSandNormal()
{
    return texture2D(sandNormals, uv * sandScale).xyz;
}

vec3 getGrassColor(vec4 detail)
{
    return texture2D(grassTexture, uv * grassScale).xyz * detail.x;
}

vec3 getGrassNormal()
{
    return texture2D(grassDetailNormals, uv * detailScale).xyz;
}

vec3 getRockColor(vec4 detail)
{
    return texture2D(rockTexture, uv * rockScale).xyz * detail.y;
}

vec3 getRockNormal()
{
    return texture2D(rockNormals, uv * rockScale).xyz;
}

vec3 getSnowColor(vec4 detail)
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
    float height = hx_RGBA8ToFloat(texture2D(heightMap, uv));
    float stepSize = max(max(fwidth(uv.x), fwidth(uv.y)), 1.0 / heightMapSize);
    vec3 tangentX = vec3(stepSize * worldSize, 0.0, 0.0);
    vec3 tangentY = vec3(0.0, stepSize * worldSize, 0.0);

    tangentX.z = (hx_RGBA8ToFloat(texture2D(heightMap, uv + vec2(stepSize, 0.0))) - height) * hx_elevationScale;
    tangentY.z = (hx_RGBA8ToFloat(texture2D(heightMap, uv + vec2(0.0, stepSize))) - height) * hx_elevationScale;

    tangentX = normalize(tangentX);
    tangentY = normalize(tangentY);

    float grassRoughness = .85;
    float rockRoughness = .7;
    float snowRoughness = .2;

    vec3 normal = cross(tangentX, tangentY);
    mat3 TBN = mat3(tangentX, tangentY, normal);

    HX_GeometryData data;
    vec4 terrain = texture2D(terrainMap, uv);
    vec3 terrainNormal = texture2D(terrainNormals, uv * terrainNormalsScale).xyz;
    vec4 detail = texture2D(detailTexture, uv * detailScale);
    vec3 sand = getSandColor();
    vec3 sandNormal = getSandNormal();
    vec3 grass = getGrassColor(detail);
    vec3 grassNormal = getGrassNormal();
    vec3 rock = getRockColor(detail);
    vec3 rockNormal = getRockNormal();
    vec3 snow = getSnowColor(detail);
    vec3 snowNormal = getSnowNormal();
    vec3 color = mix(grass, snow, terrain.z);
    float rockAlpha = clamp((terrain.y - rock.x) / .5, 0.0, 1.0);
    color = mix(color, rock, rockAlpha);
    color = mix(color, sand, terrain.x);

    float roughness = mix(grassRoughness, snowRoughness, terrain.z);
    roughness = mix(roughness, rockRoughness, terrain.y);

    vec3 localNorm = mix(grassNormal, snowNormal, terrain.z);
    localNorm = mix(localNorm, rockNormal, terrain.y);
    localNorm = mix(localNorm, sandNormal, terrain.x);

    float fadeFactor = 1.0 - clamp((-viewPosition.z - terrainNormalsDistance) / terrainNormalsFade, 0.0, 1.0);
    localNorm = localNorm  - .5;
    localNorm.xy = localNorm.xy * fadeFactor + terrainNormal.xy - .5;

    normal = mat3(hx_viewMatrix) * TBN * normalize(localNorm);
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