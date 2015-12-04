HX.MaterialQueryVisitor = function(materialName)
{
    HX.SceneVisitor.call(this);
    this._materialName = materialName;
};

HX.MaterialQueryVisitor.prototype = Object.create(HX.SceneVisitor.prototype,
    {
        foundMaterial: {
            get: function()
            {
                return this._foundMaterial;
            }
        }
    });

HX.MaterialQueryVisitor.prototype.qualifies = function(object)
{
    // if a material was found, ignore
    return !this._foundMaterial;
};

HX.MaterialQueryVisitor.prototype.visitModelInstance = function (modelInstance, worldMatrix)
{
    var materials = modelInstance._materials;
    var len = materials.length;
    for (var i = 0; i < len; ++i) {
        var material = materials[i];
        if (material.name === this._materialName)
            this._foundMaterial = material;
    }
};