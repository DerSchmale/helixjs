/**
 *
 * @constructor
 */
HX.SkeletonBinaryLerpNode = function()
{
    HX.SkeletonBlendNode.call(this);
    this._value = 0;
    this._child1 = null;
    this._child2 = null;
    this._minValue = 0;
    this._maxValue = 1;
    this._numJoints = 0;
};

HX.SkeletonBinaryLerpNode.prototype =
{
    get minValue()
    {
        return this._minValue;
    },

    set minValue(value)
    {
        this._minValue = value;
    },

    get maxValue()
    {
        return this._maxValue;
    },

    set maxValue(value)
    {
        this._maxValue = value;
    },

    get value()
    {
        return this._value;
    },

    set value(v)
    {
        v = HX.clamp(v, this._minValue, this._maxValue)
        if (this._value !== v)
            this._valueChanged = true;
        this._value = v;
        this._t = (this._value - this._minValue) / (this._maxValue - this._minValue);
    },

    get child1()
    {
        return this._child1;
    },

    set child1(value)
    {
        this._child1 = value;
        if (this._child2 && value.numJoints !== this._child2.numJoints) throw new Error("Incompatible child nodes (numJoints mismatch)!");
        this._numJoints = value.numJoints;
    },

    get child2()
    {
        return this._child2;
    },

    set child2(value)
    {
        this._child2 = value;
        if (this._child1 && value.numJoints !== this._child1.numJoints) throw new Error("Incompatible child nodes (numJoints mismatch)!");
    },

    update: function(dt)
    {
        var updated = this._child1.update(dt);
        updated = updated || this._child2.update(dt);

        var t = this._t;
        if (updated || this._valueChanged) {
            if (t > .999)
                this._pose.copyFrom(this._child1._pose);
            else if (t < .001)
                this._pose.copyFrom(this._child2._pose);
            else
                this._pose.interpolate(this._child1, this._child2, this._t);

            this._valueChanged = false;
        }
    },

    _applyValue: function(value)
    {
        this.value = value;
    },

    setValue: function(id, value)
    {
        HX.SkeletonBlendNode.prototype.setValue.call(this, id, value);
        this._child1.setValue(id, value);
        this._child2.setValue(id, value);
    },

    get numJoints() { return this._numJoints; }
};