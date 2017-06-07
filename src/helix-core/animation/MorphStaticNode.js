/**
 * This just contains a static pose.
 * @param positionOrMesh A flat list of floats (3 per coord), or a mesh (that would use the basic pose)
 * @constructor
 */
HX.MorphStaticNode = function(positionOrMesh)
{
    HX.MorphBlendNode.call(this);

    // the weight is only used if this node is additive. It's placed here to be able to link the weight with the node value ID
    // TODO: Consider changing this, by setting the weights in the parent and allowing multiple values to be registered per node
    this._weight = 0.0;

    if (positionOrMesh instanceof HX.Mesh)
        this._positionTexture = positionOrMesh.baseMorphPositionsTexture;
    else
        this._initPositions(positionOrMesh);
};

HX.MorphStaticNode.prototype = Object.create(HX.MorphStaticNode, {
    weight: {
        get: function()
        {
            return this._weight;
        },

        set: function(value)
        {
            this._weight = value;
        }
    }
});

HX.MorphStaticNode.prototype._initPositions = function(positions)
{
    var data = [];
    var p = 0;
    var i = 0;
    while (i < positions.length) {
        data[p++] = positions[i++];
        data[p++] = positions[i++];
        data[p++] = positions[i++];
        data[p++] = 1.0;
    }

    var len = this._positionTexture.width * this._positionTexture.height * 4;
    while (p < len) {
        data[p++] = 0.0;
        data[p++] = 0.0;
        data[p++] = 0.0;
        data[p++] = 0.0;
    }
    this._positionTexture.uploadData(new Float32Array(data), this._positionTexture.width, this._positionTexture.height, false, HX_GL.RGBA, HX_GL.FLOAT);
};

    // child nodes should ALWAYS be requested to update first
HX.MorphStaticNode.prototype.setMesh = function(mesh)
{
    var srcTex = mesh.baseMorphPositionsTexture;
    if (srcTex.width !== this._positionTexture.width || srcTex.height !== this._positionTexture.height)
        throw new Error("Morph count mismatch! Be sure that the morph targets match the mesh.");
};

HX.MorphStaticNode.prototype._applyValue = function(value)
{
    this._weight = value;
};
