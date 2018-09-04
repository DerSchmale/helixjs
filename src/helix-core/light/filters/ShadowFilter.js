import {CullMode, DataType, TextureFilter, TextureFormat} from '../../Helix';

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ShadowFilter()
{
    this._blurShader = null;
    this.numBlurPasses = 1;
}

ShadowFilter.prototype =
{
	getCullMode: function()
    {
        return CullMode.FRONT;
    },

    getShadowMapFilter: function()
    {
		return TextureFilter.NEAREST_NOMIP;
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