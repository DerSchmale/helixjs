HX.FbxMaterial = function()
{
    HX.FbxObject.call(this);
    // actual video not supported
    this.EmissiveColor = null;
    this.EmissiveFactor = 1;
    this.DiffuseColor = null;
    this.DiffuseFactor = 1;
    //this.NormalMap = null;
    this.ShininessExponent = 0;
    this.Shininess = 0;

    this.textures = {};
};

HX.FbxMaterial.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxMaterial.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof HX.FbxFileTexture)
        this.textures[propertyName] = obj;
    else
        throw new Error("Unknown object property!");
};