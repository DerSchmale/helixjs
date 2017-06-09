/**
 * Base function for basic copies
 * @param fragmentShader The fragment shader to use while copying.
 * @constructor
 */
HX.CustomCopyShader = function(fragmentShader)
{
    HX.Shader.call(this);
    this.init(HX.ShaderLibrary.get("copy_vertex.glsl"), fragmentShader);

    var textureLocation = HX_GL.getUniformLocation(this._program, "sampler");

    this._positionAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX_GL.getAttribLocation(this._program, "hx_texCoord");

    HX_GL.useProgram(this._program);
    HX_GL.uniform1i(textureLocation, 0);
};

HX.CustomCopyShader.prototype = Object.create(HX.Shader.prototype);

HX.CustomCopyShader.prototype.execute = function(rect, texture)
{
    HX.setDepthTest(HX.Comparison.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    HX_GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX_GL.FLOAT, false, 16, 0);
    HX_GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX_GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};



/**
 * Copies one texture's channels (in configurable ways) to another's.
 * @param channel Can be either x, y, z, w or any 4-component swizzle. default is xyzw, meaning a simple copy
 * @constructor
 */
HX.CopyChannelsShader = function(channel, copyAlpha)
{
    channel = channel || "xyzw";
    copyAlpha = copyAlpha === undefined? true : copyAlpha;

    var define = "#define extractChannels(src) ((src)." + channel + ")\n";

    if (copyAlpha) define += "#define COPY_ALPHA\n";

    HX.CustomCopyShader.call(this, define + HX.ShaderLibrary.get("copy_fragment.glsl"));
};

HX.CopyChannelsShader.prototype = Object.create(HX.CustomCopyShader.prototype);



/**
 * Copies one texture's channels while applying the same logic as gl.blendColor. This because it is broken for float textures.
 * @constructor
 */
HX.BlendColorCopyShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("blend_color_copy_fragment.glsl"));
    this._colorLocation = HX_GL.getUniformLocation(this._program, "blendColor");
    this.setBlendColor(1, 1, 1, 1);
};

HX.BlendColorCopyShader.prototype = Object.create(HX.CustomCopyShader.prototype);

HX.BlendColorCopyShader.prototype.setBlendColor = function(r, g, b, a)
{
    HX_GL.useProgram(this._program);
    HX_GL.uniform4f(this._colorLocation, r, g, b, a);
};


/**
 * Copies the texture from linear space to gamma space.
 */
HX.ApplyGammaShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("copy_to_gamma_fragment.glsl"));
};

HX.ApplyGammaShader.prototype = Object.create(HX.CustomCopyShader.prototype);