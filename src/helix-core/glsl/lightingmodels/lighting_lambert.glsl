// also make sure specular probes are ignores
#define HX_SKIP_SPECULAR

// light dir is to the lit surface
// view dir is to the lit surface
void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)
{
	float nDotL = -dot(lightDir, geometry.normal);
	vec3 irradiance = max(nDotL, 0.0) * lightColor;	// in fact irradiance / PI

	#ifdef HX_TRANSLUCENCY
	    // light for flipped normal
        diffuseColor += geometry.data.xyz * max(-nDotL, 0.0) * lightColor;
    #endif

    diffuseColor = irradiance;
	specularColor = vec3(0.0);
}