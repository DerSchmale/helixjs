HX.FbxMaterial = function()
{
    HX.FbxObject.call(this);
    // actual video not supported
    this.EmissiveColor = null;
    this.EmissiveFactor = 1;
    this.DiffuseColor = null;
    this.DiffuseFactor = 1;
    //this.NormalMap = null;
    this.ShininessExponent = undefined;
    this.Shininess = undefined;

    this.textures = null;
};

HX.FbxMaterial.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxMaterial.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof HX.FbxFileTexture) {
        this.textures = this.textures || {};
        this.textures[propertyName] = obj;
    }
    else
        throw new Error("Unknown object property!");
};

HX.FbxMaterial.prototype.toString = function() { return "[FbxMaterial(name="+this.name+")]"; };