// Should be childed to the same model instance to which the skeleton belongs
HX.JointLinkNode = function(joint)
{
    HX.SceneNode.call(this);
    this._joint = joint;
    this._jointIndex = -1;
};

HX.JointLinkNode.prototype = Object.create(HX.SceneNode.prototype, {
    joint: {
        get: function()
        {
            return this._joint;
        },

        set: function(value)
        {
            this._joint = value;
            if (this._scene)
                this._updateJointIndex();
        }
    },

    // the actual matrix is always invalid

    worldMatrix: {
        get: function()
        {
            if (this._jointIndex < 0)
                return this._parent.worldMatrix;

            return this.parent.skeletonMatrices[this._jointIndex];
        }
    }
});

HX.JointLinkNode.prototype.acceptVisitor = function(visitor)
{
    this._updateWorldMatrix();
};

HX.JointLinkNode.prototype._setScene = function(scene)
{
    // this means it has a parent now
    if (scene)
        this._updateJointIndex();
    else
        this._jointIndex = -1;
};

HX.JointLinkNode.prototype._updateJointIndex = function()
{
    if (!(this._parent instanceof HX.ModelInstance))
        throw new Error("JointLinkNode must be added to a ModelInstance!");

    this._jointIndex = this._parent.model.skeleton._joints.indexOf(this._joint);

    if (this._jointIndex < 0)
        throw new Error("Provided joint does not belong to the parent ModelInstance!");
}