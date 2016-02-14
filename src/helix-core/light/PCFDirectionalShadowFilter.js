HX.PCFDirectionalShadowFilter =
{
    _CULL_MODE: undefined,
    _SHADOW_MAP_FORMAT: null,
    _SHADOW_MAP_DATA_TYPE: null,

    NUM_SHADOW_SAMPLES: 6,
    DITHER: false,

    BLUR_SHADER: undefined,

    init: function()
    {
        HX.PCFDirectionalShadowFilter._SHADOW_MAP_FORMAT = HX.GL.RGBA;
        HX.PCFDirectionalShadowFilter._SHADOW_MAP_DATA_TYPE = HX.GL.UNSIGNED_INT;
        HX.PCFDirectionalShadowFilter._CULL_MODE = HX.CullMode.FRONT;
    },

    getGLSL: function()
    {
        var defines = {
            NUM_SHADOW_SAMPLES: HX.PCFDirectionalShadowFilter.NUM_SHADOW_SAMPLES
        };

        if (HX.PCFDirectionalShadowFilter.DITHER)
            defines.DITHER_SHADOWS = 1;

        return HX.ShaderLibrary.get("dir_shadow_soft.glsl", defines);
    }
};