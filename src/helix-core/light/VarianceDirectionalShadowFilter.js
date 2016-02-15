HX.VarianceDirectionalShadowFilter = function()
{
    HX.ShadowFilter.call(this);
    this._blurRadius = 2;
    this._lightBleedReduction = .35;
};

HX.VarianceDirectionalShadowFilter.prototype = Object.create(HX.ShadowFilter.prototype,
    {
        blurRadius: {
            get: function()
            {
                return this._blurRadius;
            },

            set: function(value)
            {
                this._blurRadius = value;
                this._invalidateBlurShader();
            }
        },

        lightBleedReduction: {
            get: function()
            {
                return this._lightBleedReduction;
            },

            set: function(value)
            {
                this._lightBleedReduction = value;
                this.onShaderInvalid.dispatch();
            }
        }
    });

HX.VarianceDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return HX.ShaderLibrary.get("dir_shadow_vsm.glsl", defines);
};

HX.VarianceDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new HX.VSMBlurShader(this._blurRadius);
};

HX.VarianceDirectionalShadowFilter.prototype._getDefines = function()
{
    var range = 1.0 - this._lightBleedReduction;
    return {
        HX_VSM_MIN_VARIANCE: .0001,
        HX_VSM_LIGHT_BLEED_REDUCTION: "float(" + this._lightBleedReduction + ")",
        HX_VSM_LIGHT_BLEED_REDUCTION_RANGE: "float(" + range + ")"
    };
};

/**
 * Base function for basic copies
 * @param fragmentShader The fragment shader to use while copying.
 * @constructor
 */
HX.VSMBlurShader = function(blurRadius)
{
    HX.Shader.call(this);

    var defines = {
        RADIUS: blurRadius,
        RCP_NUM_SAMPLES: "float(" + (1.0 / (1.0 + 2.0 * blurRadius)) + ")"
    };

    var vertex = HX.ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment = HX.ShaderLibrary.get("vsm_blur_fragment.glsl", defines);

    this.init(vertex, fragment);

    this._textureLocation = HX.GL.getUniformLocation(this._program, "source");
    this._directionLocation = HX.GL.getUniformLocation(this._program, "direction");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.VSMBlurShader.prototype = Object.create(HX.Shader.prototype);

HX.VSMBlurShader.prototype.execute = function(rect, texture, dirX, dirY)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.GL.uniform2f(this._directionLocation, dirX, dirY);

    HX.drawElements(HX.GL.TRIANGLES, 6, 0);
};