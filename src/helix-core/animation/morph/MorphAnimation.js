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

HX.MorphAnimation.prototype.setValue = function(id, value)
{
    this._blendTree.setValue(id, value);
};

HX.MorphAnimation.prototype.getValueIDs = function()
{
    return this._blendTree.getValueIDs();
};

HX.MorphAnimation.prototype.getAnimationNode = function(meshIndex)
{
    return this._blendTree.getRootNode(meshIndex);
};

HX.MorphAnimation.prototype.setAnimationNode = function(meshIndex, value)
{
    this._blendTree.setRootNode(meshIndex, value);
};

HX.MorphAnimation.prototype.onAdded = function()
{
    this._blendTree.setModel(this.entity.model);

    for (var i = 0; i < this.entity.numMeshInstances; ++i) {
        var meshInstance = this.entity.getMeshInstance(i);
        var pose = this._blendTree.getPose(i);
        if (pose)
            meshInstance.morphPose = pose;
    }
};

HX.MorphAnimation.prototype.onRemoved = function()
{
    // reset base morph positions
    for (var i = 0; i < this.entity.numMeshInstances; ++i) {
        var meshInstance = this.entity.getMeshInstance(i);
        meshInstance.morphPose = meshInstance.mesh.baseMorphPose;
    }
};

HX.MorphAnimation.prototype.onUpdate = function(dt)
{
    this._blendTree.update(dt);

    for (var i = 0; i < this.entity.numMeshInstances; ++i) {
        var meshInstance = this.entity.getMeshInstance(i);
        var pose = this._blendTree.getPose(i);
        if (pose)
            meshInstance.morphPose = pose;
    }
};