HX.FbxAnimationCurveNode = function()
{
    HX.FbxObject.call(this);
    this.curves = null;
    // are these weights?
    this["d|X"] = 0.0;
    this["d|Y"] = 0.0;
    this["d|Z"] = 0.0;
    this.propertyName = null;
};

HX.FbxAnimationCurveNode.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxAnimationCurveNode.prototype.toString = function() { return "[FbxAnimationCurveNode(name="+this.name+")]"; };

HX.FbxAnimationCurveNode.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof HX.FbxAnimationCurve) {
        this.curves = this.curves || {};
        this.curves[propertyName] = obj;
    }
};