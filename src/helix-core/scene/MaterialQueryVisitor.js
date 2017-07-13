import {SceneVisitor} from "./SceneVisitor";

/**
 * This goes through a scene to find a material with a given name
 * @param materialName
 * @constructor
 *
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
function MaterialQueryVisitor(materialName)
{
    SceneVisitor.call(this);
    this._materialName = materialName;
}

MaterialQueryVisitor.prototype = Object.create(SceneVisitor.prototype,
    {
        foundMaterial: {
            get: function()
            {
                return this._foundMaterial;
            }
        }
    });

MaterialQueryVisitor.prototype.qualifies = function(object)
{
    // if a material was found, ignore
    return !this._foundMaterial;
};

MaterialQueryVisitor.prototype.visitModelInstance = function (modelInstance, worldMatrix)
{
    var materials = modelInstance._materials;
    var len = materials.length;
    for (var i = 0; i < len; ++i) {
        var material = materials[i];
        if (material.name === this._materialName)
            this._foundMaterial = material;
    }
};

export { MaterialQueryVisitor };