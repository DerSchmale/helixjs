/**
 *
 * @constructor
 */
HX.SkeletonBlendNode = function()
{
    this._rootJointDeltaPosition = new HX.Float4();
    this._valueID = null;
    this._pose = new HX.SkeletonPose();
    this._rootPosition = new HX.Float4();
};

HX.SkeletonBlendNode.prototype =
{
    // child nodes should ALWAYS be requested to update first
    update: function(dt)
    {
    },

    setValue: function(id, value)
    {
        if (this._valueID == id) {
            this._applyValue(value);
        }
    },   // a node can have a value associated with it, either time, interpolation value, directional value, ...

    get rootJointDeltaPosition() { return this._rootJointDeltaPosition; },
    get numJoints() { return -1; },

    // the id used to set values
    get valueID() { return this._valueID; },
    set valueID(value) { this._valueID = value; },

    _applyValue: function(value) {}
};