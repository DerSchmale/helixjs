import {FbxObject} from "./FbxObject";
import {FbxNode} from "./FbxNode";
function FbxCluster()
{
    FbxObject.call(this);
    this.limbNode = null;
    this.transform = null;
    this.transformLink = null;
    this.indices = null;
    this.weights = null;
}

FbxCluster.prototype = Object.create(FbxObject.prototype);

FbxCluster.prototype.toString = function() { return "[FbxCluster(name="+this.name+")]"; };

FbxCluster.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxNode) {
        this.limbNode = obj;
    }
    else
        throw new Error("Unhandled object connection " + obj.toString());
};

export {FbxCluster};