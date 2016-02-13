HX.HardDirectionalShadowModel =
{
    _CULL_MODE: undefined,

    BLUR_SHADER: undefined,

    init: function()
    {
        HX.HardDirectionalShadowModel._CULL_MODE = HX.CullMode.FRONT;
    },

    getGLSL: function()
    {
        return HX.ShaderLibrary.get("dir_shadow_hard.glsl");
    }
};