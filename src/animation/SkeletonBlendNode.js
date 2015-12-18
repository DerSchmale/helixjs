/**
 *
 * @constructor
 */
HX.SkeletonBlendNode = function()
{
    this._rootJointDeltaPosition = new HX.Float4();
    this._valueID = null;
    this._poseInvalid = true;
    this._parentNode = null;
    this._pose = new HX.SkeletonPose();
    this._rootPosition = new HX.Float4();
};

HX.SkeletonBlendNode.prototype =
{
    // child nodes should ALWAYS be requested to update first
    update: function(dt)
    {
        if (this._poseInvalid) {
            this._updatePose(dt);
            this._poseInvalid = false;
        }
    },

    setValue: function(id, value) {},   // a node can have a value associated with it, either time, interpolation value, directional value, ...

    get rootJointDeltaPosition() { return this._rootJointDeltaPosition; },
    get duration() { return -1; },
    get numJoints() { return -1; },

    // the id used to set values
    get valueID() { return this._valueID; },
    set valueID(value) { this._valueID = value; },

    _invalidatePose: function()
    {
        this._poseInvalid = true;
        if (this._parentNode) this._parentNode._invalidatePose();
    },

    _updatePose: function(dt) {}
};