/**
 *
 * @param material
 * @constructor
 */
HX.SkyBox = function(material)
{
    this._modelInstance = new HX.ModelInstance(HX.PlanePrimitive.create({alignment: HX.PlanePrimitive.ALIGN_XY, width: 2, height: 2}), [material]);
    this._globalSpecularProbe = null;
    this._globalIrradianceProbe = null;
};

// TODO: Not sure if we want to always be stuck to a skybox for global probes?
HX.SkyBox.prototype =
{
    getGlobalSpecularProbe: function()
    {
        return this._globalSpecularProbe;
    },

    setGlobalSpecularProbe: function(value)
    {
        this._globalSpecularProbe = value;
    },

    getGlobalIrradianceProbe: function()
    {
        return this._globalIrradianceProbe;
    },

    setGlobalIrradianceProbe: function(value)
    {
        this._globalIrradianceProbe = value;
    }
}