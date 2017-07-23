varying vec3 hx_viewPosition;

uniform HX_SpotLight hx_spotLight;

#ifdef HX_SHADOW_MAP
uniform sampler2D hx_shadowMap;
#endif

void main()
{
    HX_GeometryData data = hx_geometry();

    vec3 viewVector = normalize(hx_viewPosition);
    vec3 diffuse, specular;

    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);
    data.color.xyz *= 1.0 - data.metallicness;

    hx_calculateLight(hx_spotLight, data, viewVector, hx_viewPosition, specularColor, diffuse, specular);

    gl_FragColor = vec4(diffuse * data.color.xyz + specular, data.color.w);

    #ifdef HX_SHADOW_MAP
        gl_FragColor.xyz *= hx_calculateShadows(hx_spotLight, hx_shadowMap, hx_viewPosition);
    #endif

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}