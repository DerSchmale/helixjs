HX.FbxTrashNode = function()
{
    HX.FbxObject.call(this);
};

HX.FbxTrashNode.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxTrashNode.prototype.toString = function() { return "[FbxTrashNode(name="+this.name+")]"; };

// ignore
HX.FbxTrashNode.prototype.connectObject = function(obj) {}