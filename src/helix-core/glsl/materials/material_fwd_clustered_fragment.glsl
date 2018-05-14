struct HX_PointSpotLight
{
// the order here is ordered in function of packing
    vec3 color;
    float radius;

    vec3 position;
    float rcpRadius;

    vec3 direction; // spot only
    float depthBias;

    mat4 shadowMapMatrix;

    bool isSpot;
    bool castShadows;
    vec2 angleData;    // cos(inner), rcp(cos(outer) - cos(inner))

    vec4 shadowTile;    // xy = scale, zw = offset

    // points only
    // the 5 missing tiles, share the first one with spots!
    vec4 shadowTiles[5];    // for each cube face
};

HX_SpotLight hx_asSpotLight(HX_PointSpotLight light)
{
    HX_SpotLight spot;
    spot.color = light.color;
    spot.position = light.position;
    spot.radius = light.radius;
    spot.direction = light.direction;
    spot.rcpRadius = light.rcpRadius;
    spot.angleData = light.angleData;
    spot.shadowMapMatrix = light.shadowMapMatrix;
    spot.depthBias = light.depthBias;
    spot.castShadows = light.castShadows;
    spot.shadowTile = light.shadowTile;
    return spot;
}

HX_PointLight hx_asPointLight(HX_PointSpotLight light)
{
    HX_PointLight point;
    point.color = light.color;
    point.position = light.position;
    point.radius = light.radius;
    point.rcpRadius = light.rcpRadius;
    point.shadowMapMatrix = light.shadowMapMatrix;
    point.depthBias = light.depthBias;
    point.castShadows = light.castShadows;
    point.shadowTiles[0] = light.shadowTile;
    point.shadowTiles[1] = light.shadowTiles[0];
    point.shadowTiles[2] = light.shadowTiles[1];
    point.shadowTiles[3] = light.shadowTiles[2];
    point.shadowTiles[4] = light.shadowTiles[3];
    point.shadowTiles[5] = light.shadowTiles[4];
    return point;
}

varying_in vec3 hx_viewPosition;

uniform vec3 hx_ambientColor;

uniform sampler2D hx_shadowMap;

#ifdef HX_SSAO
uniform sampler2D hx_ssao;

uniform vec2 hx_rcpRenderTargetResolution;
#endif

uniform hx_lights
{
    int hx_numDirLights;
    int hx_numLightProbes;
    int hx_numPointSpotLights;

#if HX_NUM_DIR_LIGHTS > 0
    HX_DirectionalLight hx_directionalLights[HX_NUM_DIR_LIGHTS];
#endif

#if HX_NUM_LIGHT_PROBES > 0
    HX_Probe hx_probes[HX_NUM_LIGHT_PROBES];
#endif

#if HX_NUM_POINT_SPOT_LIGHTS > 0
    HX_PointSpotLight hx_pointSpotLights[HX_NUM_POINT_SPOT_LIGHTS];
#endif

};

#if HX_NUM_LIGHT_PROBES > 0
uniform mat4 hx_cameraWorldMatrix;

uniform samplerCube hx_diffuseProbes[HX_NUM_LIGHT_PROBES];
uniform samplerCube hx_specularProbes[HX_NUM_LIGHT_PROBES];
#endif

void main()
{
    HX_GeometryData data = hx_geometry();

    // update the colours
    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);
    data.color.xyz *= 1.0 - data.metallicness;

    vec3 diffuseAccum = vec3(0.0);
    vec3 specularAccum = vec3(0.0);
    vec3 viewVector = normalize(hx_viewPosition);

    float ao = data.occlusion;

    #ifdef HX_SSAO
        vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
        ao = texture2D(hx_ssao, screenUV).x;
    #endif

    #if HX_NUM_DIR_LIGHTS > 0
        for (int i = 0; i < hx_numDirLights; ++i) {
            vec3 diffuse, specular;
            hx_calculateLight(hx_directionalLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);

            if (hx_directionalLights[i].castShadows) {
                float shadow = hx_calculateShadows(hx_directionalLights[i], hx_shadowMap, hx_viewPosition);
                diffuse *= shadow;
                specular *= shadow;
            }

            diffuseAccum += diffuse;
            specularAccum += specular;
        }
    #endif

    #if HX_NUM_LIGHT_PROBES > 0
        vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.normal;
        vec3 reflectedViewDir = reflect(viewVector, data.normal);
        vec3 fresnel = hx_fresnelProbe(specularColor, reflectedViewDir, data.normal, data.roughness);

        for (int i = 0; i < HX_NUM_LIGHT_PROBES; ++i) {
            // this is a bit icky, but since the cube textures need to indexed using a literal, we can't loop over hx_numLightProbes
            if (i < hx_numLightProbes) {
                if (hx_probes[i].hasDiffuse)
                    diffuseAccum += hx_calculateDiffuseProbeLight(hx_diffuseProbes[i], worldNormal) * ao;

                if (hx_probes[i].hasSpecular)
                    specularAccum += hx_calculateSpecularProbeLight(hx_specularProbes[i], hx_probes[i].numMipLevels, reflectedViewDir, fresnel, data.roughness) * ao;
            }
        }
    #endif

    #if HX_NUM_POINT_SPOT_LIGHTS > 0
        for (int i = 0; i < hx_numPointSpotLights; ++i) {
            vec3 diffuse, specular;
            float shadow = 1.0;;

            if (hx_pointSpotLights[i].isSpot) {
                HX_SpotLight spot = hx_asSpotLight(hx_pointSpotLights[i]);
                hx_calculateLight(spot, data, viewVector, hx_viewPosition, specularColor, diffuse, specular);
                if (spot.castShadows)
                    shadow = hx_calculateShadows(spot, hx_shadowMap, hx_viewPosition);
            }
            else {
                HX_PointLight point = hx_asPointLight(hx_pointSpotLights[i]);
                hx_calculateLight(point, data, viewVector, hx_viewPosition, specularColor, diffuse, specular);
                if (point.castShadows)
                    shadow = hx_calculateShadows(point, hx_shadowMap, hx_viewPosition);
            }

            diffuseAccum += diffuse * shadow;
            specularAccum += specular * shadow;
        }
    #endif

    hx_FragColor = vec4((diffuseAccum + hx_ambientColor * ao) * data.color.xyz + specularAccum + data.emission, data.color.w);
}