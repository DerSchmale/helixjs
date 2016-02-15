HX.ShadowFilter = function()
{
    this._blurShader = null;
    this._numBlurPasses = 1;
};

HX.ShadowFilter.prototype =
{
    getShadowMapFormat: function()
    {
        return HX.GL.RGBA;
    },

    getShadowMapDataType: function()
    {
        return HX.GL.UNSIGNED_BYTE;
    },

    getGLSL: function()
    {
        throw new Error("Abstract method called");
    },

    getCullMode: function()
    {
        return HX.CullMode.BACK;
    },

    get blurShader()
    {
        if (!this._blurShader)
            this._blurShader = this._createBlurShader();

        return this._blurShader;
    },

    get numBlurPasses()
    {
        return this._numBlurPasses;
    },

    init: function()
    {

    },

    _createBlurShader: function()
    {

    },

    _invalidateBlurShader: function()
    {
        this._blurShader.dispose();
        this._blurShader = null;
    }
};