/**
 * This just contains a static pose.
 * @param positionOrMesh A flat list of floats (3 per coord), or a mesh (that would use the basic pose)
 * @constructor
 */
HX.MorphAdditiveNode = function()
{
    HX.MorphBlendNode.call(this, false);
    if (!HX.MorphAdditiveNode.COPY_SHADER) {
        HX.MorphAdditiveNode.COPY_SHADER = new HX.BlendColorCopyShader();
    }
    this._baseNode = null;
    this._additiveNodes = [];
    this._hasChanged = true;
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
                this._baseNode.setMesh(this._mesh);

            this._hasChanged = true;
        }
    }
});

HX.MorphAdditiveNode.prototype.addAdditiveNode = function(value)
{
    this._additiveNodes.push(value);
    if (this._mesh)
        value.setMesh(this._mesh);

    this._hasChanged = true;
};

HX.MorphAdditiveNode.prototype.setValue = function(id, value)
{
    HX.MorphBlendNode.prototype.setValue.call(this, id, value);

    if (this._baseNode)
        this._baseNode.setValue(id, value);

    for (var i = 0; i < this._additiveNodes.length; ++i)
        this._additiveNodes[i].setValue(id, value);
};

HX.MorphAdditiveNode.prototype.getValueIDs = function(target)
{
    HX.MorphBlendNode.prototype.getValueIDs.call(this, target);

    if (this._baseNode)
        this._baseNode.getValueIDs(target);

    for (var i = 0; i < this._additiveNodes.length; ++i)
        this._additiveNodes[i].getValueIDs(target);

    this._hasChanged = true;
};

HX.MorphAdditiveNode.prototype.setMesh = function(mesh)
{
    HX.MorphBlendNode.prototype.setMesh.call(this, mesh);

    // use base pose if only additive poses were provided
    if (!this._baseNode) this._baseNode = new HX.MorphStaticNode(mesh.baseMorphPose);

    this._baseNode.setMesh(mesh);

    for (var i = 0; i < this._additiveNodes.length; ++i) {
        this._additiveNodes[i].setMesh(mesh);
    }

    this._hasChanged = true;
};

HX.MorphAdditiveNode.prototype.update = function(dt)
{
    var updated = this._baseNode.update(dt) || this._hasChanged;

    for (var i = 0; i < this._additiveNodes.length; ++i)
        updated = this._additiveNodes[i].update(dt) || updated;

    if (!updated) return;

    this._hasChanged = false;

    HX.setRenderTarget(this._pose.positionFBO);
    HX.clear();

    HX.COPY_SHADER.execute(HX.RectMesh.DEFAULT, this._baseNode.pose.positionTexture);

    HX.setBlendState(HX.BlendState.ADD);

    var len = this._additiveNodes.length;
    for (var i = 0; i < len; ++i) {
        var node = this._additiveNodes[i];
        var weight = node._weight;
        if (weight > 0.0) {
            HX.MorphAdditiveNode.COPY_SHADER.setBlendColor(weight, weight, weight, weight);
            HX.MorphAdditiveNode.COPY_SHADER.execute(HX.RectMesh.DEFAULT, this._additiveNodes[i].pose.positionTexture);
        }
    }

    HX.setBlendState(null);
};