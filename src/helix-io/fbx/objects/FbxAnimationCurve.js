import {FbxObject} from "./FbxObject";
function FbxAnimationCurve()
{
    FbxObject.call(this);
    this.Default = undefined;
    this.KeyVer = 0.0;
    this.KeyTime = 0.0;
    this.KeyValueFloat = null;
    this.KeyAttrFlags = 0.0;
    this.KeyAttrDataFloat = null;
    this.KeyAttrRefCount = 0.0;
}

FbxAnimationCurve.prototype = Object.create(FbxObject.prototype);
FbxAnimationCurve.prototype.toString = function() { return "[FbxAnimationCurve(name="+this.name+")]"; };

export {FbxAnimationCurve};