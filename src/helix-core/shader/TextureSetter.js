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

        TextureSetter._instanceTable.hx_skinningTexture = SkinningTextureSetter;
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

function SkinningTextureSetter()
{
}

SkinningTextureSetter.prototype.execute = function (renderItem)
{
    this.slot.texture = renderItem.skeletonMatrices;
};