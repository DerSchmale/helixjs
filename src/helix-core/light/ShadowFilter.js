HX.ShadowFilter = function()
{
    this._blurShader = null;
    this._numBlurPasses = 1;
    this.onShaderInvalid = new HX.Signal();
};

HX.ShadowFilter.prototype =
{
    getShadowMapFormat: function()
    {
        return HX_GL.RGBA;
    },

    getShadowMapDataType: function()
    {
        return HX_GL.UNSIGNED_BYTE;
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

    // only for those methods that use a blurShader
    get numBlurPasses()
    {
        return this._numBlurPasses;
    },

    set numBlurPasses(value)
    {
        this._numBlurPasses = value;
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