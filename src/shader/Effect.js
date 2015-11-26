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
    this.setMesh(HX.DEFAULT_RECT_MESH);

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
    this._shader.updateRenderState(null, renderer._camera);

    HX.MaterialPass.prototype.updateRenderState.call(this, renderer);

    this._mesh._vertexBuffer.bind();
    this._mesh._indexBuffer.bind();

    var layout = this._vertexLayout;
    var attributes = layout.attributes;
    var len = attributes.length;

    for (var i = 0; i < len; ++i) {
        var attribute = attributes[i];
        HX.GL.vertexAttribPointer(attribute.index, attribute.numComponents, HX.GL.FLOAT, false, attribute.stride, attribute.offset);
    }

    HX.enableAttributes(layout._numAttributes);
};


/**
 *
 * @constructor
 */
HX.Effect = function()
{
    this._isSupported = true;
    this._mesh = null;
    this._hdrSourceIndex = -1;
    this._outputsGamma = false;
};

HX.Effect.prototype =
{
    isSupported: function()
    {
        return this._isSupported;
    },

    render: function(renderer, dt)
    {
        this._renderer = renderer;
        this._hdrSourceIndex = renderer._hdrSourceIndex;
        this._hdrTargets = renderer._hdrTargets;

        this.draw(dt);

        return this._hdrSourceIndex;
    },

    /**
     * Gets the render target if we can blend with it.
     */
    _getCurrentBackBufferFBO: function()
    {
        return this._hdrTargets[this._hdrSourceIndex];
    },

    /**
     * returns the render target if we need to ping pong (typically when hx_backbuffer is used in the shader).
     */
    _getPingPongBackBufferFBO: function()
    {
        return this._hdrTargets[1 - this._hdrSourceIndex];
    },

    draw: function(dt)
    {
        throw "Abstract method error!";
    },

    /**
     * A convenience method for effects that only ping-pong between full resolution buffers
     */
    _drawFullResolutionPingPong: function(passes)
    {
        // the default just swap between two hdr buffers
        var len = this._passes.length;

        for (var i = 0; i < len; ++i) {
            HX.swapRenderTarget(this._getPingPongBackBufferFBO());
            this._drawPass(passes[i]);
            this._swapHDRBuffers();
        }
    },

    _drawPass: function(pass)
    {
        pass.updateRenderState(this._renderer);
        HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
    },

    _swapHDRBuffers: function()
    {
        this._hdrSourceIndex = 1 - this._hdrSourceIndex;
    }
};