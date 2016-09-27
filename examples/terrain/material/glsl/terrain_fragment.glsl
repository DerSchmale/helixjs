#extension GL_OES_standard_derivatives : enable

uniform sampler2D heightMap;
uniform sampler2D terrainMap;
uniform sampler2D grassTexture;
uniform sampler2D rockTexture;
uniform sampler2D detailTexture;
uniform sampler2D rockNormals;
uniform sampler2D grassDetailNormals;

uniform float hx_elevationScale;
uniform mat4 hx_viewMatrix;


varying vec2 uv;

uniform float detailScale;
uniform float grassScale;
uniform float rockScale;
uniform float heightMapSize;
uniform float worldSize;

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

HX_GeometryData hx_geometry()
{
    float height = hx_RGBA8ToFloat(texture2D(heightMap, uv));
    float stepSize = max(max(fwidth(uv.x), fwidth(uv.y)), 1.0 / heightMapSize);
    vec3 tangentX = vec3(stepSize * worldSize, 0.0, 0.0);
    vec3 tangentZ = vec3(0.0, 0.0, stepSize * worldSize);

    tangentX.y = (hx_RGBA8ToFloat(texture2D(heightMap, uv + vec2(stepSize, 0.0))) - height) * hx_elevationScale;
    tangentZ.y = (hx_RGBA8ToFloat(texture2D(heightMap, uv + vec2(0.0, stepSize))) - height) * hx_elevationScale;

    tangentX = normalize(tangentX);
    tangentZ = normalize(tangentZ);

    float grassRoughness = .9;
    float rockRoughness = .6;
    float snowRoughness = .1;

    vec3 normal = cross(tangentZ, tangentX);
    mat3 TBN = mat3(tangentX, tangentZ, normal);

    HX_GeometryData data;
    vec4 terrain = texture2D(terrainMap, uv);
    vec4 detail = texture2D(detailTexture, uv * detailScale);
    vec3 grass = getGrassColor(detail);
    vec3 grassNormal = getGrassNormal();
    vec3 rock = getRockColor(detail);
    vec3 rockNormal = getRockNormal();
    vec3 snow = getSnowColor(detail);
    vec3 snowNormal = getSnowNormal();
    vec3 color = mix(grass, snow, terrain.z);
    color = mix(color, rock, terrain.y);

    float roughness = mix(grassRoughness, snowRoughness, terrain.z);
    roughness = mix(roughness, rockRoughness, terrain.y);

    vec3 localNorm = mix(grassNormal, snowNormal, terrain.z);
    localNorm = mix(localNorm, rockNormal, terrain.y);
    normal = TBN * normalize(localNorm);
    normal =  mat3(hx_viewMatrix) * normal;
    data.color = vec4(color, 1.0);
    data.normal = normal;
    data.metallicness = 0.0;
    data.normalSpecularReflectance = 0.027;
    data.roughness = roughness;
    data.emission = vec3(0.0);
    return data;
}