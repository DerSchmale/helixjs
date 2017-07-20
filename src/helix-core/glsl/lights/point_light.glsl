struct HX_PointLight
{
    vec3 color;
    vec3 position;
    float radius;
    float rcpRadius;
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