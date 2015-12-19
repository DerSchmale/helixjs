HX.FbxAnimLayer = function()
{
    HX.FbxObject.call(this);
    this.curveNodes = null;
};

HX.FbxAnimLayer.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxAnimLayer.prototype.toString = function() { return "[FbxAnimLayer(name="+this.name+")]"; };


HX.FbxAnimLayer.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxAnimationCurveNode) {
        this.curveNodes = this.curveNodes || [];
        this.curveNodes.push(obj);
    }
    else
        throw new Error("Incompatible child object " + obj.toString());
};
