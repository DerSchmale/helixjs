/**
 *
 * @constructor
 */
HX.Material = function(geometryVertexShader, geometryFragment, lightingModel)
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

    this._name = null;
    if (geometryVertexShader)
        this.init(geometryVertexShader, geometryFragment, lightingModel);
};

HX.Material.ID_COUNTER = 0;

// So... we're throwing things around for materials:
//  - provide geometry code
//  - provide light model code
// This allows a logical separation between geometry stage and lighting stage (which could be useful to support deferred rendering in the future)

HX.Material.prototype = {
    constructor: HX.Material,

    /**
     * @param vertexShader
     * @param geometryFragment
     * @param lightingModel Optional (will result in unlit if omitted)
     * @param lights Optional (do not render lights dynamically, allowing lighting to happen in 1 pass)
     */
    init: function(geometryVertexShader, geometryFragment, lightingModel, lights)
    {
        this._dirLights = null;
        this._dirLightCasters = null;
        this._pointLights = null;

        if (!lightingModel)
            this._setPass(HX.MaterialPass.BASE_PASS, new HX.UnlitPass(geometryVertexShader, geometryFragment));
        else if (lights)
            this._setPass(HX.MaterialPass.BASE_PASS, new HX.StaticLitPass(geometryVertexShader, geometryFragment, lightingModel, lights));
        //else
        //    this._initDynamicLitPasses(geometryVertexShader, geometryFragment, lightingModel)

        this._setPass(HX.MaterialPass.NORMAL_DEPTH_PASS, new HX.NormalDepthPass(geometryVertexShader, geometryFragment));
        this._setPass(HX.MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS, new HX.DirectionalShadowPass(geometryVertexShader, geometryFragment));

        // TODO: init dynamic light passes
        // TODO: init shadow passes
        // TODO: init depth/normal pass
    },

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
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

    _setPass: function (type, pass)
    {
        this._passes[type] = pass;

        if (pass) {
            if(type === HX.MaterialPass.DIR_LIGHT_PASS)
                pass.cullMode = HX.DirectionalLight.SHADOW_FILTER.getCullMode();

            //if(type === HX.GEOMETRY_NORMAL_PASS || type === HX.GEOMETRY_SPECULAR_PASS || type == HX.GEOMETRY_LINEAR_DEPTH_PASS)
            //    pass.depthTest = HX.Comparison.EQUAL;

            pass.elementType = this._elementType;

            for (var slotName in this._textures) {
                if (this._textures.hasOwnProperty(slotName))
                    pass.setTexture(slotName, this._textures[slotName]);
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