/**
 * Base function for basic copies
 * @param fragmentShader The fragment shader to use while copying.
 * @constructor
 */
HX.CustomCopyShader = function(fragmentShader)
{
    HX.Shader.call(this);
    this.init(HX.ShaderLibrary.get("copy_vertex.glsl"), fragmentShader);

    this._textureLocation = HX.GL.getUniformLocation(this._program, "sampler");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.CustomCopyShader.prototype = Object.create(HX.Shader.prototype);

HX.CustomCopyShader.prototype.execute = function(rect, texture)
{
    HX.setDepthTest(HX.DepthTest.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffer.bind();
    rect._indexBuffer.bind();

    this.updateRenderState(null, camera);

    texture.bind(0);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.drawElements(HX.GL.TRIANGLES, 6, 0);
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
 * Copies data in one texture, using a second texture's alpha information
 * @constructor
 */
HX.CopyWithSeparateAlpha = function()
{
    HX.Shader.call(this);
    this.init(HX.ShaderLibrary.get("copy_vertex.glsl"), HX.ShaderLibrary.get("copy_with_separate_alpha_fragment.glsl"));

    this._textureLocation = HX.GL.getUniformLocation(this._program, "sampler");
    this._alphaLocation = HX.GL.getUniformLocation(this._program, "alphaSource");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.useProgram(this._program);
    HX.GL.uniform1i(this._textureLocation, 0);
    HX.GL.uniform1i(this._alphaLocation, 1);
};

HX.CopyWithSeparateAlpha.prototype = Object.create(HX.Shader.prototype);

HX.CopyWithSeparateAlpha.prototype.execute = function(rect, texture, alphaTexture)
{
    HX.setDepthTest(HX.DepthTest.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);

    rect._vertexBuffer.bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);
    alphaTexture.bind(1);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);

    HX.enableAttributes(2);

    HX.drawElements(HX.GL.TRIANGLES, 6, 0);
};

/**
 * Unpack and draw depth values to screen
 */
HX.DebugDepthShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("debug_depth_fragment.glsl"));
};

HX.DebugDepthShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Copies the texture from linear space to gamma space.
 */
HX.ApplyGammaShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("copy_to_gamma_fragment.glsl"));
};

HX.ApplyGammaShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Draw the normals to screen.
 * @constructor
 */
HX.DebugNormalsShader = function()
{
    HX.CustomCopyShader.call(this, HX.ShaderLibrary.get("debug_normals_fragment.glsl"));
};

HX.DebugNormalsShader.prototype = Object.create(HX.CustomCopyShader.prototype);


/**
 * Converts depth buffer values to linear depth values
 */
HX.LinearizeDepthShader = function()
{
    HX.Shader.call(this);

    this.init(HX.ShaderLibrary.get("linearize_depth_vertex.glsl"), HX.ShaderLibrary.get("linearize_depth_fragment.glsl"));

    HX.GL.useProgram(this._program);

    this._textureLocation = HX.GL.getUniformLocation(this._program, "sampler");
    this._rcpFrustumRangeLocation = HX.GL.getUniformLocation(this._program, "hx_rcpCameraFrustumRange");
    this._projectionLocation = HX.GL.getUniformLocation(this._program, "hx_projectionMatrix");
    this._positionAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = HX.GL.getAttribLocation(this._program, "hx_texCoord");

    HX.GL.uniform1i(this._textureLocation, 0);
};

HX.LinearizeDepthShader.prototype = Object.create(HX.Shader.prototype);

HX.LinearizeDepthShader.prototype.execute = function(rect, texture, camera)
{
    HX.setDepthTest(HX.DepthTest.DISABLED);
    HX.setCullMode(HX.CullMode.NONE);
    HX.setBlendState(null);

    rect._vertexBuffer.bind();
    rect._indexBuffer.bind();

    this.updateRenderState(null, camera);

    texture.bind(0);

    HX.GL.vertexAttribPointer(this._positionAttributeLocation, 2, HX.GL.FLOAT, false, 16, 0);
    HX.GL.vertexAttribPointer(this._texCoordAttributeLocation, 2, HX.GL.FLOAT, false, 16, 8);
    HX.GL.uniform1f(this._rcpFrustumRangeLocation, 1.0/(camera.nearDistance - camera.farDistance));
    HX.GL.uniformMatrix4fv(this._projectionLocation, false, camera.getProjectionMatrix()._m);

    HX.enableAttributes(2);

    HX.drawElements(HX.GL.TRIANGLES, 6, 0);
};