import { CullMode, DataType, TextureFormat } from '../Helix';
import { Signal } from '../core/Signal';

function ShadowFilter()
{
    this._blurShader = null;
    this._numBlurPasses = 1;
    this.onShaderInvalid = new Signal();
}

ShadowFilter.prototype =
{
    getShadowMapFormat: function()
    {
        return TextureFormat.RGBA;
    },

    getShadowMapDataType: function()
    {
        return DataType.UNSIGNED_BYTE;
    },

    getGLSL: function()
    {
        throw new Error("Abstract method called");
    },

    getCullMode: function()
    {
        return CullMode.BACK;
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
        if (this._blurShader) {
            this._blurShader.dispose();
            this._blurShader = null;
        }
    }
};

export { ShadowFilter };