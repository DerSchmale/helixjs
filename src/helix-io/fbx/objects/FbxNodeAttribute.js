import {FbxObject} from "./FbxObject";
// probably needs to be subclasses for Light, Camera, etc
function FbxNodeAttribute()
{
    FbxObject.call(this);
    // actual video not supported
    this.type = null;
}

FbxNodeAttribute.prototype = Object.create(FbxObject.prototype);

FbxNodeAttribute.prototype.toString = function() { return "[FbxNodeAttribute(name="+this.name+", type="+this.type+")]"; };

export {FbxNodeAttribute}