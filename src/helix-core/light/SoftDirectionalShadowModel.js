HX.SoftDirectionalShadowModel =
{
    _CULL_MODE: undefined,

    NUM_SHADOW_SAMPLES: 6,
    DITHER: false,

    BLUR_SHADER: undefined,

    init: function()
    {
        HX.SoftDirectionalShadowModel._CULL_MODE = HX.CullMode.FRONT;
    },

    getGLSL: function()
    {
        var defines = {
            NUM_SHADOW_SAMPLES: HX.SoftDirectionalShadowModel.NUM_SHADOW_SAMPLES
        };

        if (HX.SoftDirectionalShadowModel.DITHER)
            defines.DITHER_SHADOWS = 1;

        return HX.ShaderLibrary.get("dir_shadow_soft.glsl", defines);
    }
};