/**
 *
 * @type {{}}
 */
HX.TextureSetter = {};

HX.TextureSetter.getSettersPerPass = function(materialPass)
{
    if (HX.TextureSetter._passTable === undefined)
        HX.TextureSetter._init();

    return HX.TextureSetter._findSetters(materialPass, HX.TextureSetter._passTable);
};

HX.TextureSetter.getSettersPerInstance = function(materialPass)
{
    if (HX.TextureSetter._instanceTable === undefined)
        HX.TextureSetter._init();

    return HX.TextureSetter._findSetters(materialPass, HX.TextureSetter._instanceTable);
};

HX.TextureSetter._findSetters = function(materialPass, table)
{
    var setters = [];
    for (var slotName in table) {
        if (!table.hasOwnProperty(slotName)) continue;
        var slot = materialPass.getTextureSlot(slotName);
        if (!slot) continue;
        var setter = new table[slotName]();
        setters.push(setter);
        setter.slot = slot;
    }

    return setters;
};


HX.TextureSetter._init = function()
{
    HX.TextureSetter._passTable = {};
    HX.TextureSetter._instanceTable = {};

    HX.TextureSetter._passTable.hx_normalDepth = HX.NormalDepthSetter;
    HX.TextureSetter._passTable.hx_backbuffer = HX.BackbufferSetter;
    HX.TextureSetter._passTable.hx_frontbuffer = HX.FrontbufferSetter;
    HX.TextureSetter._passTable.hx_ssao = HX.SSAOSetter;

    HX.TextureSetter._instanceTable.hx_morphPositionsTexture = HX.MorphPositionsTextureSetter;
    HX.TextureSetter._instanceTable.hx_skinningTexture = HX.SkinningTextureSetter;
};

// Texture setters can be either per pass or per instance. The execute method gets passed eithter the renderer or the
// render item, respectively.

HX.NormalDepthSetter = function()
{
};

HX.NormalDepthSetter.prototype.execute = function (renderer)
{
    if (renderer._normalDepthTexture)
        this.slot.texture = renderer._normalDepthTexture;
};


HX.FrontbufferSetter = function()
{
};

HX.FrontbufferSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrFront)
        this.slot.texture = renderer._hdrFront.texture;
};

HX.BackbufferSetter = function()
{
};

HX.BackbufferSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrBack)
        this.slot.texture = renderer._hdrBack.texture;
};


HX.SSAOSetter = function()
{
};

HX.SSAOSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._ssaoTexture;
};


HX.MorphPositionsTextureSetter = function()
{
};

HX.MorphPositionsTextureSetter.prototype.execute = function (renderItem)
{
    this.slot.texture = renderItem.meshInstance.morphPose.positionTexture;
};

HX.SkinningTextureSetter = function()
{
};

HX.SkinningTextureSetter.prototype.execute = function (renderItem)
{
    this.slot.texture = renderItem.skeletonMatrices;
};