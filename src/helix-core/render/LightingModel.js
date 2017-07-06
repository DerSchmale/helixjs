import { ShaderLibrary } from '../shader/ShaderLibrary';

/**
 * You can add your own, as long as the glsl code contains a function
 * void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)
 */
export var LightingModel =
{
    Unlit: null,
    BlinnPhong: ShaderLibrary.get("lighting_blinn_phong.glsl"),
    GGX: ShaderLibrary.get("lighting_ggx.glsl")
};