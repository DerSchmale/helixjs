/**
 * This just contains a static pose.
 * @param positionOrMesh A flat list of floats (3 per coord), or a mesh (that would use the basic pose)
 * @constructor
 */
HX.MorphAdditiveNode = function()
{
    HX.MorphBlendNode.call(this, false);
    this._baseNode = null;
    this._additiveNodes = [];
    this._copyTextureShader = new HX.CopyChannelsShader();
};

HX.MorphAdditiveNode.prototype = Object.create(HX.MorphBlendNode.prototype,
{
    baseNode: {
        get: function()
        {
            return this._baseNode;
        },

        set: function(value)
        {
            this._baseNode = value;
            if (this._mesh)
                this._additiveNodes.setMesh(this._mesh);
        }
    }
});

HX.MorphAdditiveNode.prototype.addAdditiveNode = function(value)
{
    this._additiveNodes.push(value);
    if (this._mesh)
        value.setMesh(this._mesh);
};

HX.MorphAdditiveNode.prototype.setMesh = function(mesh)
{
    // use base pose if only additive poses were provided
    if (!this._baseNode) this._baseNode = new HX.MorphStaticNode(mesh);

    this._baseNode.setMesh(mesh);

    for (var i = 0; i < this._additiveNodes.length; ++i) {
        this._additiveNodes[i].setMesh(mesh);
    }
};

HX.MorphAdditiveNode.prototype.update = function(dt)
{
    this._baseNode.update(dt);

    for (var i = 0; i < this._additiveNodes.length; ++i)
        this._additiveNodes[i].update(dt);

    HX.setRenderTarget(this._positionFBO);
    this._copyTextureShader.execute(HX.RectMesh.DEFAULT, this._baseNode.positionTexture);

    HX.setBlendState(HX.BlendState.ADD);
    var len = this._additiveNodes.length;
    for (var i = 0; i < len; ++i) {
        var node = this._additiveNodes[i];
        if (node._weight > 0.0) {
            HX_GL.blendColor(1.0, 1.0, 1.0, node._weight);
            this._copyTextureShader.execute(HX.RectMesh.DEFAULT, this._additiveNodes[i].positionTexture);
        }
    }

    HX_GL.blendColor(1.0, 1.0, 1.0, 1.0);

    HX.setBlendState(null);
};