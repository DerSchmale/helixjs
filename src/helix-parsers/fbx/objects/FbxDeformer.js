HX.FbxDeformer = function()
{
    HX.FbxObject.call(this);
    this.children = null;
};

HX.FbxDeformer.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxDeformer.prototype.toString = function() { return "[FbxDeformer(name="+this.name+")]"; };

HX.FbxDeformer.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxDeformer) {
        this.children = this.children || [];
        this.children.push(obj);
    }
    else if (obj instanceof HX.FbxNode) {
        // TODO: Not sure what to do with this... probably defining the limb transform?
    }
    else {
        throw new Error("Unhandled object connection " + obj.toString());
    }
};