/**
 *
 * @constructor
 */
HX.FbxMesh = function()
{
    HX.FbxObject.call(this);
    this.Color = null;
    this["Casts Shadows"] = true;

    this.vertices = null;
    this.layerElements = null;
    this.deformers = null;
};

HX.FbxMesh.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxMesh.prototype.toString = function() { return "[FbxMesh(name="+this.name+")]"; };

HX.FbxMesh.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxSkin) {
        this.deformers = this.deformers || [];
        this.deformers.push(obj);
    }
    else {
        throw new Error("Unhandled object connection " + obj.toString());
    }
};