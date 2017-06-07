/**
 *
 * @constructor
 */
HX.MorphAnimation = function()
{
    HX.Component.call(this);

    this._blendTree = new HX.MorphBlendTree();
};

HX.MorphAnimation.prototype = Object.create(HX.Component.prototype,
    {

    }
);

HX.MorphAnimation.prototype.getAnimationNode = function(meshIndex)
{
    return this._blendTree.rootNode;
};

HX.MorphAnimation.prototype.setAnimationNode = function(meshIndex, value)
{
    this._blendTree.setRootNode(meshIndex, value);
};

HX.MorphAnimation.prototype.onAdded = function()
{
    for (var i = 0; i < this.entity.numMeshInstances; ++i) {
        var meshInstance = this.entity.getMeshInstance(i);
        var tex = this._blendTree.getPositionsTexture(i);
        if (tex)
            meshInstance.morphPositionsTexture = tex;
    }
};

HX.MorphAnimation.prototype.onRemoved = function()
{
    // reset base morph positions
    for (var i = 0; i < this.entity.numMeshInstances; ++i) {
        var meshInstance = this.entity.getMeshInstance(i);
        meshInstance.morphPositionsTexture = meshInstance.mesh.baseMorphPositionsTexture;
    }
};

HX.MorphAnimation.prototype.onUpdate = function(dt)
{
    this._blendTree.update(dt);
};