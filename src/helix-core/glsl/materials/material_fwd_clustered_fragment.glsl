varying_in vec3 hx_viewPosition;

uniform vec3 hx_ambientColor;

#ifdef HX_SSAO
uniform sampler2D hx_ssao;

uniform vec2 hx_rcpRenderTargetResolution;
#endif

uniform hx_lights
{
    int hx_numDirLights;
    HX_DirectionalLight hx_directionalLights[HX_NUM_DIR_LIGHTS];
};

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
            diffuseAccum += diffuse;
            specularAccum += specular;
        }
    #endif

    hx_FragColor = vec4((diffuseAccum + hx_ambientColor * ao) * data.color.xyz + specularAccum + data.emission, data.color.w);
}