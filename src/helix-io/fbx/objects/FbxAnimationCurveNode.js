import {FbxObject} from "./FbxObject";
import {FbxAnimationCurve} from "./FbxAnimationCurve";
function FbxAnimationCurveNode()
{
    FbxObject.call(this);
    this.curves = null;
    // are these weights?
    this["d|X"] = 0.0;
    this["d|Y"] = 0.0;
    this["d|Z"] = 0.0;
    this.propertyName = null;
}

FbxAnimationCurveNode.prototype = Object.create(FbxObject.prototype);
FbxAnimationCurveNode.prototype.toString = function() { return "[FbxAnimationCurveNode(name="+this.name+")]"; };

FbxAnimationCurveNode.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof FbxAnimationCurve) {
        this.curves = this.curves || {};
        this.curves[propertyName] = obj;
    }
};

export {FbxAnimationCurveNode};