/**
 * Skybox provides a backdrop "at infinity" for the scene.
 * @param materialOrTexture Either a texture or a material used to render the skybox. If a texture is passed,
 * HX.SkyboxMaterial is used as material.
 * @constructor
 */
HX.Skybox = function(materialOrTexture)
{
    if (!(materialOrTexture instanceof HX.Material))
        materialOrTexture = new HX.SkyboxMaterial(materialOrTexture);

    //var model = new HX.PlanePrimitive({alignment: HX.PlanePrimitive.ALIGN_XY, width: 2, height: 2});
    var model = new HX.BoxPrimitive({width: 1, invert: true});
    model.localBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    this._modelInstance = new HX.ModelInstance(model, materialOrTexture);
};

HX.Skybox.prototype = {};