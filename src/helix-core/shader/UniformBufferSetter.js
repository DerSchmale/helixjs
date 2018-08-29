/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
export var UniformBufferSetter = {
    getSettersPerPass: function (materialPass)
    {
        if (UniformBufferSetter._passTable === undefined)
            UniformBufferSetter._init();

        return UniformBufferSetter._findSetters(materialPass, UniformBufferSetter._passTable);
    },

    getSettersPerInstance: function (materialPass)
    {
        if (UniformBufferSetter._instanceTable === undefined)
            UniformBufferSetter._init();

        return UniformBufferSetter._findSetters(materialPass, UniformBufferSetter._instanceTable);
    },

    _findSetters: function (materialPass, table)
    {
        var setters = [];
        for (var slotName in table) {
            if (!table.hasOwnProperty(slotName)) continue;
            var slot = materialPass.getUniformBufferIndex(slotName);
            if (slot === -1) continue;
            var setter = new table[slotName]();
            setters.push(setter);
            setter.slot = slot;
            setter.pass = materialPass;
        }

        return setters;
    },

    _init: function()
    {
        UniformBufferSetter._passTable = {};
        UniformBufferSetter._instanceTable = {};

        UniformBufferSetter._passTable.hx_lights = LightsSetter;
		UniformBufferSetter._passTable.hx_lightingCells = LightingCellsSetter;
    }
};

function LightsSetter()
{
}

LightsSetter.prototype.execute = function (renderer)
{
    this.pass.setUniformBufferByIndex(this.slot, renderer._lightingUniformBuffer);
};

function LightingCellsSetter()
{
}

LightingCellsSetter.prototype.execute = function (renderer)
{
	this.pass.setUniformBufferByIndex(this.slot, renderer._lightingCellsUniformBuffer);
};

