#extension GL_OES_standard_derivatives : enable

uniform sampler2D heightMap;
uniform sampler2D terrainMap;
uniform sampler2D grassTexture;
uniform sampler2D rockTexture;
uniform sampler2D rockNormals;

uniform float hx_elevationScale;
uniform mat4 hx_viewMatrix;


varying vec2 uv;
//varying vec3 varTangentX;
//varying vec3 varTangentZ;

uniform float grassScale;
uniform float rockScale;
uniform float heightMapSize;
uniform float worldSize;

vec3 getGrassColor()
{
    return texture2D(grassTexture, uv * grassScale).xyz;
}

vec3 getGrassNormal()
{
    return vec3(0.0, 0.0, 1.0);
}

vec3 getRockColor()
{
    return texture2D(rockTexture, uv * rockScale).xyz;
}

vec3 getRockNormal()
{
    return texture2D(rockNormals, uv * rockScale).xyz;
}

vec3 getSnowColor()
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

    vec3 normal = cross(tangentZ, tangentX);
    mat3 TBN = mat3(tangentX, tangentZ, normal);

    HX_GeometryData data;
    vec4 terrain = texture2D(terrainMap, uv);
    vec3 grass = getGrassColor();
    vec3 grassNormal = getGrassNormal();
    vec3 rock = getRockColor();
    vec3 rockNormal = getRockNormal();
    vec3 snow = getSnowColor();
    vec3 snowNormal = getSnowNormal();
    vec3 color = mix(grass, snow, terrain.z);
    vec3 localNorm = mix(grassNormal, snowNormal, terrain.z);
    color = mix(color, rock, terrain.y);
    localNorm = mix(localNorm, rockNormal, terrain.y);
    normal = TBN * normalize(localNorm);
    normal =  mat3(hx_viewMatrix) * normal;
    data.color = vec4(color, 1.0);
    data.normal = normal;
    data.metallicness = 0.0;
    data.normalSpecularReflectance = 0.027;
    data.roughness = 0.9;
    data.emission = vec3(0.0);
    return data;
}