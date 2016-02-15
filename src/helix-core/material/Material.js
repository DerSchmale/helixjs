

/**
 * Careful! Transparency and blending are two separate concepts!
 * Transparency represents actual transparent objects and affects how the light interacting with the object is
 * added to the rest of the lit scene.
 * Blending merely applies to how passes are applied to their render targets.
 */
HX.TransparencyMode = {
    OPAQUE: 0,      // light coming from behind the object is blocked.
    ALPHA: 1,       // light from behind is transparently blended with incoming light
    ADDITIVE: 2,    // light from behind the object is completely unblocked and added in. Useful for specular-only lighting such as glass, or when refracted diffuse is applied in a post pass.
    NUM_MODES: 3
};

/**
 *
 * @constructor
 */
HX.Material = function ()
{
    this._elementType = HX.ElementType.TRIANGLES;
    this._transparencyMode = HX.TransparencyMode.OPAQUE;
    this._passes = new Array(HX.Material.NUM_PASS_TYPES);
    this._renderOrderHint = ++HX.Material.ID_COUNTER;
    // forced render order by user:
    this._renderOrder = 0;
    this.onChange = new HX.Signal();
    this._textures = {};
    this._uniforms = {};

    // practically unused atm, except for unlit (0)
    this._lightingModelID = 1;
    this._name = null;
};

HX.Material.ID_COUNTER = 0;

HX.Material.prototype = {
    constructor: HX.Material,

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    get transparencyMode()
    {
        return this._transparencyMode;
    },

    set transparencyMode(value)
    {
        this._transparencyMode = value;
    },

    get renderOrder()
    {
        return this._renderOrder;
    },

    set renderOrder(value)
    {
        this._renderOrder = value;
    },

    get elementType()
    {
        return this._elementType;
    },

    set elementType(value)
    {
        this._elementType = value;
        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].elementType = value;
        }
    },

    getPass: function (type)
    {
        return this._passes[type];
    },

    setPass: function (type, pass)
    {
        this._passes[type] = pass;

        if (pass) {
            if(type === HX.MaterialPass.SHADOW_DEPTH_PASS)
                pass.cullMode = HX.DirectionalLight.SHADOW_FILTER.getCullMode();

            if(type === HX.GEOMETRY_NORMAL_PASS || type === HX.GEOMETRY_SPECULAR_PASS)
                pass.depthTest = HX.Comparison.EQUAL;

            pass.elementType = this._elementType;

            for (var slotName in this._textures) {
                if (this._textures.hasOwnProperty(slotName))
                    pass.setTexture(slotName, this._textures[slotName]);
            }

            for (var uniformName in this._uniforms)
                if (this._uniforms.hasOwnProperty(uniformName)) {
                    if (uniformName.charAt(uniformName.length-1) == ']')
                        pass.setUniformArray(uniformName.substr(0, uniformName.length - 3), this._uniforms[uniformName]);
                    else
                        pass.setUniform(uniformName, this._uniforms[uniformName]);
                }
        }

        this.onChange.dispatch();
    },

    hasPass: function (type)
    {
        return !!this._passes[type];
    },

    setTexture: function(slotName, texture)
    {
        this._textures[slotName] = texture;

        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
            if (this.hasPass(i)) this._passes[i].setTexture(slotName, texture);
    },

    /**
     *
     * @param name
     * @param value
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniform: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name))
            return;

        this._uniforms[name] = value;

        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniform(name, value);
        }
    },

    /**
     *
     * @param name
     * @param value
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniformArray: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name + '[0]'))
            return;

        this._uniforms[name + '[0]'] = value;

        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniformArray(name, value);
        }
    },

    _setUseSkinning: function(value)
    {
        this._useSkinning = value;
    },

    toString: function()
    {
        return "[Material(name=" + this._name + ")]";
    }

};