import {FbxObject} from "./FbxObject";
import {FbxAnimLayer} from "./FbxAnimLayer";
import {FbxTime} from "./FbxTime";

function FbxAnimStack()
{
    FbxObject.call(this);

    this.LocalStart = new FbxTime();
    this.LocalStop = new FbxTime();
    this.ReferenceStart = new FbxTime();
    this.ReferenceStop = new FbxTime();

    this.layers = null;
}

FbxAnimStack.prototype = Object.create(FbxObject.prototype);

FbxAnimStack.prototype.connectObject = function(obj)
{
    if (obj instanceof FbxAnimLayer) {
        this.layers = this.layers || [];
        this.layers.push(obj);
    }
    else
        throw new Error("Incompatible child object " + obj.toString());
};

FbxAnimStack.prototype.toString = function() { return "[FbxAnimStack(name="+this.name+")]"; };

export {FbxAnimStack};