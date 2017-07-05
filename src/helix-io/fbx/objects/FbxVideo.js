import {FbxObject} from "./FbxObject";
function FbxVideo()
{
    FbxObject.call(this);
    // actual video not supported
    this.relativeFilename = null;
}

FbxVideo.prototype = Object.create(FbxObject.prototype);
FbxVideo.prototype.toString = function() { return "[FbxVideo(name="+this.name+")]"; };

export {FbxVideo};