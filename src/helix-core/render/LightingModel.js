/**
 * You can add your own, as long as the glsl code contains a function
 * void hx_brdf(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 normalSpecularReflectance, float roughness, out vec3 diffuseLight, out vec3 specularLight)
 */
HX.LightingModel =
{
    UnlitLightingModel: null,
    BlinnPhong: HX.ShaderLibrary.get("lighting_blinn_phong.glsl") + "\n\n",
    GGX: HX.ShaderLibrary.get("lighting_ggx.glsl") + "\n\n"
};