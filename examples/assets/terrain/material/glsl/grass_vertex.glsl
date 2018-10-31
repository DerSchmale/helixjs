vertex_attribute vec4 hx_position;
vertex_attribute vec4 hx_instanceMatrix0;
vertex_attribute vec4 hx_instanceMatrix1;
vertex_attribute vec4 hx_instanceMatrix2;
vertex_attribute vec3 hx_normal;
vertex_attribute vec2 hx_texCoord;

uniform mat3 hx_normalWorldViewMatrix;
uniform mat4 hx_worldMatrix;
uniform mat4 hx_viewProjectionMatrix;
uniform mat4 hx_viewMatrix;
uniform mat4 hx_cameraWorldMatrix;

varying_out vec2 uv;
varying_out vec3 normal;
varying_out vec4 worldPosition;
varying_out vec4 viewPosition;

uniform sampler2D heightMap;
uniform sampler2D terrainMap;
uniform float hx_time;
uniform float worldSize;
uniform float snapSize;
uniform float heightMapSize;
uniform float terrainMapSize;
uniform float minHeight;
uniform float maxHeight;
uniform float randomizer;

// https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
float rand(float n){return fract(sin(n) * 43758.5453123);}

void hx_geometry()
{
    vec4 instancePos = vec4(hx_instanceMatrix0.w, hx_instanceMatrix1.w, hx_instanceMatrix2.w, 1.0);
    vec4 centerPos = hx_worldMatrix * instancePos;
    centerPos.xy = floor(centerPos.xy / snapSize) * snapSize;

    vec2 offs;
    offs.x = rand(centerPos.x);
    offs.y = rand(centerPos.y);
    centerPos.xy += (offs - .5) * snapSize * randomizer;

    float angle = rand((centerPos.y + centerPos.x) * 1000.0) * 2.0 * HX_PI;
    float cosA = cos(angle);
    float sinA = sin(angle);
    mat3 rot;
    rot[0] = vec3(cosA, sinA, 0.0);
    rot[1] = vec3(-sinA, cosA, 0.0);
    rot[2] = vec3(0.0, 0.0, 1.0);

    vec4 worldPos = centerPos;

    worldPos.xyz += rot * hx_position.xyz;

    vec2 heightUV = worldPos.xy / worldSize + .5 + .5 / heightMapSize;
    worldPos.z += texture2D(heightMap, heightUV).x * (maxHeight - minHeight) + minHeight;

    // worldPosition is only used for the dithered blending, and it doesn't look great if the wind affects it
    // which is why we assign it before applying that
    worldPosition = worldPos;

    float t = hx_time / 1000.0;
    vec2 wind = vec2(sin(worldPos.x * .1 + t), cos(worldPos.y * .1 + t));

    // skewing the top of the mesh when looking down hides the billboard effect
    // trick from Horizon Zero Dawn
    vec3 fwd = hx_cameraWorldMatrix[1].xyz;
    vec2 skew = max(-fwd.z, 0.0) * normalize(fwd.xy);
    worldPos.xy += (wind * .05 + skew) * hx_position.z;

    uv = hx_texCoord;
    normal = hx_normalWorldViewMatrix * hx_normal;
    if (normal.y > 1.0)
        normal -= normal;
    gl_Position = hx_viewProjectionMatrix * worldPos;
    viewPosition = hx_viewMatrix * worldPos;

    vec2 terrainUV = centerPos.xy / worldSize + .5 + .5 / terrainMapSize;
    vec4 terrain = texture2D(terrainMap, terrainUV);
    float grass = 1.0 - terrain.x - terrain.y - terrain.z;
    // just move it out of the viewport
    float rand = rand(10.0 * centerPos.x - centerPos.y) * .5 + .5;
    if (grass < rand)
        gl_Position = vec4(500.0, 500.0, 500.0, 1.0);
}