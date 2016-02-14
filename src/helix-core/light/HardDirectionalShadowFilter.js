HX.HardDirectionalShadowFilter =
{
    _CULL_MODE: undefined,
    _SHADOW_MAP_FORMAT: null,
    _SHADOW_MAP_DATA_TYPE: null,

    BLUR_SHADER: undefined,

    init: function()
    {
        HX.HardDirectionalShadowFilter._SHADOW_MAP_FORMAT = HX.GL.RGBA;
        HX.HardDirectionalShadowFilter._SHADOW_MAP_DATA_TYPE = HX.GL.UNSIGNED_INT;
        HX.HardDirectionalShadowFilter._CULL_MODE = HX.CullMode.FRONT;
    },

    getGLSL: function()
    {
        return HX.ShaderLibrary.get("dir_shadow_hard.glsl");
    }
};