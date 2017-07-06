import {FbxObject} from "./FbxObject";
function FbxTrashNode()
{
    FbxObject.call(this);
}

FbxTrashNode.prototype = Object.create(FbxObject.prototype);

FbxTrashNode.prototype.toString = function() { return "[FbxTrashNode(name="+this.name+")]"; };

// ignore
FbxTrashNode.prototype.connectObject = function(obj) {};

export {FbxTrashNode};