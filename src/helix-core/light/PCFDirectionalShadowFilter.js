HX.PCFDirectionalShadowFilter = function()
{
    HX.ShadowFilter.call(this);
    this._softness = .01;
    this._numShadowSamples = 6;
    this._dither = false;
};

HX.PCFDirectionalShadowFilter.prototype = Object.create(HX.ShadowFilter.prototype,
    {
        softness: {
            get: function()
            {
                return this._softness;
            },

            set: function(value)
            {
                if (this._softness !== value) {
                    this._softness = value;
                    this.onShaderInvalid.dispatch();
                }
            }
        },

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
        HX_PCF_NUM_SHADOW_SAMPLES: this._numShadowSamples,
        HX_PCF_RCP_NUM_SHADOW_SAMPLES: "float(" + ( 1.0 / this._numShadowSamples ) + ")",
        HX_PCF_SOFTNESS: this._softness
    };

    if (this._dither)
        defines.HX_PCF_DITHER_SHADOWS = 1;

    return HX.ShaderLibrary.get("dir_shadow_pcf.glsl", defines);
};