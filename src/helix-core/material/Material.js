/**
 *
 * @constructor
 */
HX.Material = function(geometryVertexShader, geometryFragmentShader, lightingModel)
{
    this._elementType = HX.ElementType.TRIANGLES;
    // TODO: should this be passed to the material as a uniform to figure out how to interlace in hx_processGeometry (= overhead for opaque), or should this be a #define and compilation issue?
    // could by default do a test, and if #define FORCE_TRANSPARENCY_MODE <mode> is set, do not. This can be used by BasicMaterial or custom materials to trigger recompilations and optimize.
    this._passes = new Array(HX.Material.NUM_PASS_TYPES);
    this._renderOrderHint = ++HX.Material.ID_COUNTER;
    // forced render order by user:
    this._renderOrder = 0;
    this.onChange = new HX.Signal();
    this._textures = {};
    this._uniforms = {};

    this._lights = null;
    this._name = null;
    this._geometryVertexShader = geometryVertexShader;
    this._geometryFragmentShader = geometryFragmentShader;
    this._lightingModel = lightingModel || HX.LightingModel.UnlitLightingModel;

    this._initialized = false;
};

HX.Material.ID_COUNTER = 0;

HX.Material.prototype =
{
    init: function()
    {
        if (this._initialized) return;

        this._dirLights = null;
        this._dirLightCasters = null;
        this._pointLights = null;

        if (!this._geometryVertexShader || !this._geometryFragmentShader)
            throw "Cannot call Material.init without shaders!";

        if (!this._lightingModel)
            this._setPass(HX.MaterialPass.BASE_PASS, new HX.UnlitPass(this._geometryVertexShader, this._geometryFragmentShader));
        else if (this._lights)
            this._setPass(HX.MaterialPass.BASE_PASS, new HX.StaticLitPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, this._lights));
        //else
        //    this._initDynamicLitPasses(geometryVertexShader, geometryFragment, lightingModel)

        this._setPass(HX.MaterialPass.NORMAL_DEPTH_PASS, new HX.NormalDepthPass(this._geometryVertexShader, this._geometryFragmentShader));
        this._setPass(HX.MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS, new HX.DirectionalShadowPass(this._geometryVertexShader, this._geometryFragmentShader));

        this._initialized = true;
        // TODO: init dynamic light passes
    },

    get initialized() { return this._initialized; },

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    get lights()
    {
        return this._lights;
    },

    set lights(value)
    {
        this._lights = value;
        if (!this._lightingModel) this._lightingModel = HX.LightingModel.GGX;
        this._invalidate();
    },

    get lightingModel()
    {
        return this._lightingModel;
    },

    set lightingModel(value)
    {
        this._lightingModel = value;
        this._invalidate();
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
        if (!this._initialized) this.init();
        return this._passes[type];
    },

    _setPass: function (type, pass)
    {
        this._passes[type] = pass;

        if (pass) {
            if(type === HX.MaterialPass.DIR_LIGHT_PASS)
                pass.cullMode = HX.DirectionalLight.SHADOW_FILTER.getCullMode();

            pass.elementType = this._elementType;

            for (var slotName in this._textures) {
                if (this._textures.hasOwnProperty(slotName)) {
                    pass.setTexture(slotName, this._textures[slotName]);
                }
            }

            for (var uniformName in this._uniforms) {
                if (this._uniforms.hasOwnProperty(uniformName)) {
                    if (uniformName.charAt(uniformName.length - 1) == ']')
                        pass.setUniformArray(uniformName.substr(0, uniformName.length - 3), this._uniforms[uniformName]);
                    else
                        pass.setUniform(uniformName, this._uniforms[uniformName]);
                }
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
        if (texture)
            this._textures[slotName] = texture;
        else
            delete this._textures[slotName];

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

    _invalidate: function()
    {
        this._initialized = false;
        this._passes = new Array(HX.Material.NUM_PASS_TYPES);
    },

    toString: function()
    {
        return "[Material(name=" + this._name + ")]";
    }
};