/**
 * This just contains a static pose.
 * @param positionOrMesh A flat list of floats (3 per coord + 1 mask value), or a mesh (that would use the basic pose)
 * @constructor
 */
HX.MorphStaticNode = function(pose)
{
    HX.MorphBlendNode.call(this, pose);

    // the weight is only used if this node is additive. It's placed here to be able to link the weight with the node value ID
    // TODO: Consider changing this, by setting the weights in the parent and allowing multiple values to be registered per node
    this._weight = 0.0;
    this._hasChanged = true;

    this._pose = pose;
};

HX.MorphStaticNode.prototype = Object.create(HX.MorphBlendNode.prototype, {
    weight: {
        get: function()
        {
            return this._weight;
        },

        set: function(value)
        {
            if (value !== this._weight)
                this._hasChanged = true;
            this._weight = value;
        }
    }
});

HX.MorphStaticNode.prototype.update = function(dt)
{
    // notify parent using the weight that it has changed
    var hasChanged = this._hasChanged;
    this._hasChanged = false;
    return hasChanged;
};

HX.MorphStaticNode.prototype.setMesh = function(mesh)
{
    if (this._pose.numVertices !== mesh.numVertices)
        throw new Error("Incompatible morph targets (pose vertex count mismatch).");
};

HX.MorphStaticNode.prototype._applyValue = function(value)
{
    this.weight = value;
};
