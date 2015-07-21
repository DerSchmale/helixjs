/**
 *
 * @constructor
 */
HX.CopyTexturePass = function()
{
    HX.EffectPass.call(this, null, HX.CopyTexturePass._fragmentShader);
};

HX.CopyTexturePass.prototype = Object.create(HX.EffectPass.prototype);

HX.CopyTexturePass.prototype.setSourceTexture = function(value)
{
    this.setTexture("sourceTexture", value);
};

HX.CopyTexturePass._fragmentShader =
    "varying vec2 uv;\n\
    \n\
    uniform sampler2D sourceTexture;\n\
    \n\
    void main()\n\
    {\n\
        gl_FragColor = texture2D(sourceTexture, uv);\n\
    }";