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
    this._sourceSlot = this.getTextureSlot("hx_source");
};

HX.EffectPass.prototype = Object.create(HX.MaterialPass.prototype);

HX.EffectPass.prototype.setMesh = function(mesh)
{
    if (this._mesh === mesh) return;
    this._mesh = mesh;
    this._vertexLayout = new HX.VertexLayout(this._mesh, this);
};

HX.EffectPass.prototype.updateRenderState = function(renderer, source)
{
    this._shader.updateRenderState(null, renderer._camera);

    if (this._sourceSlot)
        this._sourceSlot.texture = source;

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
    this._opaquePasses = [];
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

    getPass: function (index)
    {
        return this._opaquePasses[index];
    },

    render: function(renderer, dt)
    {
        this._renderer = renderer;
        this._hdrSourceIndex = renderer._hdrSourceIndex;
        this._hdrSources = renderer._hdrBuffers;
        this._hdrTargets = renderer._hdrTargets;

        this._hdrSource = this._hdrSources[this._hdrSourceIndex];
        this._hdrTarget = this._hdrTargets[1 - this._hdrSourceIndex];

        this.draw(dt);

        return this._hdrSourceIndex;
    },

    draw: function(dt)
    {
        // the default just swap between two hdr buffers
        var len = this._opaquePasses.length;

        for (var i = 0; i < len; ++i) {
            HX.setRenderTarget(this._hdrTarget);
            this._drawPass(this._opaquePasses[i]);
            this._swapHDRBuffers();
        }
    },

    _drawPass: function(pass)
    {
        pass.updateRenderState(this._renderer, this._hdrSource);
        HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);
    },

    _swapHDRBuffers: function()
    {
        this._hdrTarget = this._hdrTargets[this._hdrSourceIndex];
        this._hdrSourceIndex = 1 - this._hdrSourceIndex;
        this._hdrSource = this._hdrSources[this._hdrSourceIndex];
    },

    removePass: function(pass)
    {
        var index = this._opaquePasses.indexOf(pass);
        this._opaquePasses.splice(index, 1);
    },

    addPass: function (pass)
    {
        this._opaquePasses.push(pass);
    },

    numPasses: function()
    {
        return this._opaquePasses.length;
    },

    setUniform: function(name, value)
    {
        var len = this._opaquePasses.length;

        for (var i = 0; i < len; ++i) {
            if (this._opaquePasses[i])
                this._opaquePasses[i].setUniform(name, value);
        }
    }
};