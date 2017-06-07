/**
 * A base class for blending morphs. It's often a good idea to create a custom blend mode for performance reasons.
 * It can be interesting to create custom morph nodes for better performance is necessary.
 * @param singular Indicates whether or not the blend node can be rendered straight on top of any other nodes or if it
 * needs to render to its own texture first.
 */
HX.MorphBlendNode = function()
{
    this._valueID = null;
    this._positionTexture = new HX.Texture2D();
    this._positionTexture.filter = HX.TextureFilter.NEAREST_NOMIP;
    this._positionFBO = new HX.FrameBuffer(this._positionTexture);
};

HX.MorphBlendNode.prototype =
{
    // child nodes should ALWAYS be requested to update first
    update: function(dt)
    {
    },

    get positionTexture()
    {
        return this._positionTexture;
    },

    setMesh: function(mesh)
    {
        var srcTex = mesh.baseMorphPositionsTexture;
        this._mesh = mesh;
        this._positionTexture.initEmpty(srcTex.width, srcTex.height, HX_GL.RGBA, HX_GL.FLOAT);
        this._positionFBO.init();
    },

    setValue: function(id, value)
    {
        if (this._valueID === id) {
            this._applyValue(value);
        }
    },   // a node can have a value associated with it, either time, interpolation value, directional value, ...

    // the id used to set values
    get valueID() { return this._valueID; },
    set valueID(value) { this._valueID = value; },

    _applyValue: function(value) {}
};