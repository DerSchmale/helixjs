HX.VarianceDirectionalShadowFilter =
{
    _CULL_MODE: undefined,
    _BLUR_SHADER: undefined,
    _BLUR_RADIUS: 2,
    _SHADOW_MAP_FORMAT: null,
    _SHADOW_MAP_DATA_TYPE: null,

    NUM_BLUR_PASSES: 1,
    MIN_VARIANCE: .0001,
    LIGHT_BLEED_REDUCTION: .35,

    init: function()
    {
        var defines = HX.VarianceDirectionalShadowFilter._getDefines();

        HX.VarianceDirectionalShadowFilter._SHADOW_MAP_FORMAT = HX.GL.RGBA;
        HX.VarianceDirectionalShadowFilter._SHADOW_MAP_DATA_TYPE = HX.GL.UNSIGNED_BYTE;
        HX.VarianceDirectionalShadowFilter._BLUR_SHADER = new HX.VarianceBlurShader(defines);
        HX.VarianceDirectionalShadowFilter._CULL_MODE = HX.CullMode.BACK;
    },

    getGLSL: function()
    {
        var defines = HX.VarianceDirectionalShadowFilter._getDefines();
        return HX.ShaderLibrary.get("dir_shadow_vsm.glsl", defines);
    },

    _getDefines: function()
    {
        return {
            HX_VSM_MIN_VARIANCE: "float(" + HX.VarianceDirectionalShadowFilter.MIN_VARIANCE + ")",
            HX_VSM_LIGHT_BLEED_REDUCTION: "float(" + HX.VarianceDirectionalShadowFilter.LIGHT_BLEED_REDUCTION + ")"
        };
    }
};

/**
 * Base function for basic copies
 * @param fragmentShader The fragment shader to use while copying.
 * @constructor
 */
HX.VarianceBlurShader = function(defines)
{
    HX.Shader.call(this);

    defines.RADIUS = HX.VarianceDirectionalShadowFilter._BLUR_RADIUS;
    defines.RCP_NUM_SAMPLES = "float(" + (1.0 / (1.0 + 2.0 * HX.VarianceDirectionalShadowFilter._BLUR_RADIUS)) + ")";

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

HX.VarianceBlurShader.prototype = Object.create(HX.Shader.prototype);

HX.VarianceBlurShader.prototype.execute = function(rect, texture, dirX, dirY)
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