/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
export var TextureSetter = {
    getSettersPerPass: function (materialPass)
    {
        if (TextureSetter._passTable === undefined)
            TextureSetter._init();

        return TextureSetter._findSetters(materialPass, TextureSetter._passTable);
    },

    getSettersPerInstance: function (materialPass)
    {
        if (TextureSetter._instanceTable === undefined)
            TextureSetter._init();

        return TextureSetter._findSetters(materialPass, TextureSetter._instanceTable);
    },

    _findSetters: function (materialPass, table)
    {
        var setters = [];
        for (var slotName in table) {
            if (!table.hasOwnProperty(slotName)) continue;
            var slot = materialPass.getTextureSlot(slotName);
            if (!slot) continue;
            var setter = new table[slotName]();
            setters.push(setter);
            setter.slot = slot;
            setter.pass = materialPass;
        }

        return setters;
    },

    _init: function()
    {
        TextureSetter._passTable = {};
        TextureSetter._instanceTable = {};

        TextureSetter._passTable.hx_normalDepthBuffer = NormalDepthBufferSetter;
        TextureSetter._passTable.hx_backbuffer = BackbufferSetter;
        TextureSetter._passTable.hx_frontbuffer = FrontbufferSetter;
        TextureSetter._passTable.hx_lightAccumulation = LightAccumulationSetter;
        TextureSetter._passTable.hx_ssao = SSAOSetter;
        TextureSetter._passTable.hx_shadowMap = ShadowMapSetter;
        TextureSetter._passTable["hx_diffuseProbes[0]"] = DiffuseProbesSetter;
        TextureSetter._passTable["hx_specularProbes[0]"] = SpecularProbesSetter;

        TextureSetter._instanceTable.hx_skinningTexture = SkinningTextureSetter;
    },

    setArray: function(pass, firstSlot, textures)
    {
        var len = textures.length;
        var location = firstSlot.location;

        for (var i = 0; i < len; ++i) {
            var slot = pass._textureSlots[firstSlot.index + i];
            // make sure we're not overshooting the array and writing to another element (larger arrays are allowed analogous to uniform arrays)
            if (!slot || slot.location !== location) return;
            slot.texture = textures[i];
        }
    }
};


// Texture setters can be either per pass or per instance. The execute method gets passed eithter the renderer or the
// render item, respectively.

function NormalDepthBufferSetter()
{
}

NormalDepthBufferSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._normalDepthBuffer;
};


function FrontbufferSetter()
{
}

FrontbufferSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrFront)
        this.slot.texture = renderer._hdrFront.texture;
};

function BackbufferSetter()
{
}

BackbufferSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrBack)
        this.slot.texture = renderer._hdrBack.texture;
};

function LightAccumulationSetter()
{
}

LightAccumulationSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrBack)
        this.slot.texture = renderer._hdrBack.texture;
};


function SSAOSetter()
{
}

SSAOSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._ssaoTexture;
};

function ShadowMapSetter()
{
}

ShadowMapSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._shadowAtlas.texture;
};

function DiffuseProbesSetter()
{
}

DiffuseProbesSetter.prototype.execute = function (renderer)
{
    TextureSetter.setArray(this.pass, this.slot, renderer._diffuseProbeArray);
};

function SpecularProbesSetter()
{
}

SpecularProbesSetter.prototype.execute = function (renderer)
{
    TextureSetter.setArray(this.pass, this.slot, renderer._specularProbeArray);
};

function SkinningTextureSetter()
{
}

SkinningTextureSetter.prototype.execute = function (renderItem)
{
    this.slot.texture = renderItem.skeletonMatrices;
};