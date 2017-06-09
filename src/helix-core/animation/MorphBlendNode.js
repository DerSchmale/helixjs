/**
 * A base class for blending morphs. It's often a good idea to create a custom blend mode for performance reasons.
 * It can be interesting to create custom morph nodes for better performance is necessary.
 * @param singular Indicates whether or not the blend node can be rendered straight on top of any other nodes or if it
 * needs to render to its own texture first.
 */
HX.MorphBlendNode = function()
{
    this._valueID = null;
};

HX.MorphBlendNode.prototype =
{
    getValueIDs: function(target)
    {
        if (this._valueID && target.indexOf(this._valueID) < 0)
            target.push(this._valueID);
    },

    /**
     * Updates the state of the animation. Child nodes should ALWAYS be requested to update first.
     * @param dt The amount of milliseconds passed since the last call.
     * @returns {boolean} Whether or not the state of this node (or any of its children).
     */
    update: function(dt)
    {
        return false;
    },

    get pose()
    {
        return this._pose;
    },

    setMesh: function(mesh)
    {
        if (!mesh.hasMorphData)
            throw new Error("Trying to add vertex morphing for a mesh without morph data!");

        this._pose = mesh.baseMorphPose.clone();
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