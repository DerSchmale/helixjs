// highly experimental
HX.ExponentialDirectionalShadowFilter = function()
{
    HX.ShadowFilter.call(this);
    this._expScaleFactor = 80;
    this._blurRadius = 1;
    this._darkeningFactor = .35;
};


HX.ExponentialDirectionalShadowFilter.prototype = Object.create(HX.ShadowFilter.prototype,
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

        darkeningFactor: {
            get: function()
            {
                return this._darkeningFactor;
            },

            set: function(value)
            {
                this._darkeningFactor = value;
                // TODO: dispatch change event
            }
        },

        // not recommended to change
        expScaleFactor: {
            get: function()
            {
                return this._expScaleFactor;
            },

            set: function(value)
            {
                this._expScaleFactor = value;
                // TODO: dispatch change event
            }
        }
    });

HX.ExponentialDirectionalShadowFilter.prototype.getShadowMapFormat = function()
{
    return HX.GL.RGB;
};

HX.ExponentialDirectionalShadowFilter.prototype.getShadowMapDataType = function()
{
    return HX.GL.FLOAT;
};

HX.ExponentialDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return HX.ShaderLibrary.get("dir_shadow_esm.glsl", defines);
};

HX.ExponentialDirectionalShadowFilter.prototype._getDefines = function()
{
    return {
        HX_ESM_CONSTANT: "float(" + this._expScaleFactor + ")",
        HX_ESM_DARKENING: "float(" + this._darkeningFactor + ")"
    };
};

HX.ExponentialDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new HX.ESMBlurShader(this._blurRadius);
};

HX.ESMBlurShader = function(blurRadius)
{
    HX.Shader.call(this);

    var defines = {
        RADIUS: blurRadius,
        RCP_NUM_SAMPLES: "float(" + (1.0 / (1.0 + 2.0 * blurRadius)) + ")"
    };

    var vertex = HX.ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment = HX.ShaderLibrary.get("esm_blur_fragment.glsl", defines);

    this.init(vertex, fragment);

    this._textureLocation = HX.GL.getUniformLocation(this._program, "source");
    this._directionLocation = HX.GL.getUniformLocation(this._program, "direction");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.ESMBlurShader.prototype = Object.create(HX.Shader.prototype);

HX.ESMBlurShader.prototype.execute = function(rect, texture, dirX, dirY)
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