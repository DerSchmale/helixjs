HX.ExponentialDirectionalShadowFilter =
{
    _CONSTANT: 80,
    _CULL_MODE: undefined,
    _BLUR_SHADER: undefined,
    _BLUR_RADIUS: 1,
    _SHADOW_MAP_FORMAT: null,
    _SHADOW_MAP_DATA_TYPE: null,

    NUM_BLUR_PASSES: 1,
    DARKENING_FACTOR: .3,

    init: function()
    {
        var defines = HX.ExponentialDirectionalShadowFilter._getDefines();

        // ESM is pointless if float is not supported
        HX.ExponentialDirectionalShadowFilter._SHADOW_MAP_FORMAT = HX.GL.RGB;
        HX.ExponentialDirectionalShadowFilter._SHADOW_MAP_DATA_TYPE = HX.GL.FLOAT;
        HX.ExponentialDirectionalShadowFilter._BLUR_SHADER = new HX.ESMBlurShader(defines);
        HX.ExponentialDirectionalShadowFilter._CULL_MODE = HX.CullMode.BACK;
    },

    getGLSL: function()
    {
        var defines = HX.ExponentialDirectionalShadowFilter._getDefines();
        return HX.ShaderLibrary.get("dir_shadow_esm.glsl", defines);
    },

    _getDefines: function()
    {
        return {
            HX_ESM_CONSTANT: "float(" + HX.ExponentialDirectionalShadowFilter._CONSTANT + ")",
            HX_MAX_ESM_VALUE: "float(" + Math.exp(HX.ExponentialDirectionalShadowFilter._CONSTANT) + ")",
            HX_ESM_DARKENING: "float(" + HX.ExponentialDirectionalShadowFilter.DARKENING_FACTOR + ")"
        };
    }
};

/**
 * Base function for basic copies
 * @param fragmentShader The fragment shader to use while copying.
 * @constructor
 */
HX.ESMBlurShader = function(defines)
{
    HX.Shader.call(this);

    defines.RADIUS = HX.ExponentialDirectionalShadowFilter._BLUR_RADIUS;
    defines.RCP_NUM_SAMPLES = "float(" + (1.0 / (1.0 + 2.0 * HX.ExponentialDirectionalShadowFilter._BLUR_RADIUS)) + ")";

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