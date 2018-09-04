import { SkeletonBlendNode } from './SkeletonBlendNode';
import { MathX } from "../../math/MathX";

/**
 * @classdesc
 * SkeletonBinaryLerpNode allows simple blending between 2 child nodes.
 *
 * @property {number} minValue The minimum value of the input range.
 * @property {number} maxValue The maximum value of the input range.
 * @property {number} value The value between minValue and maxValue that defines how to interpolate between the children.
 * @property {SkeletonBlendNode} child1 The first child (matching minValue).
 * @property {SkeletonBlendNode} child2 The second child (matching maxValue).
 *
 * @constructor
 *
 * @extends SkeletonBlendNode
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonBinaryLerpNode()
{
    SkeletonBlendNode.call(this);
	this.numJoints = 0;
	this._value = 0;
	this._child1 = null;
	this._child2 = null;
	this.minValue = 0;
	this.maxValue = 1;
    this._t = 0;
    this._valueChanged = false;
}

SkeletonBinaryLerpNode.prototype = Object.create(SkeletonBlendNode.prototype, {
    value: {
        get: function ()
        {
            return this._value;
        },

        set: function (v)
        {
            v = MathX.clamp(v, this.minValue, this.maxValue);
            if (this._value !== v)
                this._valueChanged = true;
            this._value = v;
            this._t = (this._value - this.minValue) / (this.maxValue - this.minValue);
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
            this.numJoints = value.numJoints;
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

/**
 * @ignore
 */
SkeletonBinaryLerpNode.prototype.update = function(dt, transferRootJoint)
{
    var updated = this._child1.update(dt, transferRootJoint);
    updated = this._child2.update(dt, transferRootJoint) || updated;
    updated = updated || this._valueChanged;

    var t = this._t;
    if (updated) {
        if (t > .999)
            this.pose.copyFrom(this._child1.pose);
        else if (t < .001)
            this.pose.copyFrom(this._child2.pose);
        else
            this.pose.interpolate(this._child1.pose, this._child2.pose, this._t);

        this._valueChanged = false;
    }

    return updated;
};

SkeletonBinaryLerpNode.prototype._queryChildren = function(name)
{
    return this._child1.findNode(name) || this._child2.findNode(name);
};

export { SkeletonBinaryLerpNode };