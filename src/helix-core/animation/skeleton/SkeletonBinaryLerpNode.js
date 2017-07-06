/**
 * Blends between two states based on a lerp value.
 * @constructor
 */
import { SkeletonBlendNode } from './SkeletonBlendNode';
import { MathX } from "../../math/MathX";

function SkeletonBinaryLerpNode()
{
    SkeletonBlendNode.call(this);
    this._value = 0;
    this._child1 = null;
    this._child2 = null;
    this._minValue = 0;
    this._maxValue = 1;
    this._numJoints = 0;
    this._t = 0;
    this._valueChanged = false;
}

SkeletonBinaryLerpNode.prototype = Object.create(SkeletonBlendNode.prototype, {
    numJoints: {
        get: function() {return this._numJoints; }
    },

    minValue: {
        get: function ()
        {
            return this._minValue;
        },

        set: function (value)
        {
            this._minValue = value;
        }
    },

    maxValue: {
        get: function()
        {
            return this._maxValue;
        },

        set: function(value)
        {
            this._maxValue = value;
        }
    },

    value: {
        get: function ()
        {
            return this._value;
        },

        set: function (v)
        {
            v = MathX.clamp(v, this._minValue, this._maxValue)
            if (this._value !== v)
                this._valueChanged = true;
            this._value = v;
            this._t = (this._value - this._minValue) / (this._maxValue - this._minValue);
        }
    },

    child1: {
        get: function()
        {
            return this._child1;
        },

        set: function(value)
        {
            this._child1 = value;
            if (this._child2 && value.numJoints !== this._child2.numJoints) throw new Error("Incompatible child nodes (numJoints mismatch)!");
            this._numJoints = value.numJoints;
        }
    },

    child2: {
        get: function ()
        {
            return this._child2;
        },

        set: function (value)
        {
            this._child2 = value;
            if (this._child1 && value.numJoints !== this._child1.numJoints) throw new Error("Incompatible child nodes (numJoints mismatch)!");
        }
    }
});

SkeletonBinaryLerpNode.prototype.update = function(dt, transferRootJoint)
{
    var updated = this._child1.update(dt, transferRootJoint);
    updated = this._child2.update(dt, transferRootJoint) || updated;
    updated = updated || this._valueChanged;

    var t = this._t;
    if (updated) {
        if (t > .999)
            this._pose.copyFrom(this._child1._pose);
        else if (t < .001)
            this._pose.copyFrom(this._child2._pose);
        else
            this._pose.interpolate(this._child1._pose, this._child2._pose, this._t);

        this._valueChanged = false;
    }

    return updated;
};

SkeletonBinaryLerpNode.prototype._applyValue = function(value)
{
    this.value = value;
};

SkeletonBinaryLerpNode.prototype.setValue = function(id, value)
{
    SkeletonBlendNode.prototype.setValue.call(this, id, value);
    this._child1.setValue(id, value);
    this._child2.setValue(id, value);
};

export { SkeletonBinaryLerpNode };