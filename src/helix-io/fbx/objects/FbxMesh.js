import {FbxObject} from "./FbxObject";
import {FbxSkin} from "./FbxSkin";
/**
 *
 * @constructor
 */
function FbxMesh()
{
    FbxObject.call(this);
    this.Color = null;
    this["Casts Shadows"] = true;

    this.vertices = null;
    this.layerElements = null;
    this.deformers = null;
}

FbxMesh.prototype = Object.create(FbxObject.prototype);

FbxMesh.prototype.toString = function() { return "[FbxMesh(name="+this.name+")]"; };

FbxMesh.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxSkin) {
        this.deformers = this.deformers || [];
        this.deformers.push(obj);
    }
    else {
        throw new Error("Unhandled object connection " + obj.toString());
    }
};

export {FbxMesh};