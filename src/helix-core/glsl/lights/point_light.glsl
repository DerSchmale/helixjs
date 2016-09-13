struct HX_PointLight
{
    vec3 color;
    vec3 position; // in view space?
    float radius;
};


void hx_calculateLight(HX_PointLight light, vec3 normal, vec3 viewVector, vec3 viewPosition, vec3 normalSpecularReflectance, float roughness, out vec3 diffuse, out vec3 specular)
{
    vec3 direction = viewPosition - light.position;
    float attenuation = dot(direction, direction);  // distance squared
    float distance = sqrt(attenuation);
    direction /= distance;
    attenuation = max((1.0 - distance / light.radius) / attenuation, 0.0);
	hx_brdf(normal, direction, viewVector, light.color * attenuation, normalSpecularReflectance, roughness, diffuse, specular);
}