import {FbxObject} from "./FbxObject";
import {FbxAnimationCurveNode} from "./FbxAnimationCurveNode";
function FbxAnimLayer()
{
    FbxObject.call(this);
    this.curveNodes = null;
}

FbxAnimLayer.prototype = Object.create(FbxObject.prototype);
FbxAnimLayer.prototype.toString = function() { return "[FbxAnimLayer(name="+this.name+")]"; };

FbxAnimLayer.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxAnimationCurveNode) {
        this.curveNodes = this.curveNodes || [];
        this.curveNodes.push(obj);
    }
    else
        throw new Error("Incompatible child object " + obj.toString());
};

export {FbxAnimLayer};