import {FbxObject} from "./FbxObject";
import {FbxVideo} from "./FbxVideo";
function FbxFileTexture()
{
    FbxObject.call(this);
    this.WrapModeU = 0;
    this.WrapModeV = 0;
    //this.UVSet = null;    // we only support a single uv set

    this.relativeFilename = null;
    this.video = null;
}

FbxFileTexture.prototype = Object.create(FbxObject.prototype);

FbxFileTexture.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxVideo)
        this.video = obj;
    else
        throw new Error("Incompatible child object!");
};

FbxFileTexture.prototype.toString = function() { return "[FbxFileTexture(name="+this.name+")]"; };

export {FbxFileTexture};