/**
 *
 * @type {{}}
 */
HX.TextureSetter = {};

HX.TextureSetter.getSetters = function(materialPass) {
    if (HX.TextureSetter._table === undefined)
        HX.TextureSetter._init();

    return HX.TextureSetter._findSetters(materialPass);
};

HX.TextureSetter._findSetters = function(materialPass)
{
    var setters = [];
    for (var slotName in HX.TextureSetter._table) {
        var slot = materialPass.getTextureSlot(slotName);
        if (slot == null) continue;
        var setter = new HX.TextureSetter._table[slotName]();
        setters.push(setter);
        setter.slot = slot;
    }

    return setters;
};

HX.TextureSetter._init = function()
{
    HX.TextureSetter._table = {};

    HX.TextureSetter._table.hx_gbufferColor = HX.GBufferColorSetter;
    HX.TextureSetter._table.hx_gbufferNormals = HX.GBufferNormalsSetter;
    HX.TextureSetter._table.hx_gbufferSpecular = HX.GBufferSpecularSetter;
    HX.TextureSetter._table.hx_gbufferDepth = HX.GBufferDepthSetter;
    HX.TextureSetter._table.hx_backbuffer = HX.BackbufferSetter;
    HX.TextureSetter._table.hx_ambientOcclusion = HX.AmbientOcclusionSetter;
};


HX.GBufferColorSetter = function()
{
};

HX.GBufferColorSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._gbuffer[0];
};

HX.GBufferNormalsSetter = function()
{
};

HX.GBufferNormalsSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._gbuffer[1];
};

HX.GBufferSpecularSetter = function()
{
};

HX.GBufferSpecularSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._gbuffer[2];
};

HX.GBufferDepthSetter = function()
{
};

HX.GBufferDepthSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._gbuffer[3];
};

HX.BackbufferSetter = function()
{
};

HX.BackbufferSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._hdrBuffers[renderer._hdrSourceIndex];
};

HX.AmbientOcclusionSetter = function()
{
};

HX.AmbientOcclusionSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._aoTexture;
};