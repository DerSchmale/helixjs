struct HX_SpotLight
{
    vec3 color;
    vec3 position;
    vec3 direction;
    float radius;
    float rcpRadius;
    vec2 angleData;    // cos(inner), rcp(cos(outer) - cos(inner))
    float sinOuterAngle;    // only used in deferred, hence separate
};

void hx_calculateLight(HX_SpotLight light, HX_GeometryData geometry, vec3 viewVector, vec3 viewPosition, vec3 normalSpecularReflectance, out vec3 diffuse, out vec3 specular)
{
    vec3 direction = viewPosition - light.position;
    float attenuation = dot(direction, direction);  // distance squared
    float distance = sqrt(attenuation);
    // normalize
    direction /= distance;

    float cosAngle = dot(light.direction, direction);

    attenuation = max((1.0 - distance * light.rcpRadius) / attenuation, 0.0);
    attenuation *=  saturate((cosAngle - light.angleData.x) * light.angleData.y);

	hx_brdf(geometry, direction, viewVector, viewPosition, light.color * attenuation, normalSpecularReflectance, diffuse, specular);
}