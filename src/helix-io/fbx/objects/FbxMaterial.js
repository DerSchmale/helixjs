import {FbxObject} from "./FbxObject";
import {FbxFileTexture} from "./FbxFileTexture";
function FbxMaterial()
{
    FbxObject.call(this);
    // actual video not supported
    this.EmissiveColor = null;
    this.EmissiveFactor = 1;
    this.DiffuseColor = null;
    this.DiffuseFactor = 1;
    //this.NormalMap = null;
    this.ShininessExponent = undefined;
    this.Shininess = undefined;

    this.textures = null;
}

FbxMaterial.prototype = Object.create(FbxObject.prototype);

FbxMaterial.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof FbxFileTexture) {
        this.textures = this.textures || {};
        this.textures[propertyName] = obj;
    }
    else
        throw new Error("Unknown object property!");
};

FbxMaterial.prototype.toString = function() { return "[FbxMaterial(name="+this.name+")]"; };

export {FbxMaterial};