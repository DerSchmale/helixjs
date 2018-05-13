struct HX_PointLight
{
    vec3 color;
    vec3 position;
    float radius;
    float rcpRadius;

    float depthBias;
    mat4 shadowMapMatrix;
    bool castShadows;
    vec4 shadowTiles[6];    // for each cube face
};

void hx_calculateLight(HX_PointLight light, HX_GeometryData geometry, vec3 viewVector, vec3 viewPosition, vec3 normalSpecularReflectance, out vec3 diffuse, out vec3 specular)
{
    vec3 direction = viewPosition - light.position;
    float attenuation = dot(direction, direction);  // distance squared
    float distance = sqrt(attenuation);
    // normalize
    direction /= distance;
    attenuation = max((1.0 - distance * light.rcpRadius) / attenuation, 0.0);
	hx_brdf(geometry, direction, viewVector, viewPosition, light.color * attenuation, normalSpecularReflectance, diffuse, specular);
}

#ifdef HX_FRAGMENT_SHADER
float hx_calculateShadows(HX_PointLight light, sampler2D shadowMap, vec3 viewPos)
{
    vec3 dir = viewPos - light.position;
    // go from view space back to world space, as a vector
    float dist = length(dir);
    dir = mat3(light.shadowMapMatrix) * dir;

    /*float shadowSample = hx_RGBA8ToFloat(textureCube(shadowMap, worldDir.xzy));
    float diff = dist * light.rcpRadius - shadowSample - depthBias;
    return float(diff < 0.0);*/

    // swizzle to opengl cube map space
    dir = dir.xzy;

    vec3 absDir = abs(dir);
    float maxDir = max(max(absDir.x, absDir.y), absDir.z);
    vec2 uv;
    vec4 tile;
    if (absDir.x == maxDir) {
        tile = dir.x > 0.0? light.shadowTiles[0]: light.shadowTiles[1];
        // signs are important (hence division by either dir or absDir
        uv = vec2(-dir.z / dir.x, -dir.y / absDir.x);
    }
    else if (absDir.y == maxDir) {
        tile = dir.y > 0.0? light.shadowTiles[4]: light.shadowTiles[5];
        uv = vec2(dir.x / absDir.y, dir.z / dir.y);
    }
    else {
        tile = dir.z > 0.0? light.shadowTiles[2]: light.shadowTiles[3];
        uv = vec2(dir.x / dir.z, -dir.y / absDir.z);
    }

    // match the scaling applied in the shadow map pass (used to reduce bleeding from filtering)
    uv *= .95;

    vec4 shadowMapCoord;
    shadowMapCoord.xy = uv * tile.xy + tile.zw;
    shadowMapCoord.z = dist * light.rcpRadius;
    shadowMapCoord.w = 1.0;
    return hx_readShadow(shadowMap, shadowMapCoord, light.depthBias);
}
#endif