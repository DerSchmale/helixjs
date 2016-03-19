/**
 * @constructor
 */
HX.EffectPass = function(vertexShader, fragmentShader)
{
    vertexShader = vertexShader || HX.ShaderLibrary.get("default_post_vertex.glsl");
    var shader = new HX.Shader(vertexShader, fragmentShader);
    HX.MaterialPass.call(this, shader);
    this._uniformSetters = HX.UniformSetter.getSetters(this._shader);
    this._gbuffer = null;
    this._vertexLayout = null;
    this._cullMode = HX.CullMode.NONE;
    this._depthTest = HX.Comparison.DISABLED;
    this.setMesh(HX.RectMesh.DEFAULT);

    this.setTexture("hx_dither2D", HX.DEFAULT_2D_DITHER_TEXTURE);
};

HX.EffectPass.prototype = Object.create(HX.MaterialPass.prototype);

HX.EffectPass.prototype.setMesh = function(mesh)
{
    if (this._mesh === mesh) return;
    this._mesh = mesh;
    this._vertexLayout = new HX.VertexLayout(this._mesh, this);
};

HX.EffectPass.prototype.updateRenderState = function(renderer)
{
    this._shader.updateRenderState(renderer._camera);

    HX.MaterialPass.prototype.updateRenderState.call(this, renderer);

    this._mesh._vertexBuffers[0].bind();
    this._mesh._indexBuffer.bind();

    var layout = this._vertexLayout;
    var attributes = layout.attributes;
    var len = attributes.length;

    for (var i = 0; i < len; ++i) {
        var attribute = attributes[i];
        HX_GL.vertexAttribPointer(attribute.index, attribute.numComponents, HX_GL.FLOAT, false, attribute.stride, attribute.offset);
    }

    HX.enableAttributes(layout._numAttributes);
};


/**
 *
 * @constructor
 */
HX.Effect = function()
{
    HX.Component.call(this);
    this._isSupported = true;
    this._mesh = null;
    this._outputsGamma = false;
};

HX.Effect.prototype = Object.create(HX.Component.prototype);

HX.Effect.prototype.isSupported = function()
{
    return this._isSupported;
};

HX.Effect.prototype.render = function(renderer, dt)
{
    this._renderer = renderer;
    this.draw(dt);
};

HX.Effect.prototype.draw = function(dt)
{
    throw new Error("Abstract method error!");
};

HX.Effect.prototype._drawPass = function(pass)
{
    pass.updateRenderState(this._renderer);
    HX.drawElements(HX_GL.TRIANGLES, 6, 0);
};

HX.Effect.prototype.onAdded = function()
{
    this._entity._registerEffect(this);
};

HX.Effect.prototype.onRemoved = function()
{
    this._entity._unregisterEffect(this);
};

/**
 * Used when we need to current render target as a source.
 */
HX.Effect.prototype._swapHDRBuffers = function()
{
    this._renderer._swapHDRFrontAndBack();
};