/**
 * Simple normalized blinn-phong model (NDF * fresnel)
 */
HX.BlinnPhongSimpleLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_blinn_phong_simple.glsl") + "\n\n";
    }
};

/**
 * Normalized blinn-phong with visibility and foreshortening terms.
 */
HX.BlinnPhongFullLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_blinn_phong_full.glsl") + "\n\n";
    }
};

/**
 * Full GGX model with visibility and foreshortening terms.
 */
HX.GGXLightingModel=
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_ggx.glsl") + "\n\n";
    }
};