/**
 * Simple normalized blinn-phong model (NDF * fresnel)
 */
HX.BlinnPhongSimpleLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_blinn_phong.glsl") + "\n\n";
    }
};

/**
 * Normalized blinn-phong with visibility and foreshortening terms.
 */
HX.BlinnPhongFullLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_blinn_phong.glsl",
                {
                    VISIBILITY: 1
                }) + "\n\n";
    }
};

/**
 * Full GGX model with geometric and foreshortening terms.
 */
HX.GGXFullLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_ggx.glsl",
                {
                    VISIBILITY: 1
                }) + "\n\n";
    }
};

/**
 * GGX distribution model without visibility term.
 */
HX.GGXLightingModel =
{
    getGLSL: function() {
        return HX.ShaderLibrary.get("lighting_ggx.glsl") + "\n\n";
    }
};