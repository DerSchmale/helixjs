/**
 *
 * @type {{}}
 */
HX.TextureSetter = {};

HX.TextureSetter.getSetters = function(shader) {
    if (HX.TextureSetter._table === undefined)
        HX.TextureSetter._init();

    return HX.TextureSetter._findSetters(shader);
};

HX.TextureSetter._findSetters = function(material)
{
    var setters = [];
    for (var slotName in HX.TextureSetter._table) {
        var location = HX.GL.getUniformLocation(shader._program, slotName);
        if (location == null) continue;
        var setter = new HX.TextureSetter._table[slotName]();
        setters.push(setter);
        setter.location = location;
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
};


HX.GBufferColorSetter = function()
{
};

HX.GBufferColorSetter.prototype.execute = function (renderer)
{
    HX.GL.uniformMatrix4fv(this.location, false, worldMatrix._m);
};