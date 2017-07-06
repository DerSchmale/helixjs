import {FbxObject} from "./FbxObject";
import {FbxCluster} from "./FbxCluster";
function FbxSkin()
{
    FbxObject.call(this);
    this.clusters = null;

    // data will contain the converter
}

FbxSkin.prototype = Object.create(FbxObject.prototype);

FbxSkin.prototype.toString = function() { return "[FbxSkin(name="+this.name+")]"; };

FbxSkin.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxCluster) {
        this.clusters = this.clusters || [];
        this.clusters.push(obj);
    }
    else
        throw new Error("Unhandled object connection " + obj.toString());
};

export {FbxSkin};