HX.PCFDirectionalShadowFilter = function()
{
    HX.ShadowFilter.call(this);
    this._numShadowSamples = 6;
    this._dither = false;
};

HX.PCFDirectionalShadowFilter.prototype = Object.create(HX.ShadowFilter.prototype,
    {
        numShadowSamples: {
            get: function()
            {
                return this._numShadowSamples;
            },

            set: function(value)
            {
                if (this._numShadowSamples !== value) {
                    this._numShadowSamples = value;
                    this.onShaderInvalid.dispatch();
                }
            }
        },

        dither: {
            get: function()
            {
                return this._dither;
            },

            set: function(value)
            {
                if (this._dither !== value) {
                    this._dither = value;
                    this.onShaderInvalid.dispatch();
                }
            }
        }
    }
);

HX.PCFDirectionalShadowFilter.prototype.getCullMode = function()
{
    return HX.CullMode.FRONT;
};

HX.PCFDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = {
        NUM_SHADOW_SAMPLES: this._numShadowSamples
    };

    if (this._dither)
        defines.HX_PCF_DITHER_SHADOWS = 1;

    return HX.ShaderLibrary.get("dir_shadow_soft.glsl", defines);
};