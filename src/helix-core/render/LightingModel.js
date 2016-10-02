/**
 * You can add your own, as long as the glsl code contains a function
 * void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)
 */
HX.LightingModel =
{
    Unlit: null,
    BlinnPhong: HX.ShaderLibrary.get("lighting_blinn_phong.glsl"),
    GGX: HX.ShaderLibrary.get("lighting_ggx.glsl")
};