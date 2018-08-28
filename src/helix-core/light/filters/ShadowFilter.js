import {CullMode, DataType, TextureFilter, TextureFormat} from '../../Helix';

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ShadowFilter()
{
    this._blurShader = null;
    this._numBlurPasses = 1;
    this.cullMode = CullMode.FRONT;
}

ShadowFilter.prototype =
{
    get shadowMapFilter() {
        return TextureFilter.NEAREST_NOMIP
    },

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
        if (this._blurShader)
            this._blurShader = null;
    }
};

export { ShadowFilter };