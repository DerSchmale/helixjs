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

varying_out vec2 uv;
varying_out vec3 normal;
varying_out vec4 viewPosition;

uniform sampler2D heightMap;
uniform sampler2D terrainMap;
uniform float worldSize;
uniform float snapSize;
uniform float heightMapSize;
uniform float terrainMapSize;
uniform float minHeight;
uniform float maxHeight;

// Noise functions:
//	<https://www.shadertoy.com/view/4dS3Wd>
//	By Morgan McGuire @morgan3d, http://graphicscodex.com
//
float hash(float n) { return fract(sin(n) * 1e4); }
float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

float noise(float x) {
	float i = floor(x);
	float f = fract(x);
	float u = f * f * (3.0 - 2.0 * f);
	return mix(hash(i), hash(i + 1.0), u);
}

void hx_geometry()
{
    vec4 instancePos = vec4(hx_instanceMatrix0.w, hx_instanceMatrix1.w, hx_instanceMatrix2.w, 1.0);
    vec4 centerPos = hx_worldMatrix * instancePos;
    centerPos.xy = round(centerPos.xy / snapSize) * snapSize;
    vec2 offs;
    offs.x = noise(centerPos.x);
    offs.y = noise(centerPos.y);
    centerPos.xy += (offs - .5) * snapSize * .25;

    float angle = noise(centerPos.y + centerPos.x) * 2.0 * HX_PI;
    float cosA = cos(angle);
    float sinA = sin(angle);
    mat3 rot;
    rot[0] = vec3(cosA, sinA, 0.0);
    rot[1] = vec3(-sinA, cosA, 0.0);
    rot[2] = vec3(0.0, 0.0, 1.0);

    vec4 worldPos = centerPos;
    // include some sideways scaling to make the object look bigger
    worldPos.xyz += rot * (hx_position.xyz * vec3(snapSize, snapSize, 1.0));

    vec2 heightUV = worldPos.xy / worldSize + .5 + .5 / heightMapSize;
    worldPos.z += texture2D(heightMap, heightUV).x * (maxHeight - minHeight) + minHeight;

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
    float rand = noise(10.0 * centerPos.x - centerPos.y) * .5 + .5;
    if (grass < rand)
        gl_Position = vec4(500.0, 500.0, 500.0, 1.0);
}