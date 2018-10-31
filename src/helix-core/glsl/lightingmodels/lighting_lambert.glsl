// also make sure specular probes are ignores
#define HX_SKIP_SPECULAR

// light dir is to the lit surface
// view dir is to the lit surface
void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)
{
	float nDotL = -dot(lightDir, geometry.normal);
    diffuseColor = max(nDotL, 0.0) * lightColor;

	#ifdef HX_USE_TRANSLUCENCY
	    // light for flipped normal
        diffuseColor += geometry.translucency * max(-nDotL, 0.0) * lightColor;
    #endif

	specularColor = vec3(0.0);
}