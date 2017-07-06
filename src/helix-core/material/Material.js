import {CullMode, ElementType, META} from "../Helix";
import {DirectionalLight} from "../light/DirectionalLight";
import {Signal} from "../core/Signal";
import {MaterialPass} from "./MaterialPass";
import {UnlitPass} from "./UnlitPass";
import {DynamicLitBasePass} from "./DynamicLitBasePass";
import {StaticLitPass} from "./StaticLitPass";
import {DirectionalShadowPass} from "./DirectionalShadowPass";
import {LightingModel} from "../render/LightingModel";
import {NormalDepthPass} from "./NormalDepthPass";

/**
 *
 * @constructor
 */
var MATERIAL_ID_COUNTER = 0;

function Material(geometryVertexShader, geometryFragmentShader, lightingModel)
{
    this._elementType = ElementType.TRIANGLES;
    this._cullMode = CullMode.BACK;
    this._writeDepth = true;
    this._passes = new Array(Material.NUM_PASS_TYPES);
    this._renderOrderHint = ++MATERIAL_ID_COUNTER;
    // forced render order by user:
    this._renderOrder = 0;
    this.onChange = new Signal();
    this._textures = {};
    this._uniforms = {};
    this._useMorphing = false;
    this._useSkinning = false;

    this._lights = null;
    this._name = null;
    this._ssao = false;
    this._geometryVertexShader = geometryVertexShader;
    this._geometryFragmentShader = geometryFragmentShader;
    this._lightingModel = lightingModel || META.OPTIONS.defaultLightingModel;

    this._initialized = false;
    this._blendState = null;
    this._needsNormalDepth = false;
    this._needsBackbuffer = false;
    this._dynamicLighting = false;

    // this is an internal property used in rendering dynamic lights
    // set to true when collected (ie: before any rendering is done)
    // set to false whenever a dynamic lighting pass is rendered, so the following passes can work additively
    this._firstPass = false;
}

Material.ID_COUNTER = 0;

Material.prototype =
{
    init: function()
    {
        if (this._initialized || !this._geometryVertexShader || !this._geometryFragmentShader)
            return;

        this._needsNormalDepth = false;
        this._needsBackbuffer = false;
        this._dirLights = null;
        this._dirLightCasters = null;
        this._pointLights = null;
        this._dynamicLighting = false;

        if (!this._lightingModel)
            this.setPass(MaterialPass.BASE_PASS, new UnlitPass(this._geometryVertexShader, this._geometryFragmentShader));
        else if (this._lights)
            this.setPass(MaterialPass.BASE_PASS, new StaticLitPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, this._lights, this._ssao));
        else {
            this._dynamicLighting = true;
            this.setPass(MaterialPass.BASE_PASS, new DynamicLitBasePass(this._geometryVertexShader, this._geometryFragmentShader));

            // TODO: base pass should only be included if there's emission, and probably rendered AFTER the lights (additively)
            //    this._initDynamicLitPasses(geometryVertexShader, geometryFragment, lightingModel)
            // how to know if this pass has been rendered already? renderMark check?
        }

        this.setPass(MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS, new DirectionalShadowPass(this._geometryVertexShader, this._geometryFragmentShader));

        if (!this._needsNormalDepth && this._writeDepth)
            this.setPass(MaterialPass.NORMAL_DEPTH_PASS, new NormalDepthPass(this._geometryVertexShader, this._geometryFragmentShader));

        this._initialized = true;
        // TODO: init dynamic light passes
    },

    get initialized() { return this._initialized; },

    get ssao() { return this._ssao; },
    set ssao(value)
    {
        if (this._ssao === value) return;
        this._ssao = value;
        this._invalidate();
    },

    get blendState()
    {
        return this._blendState;
    },

    set blendState(value)
    {
        this._blendState = value;

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (i !== MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS && i !== MaterialPass.NORMAL_DEPTH_PASS && this._passes[i])
                this._passes[i].blendState = value;
        }
    },

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
        if (!this._lightingModel && value) this._lightingModel = LightingModel.GGX;
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
        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].elementType = value;
        }
    },

    get writeDepth()
    {
        return this._writeDepth;
    },

    set writeDepth(value)
    {
        this._writeDepth = value;

        if (!value && this._passes[MaterialPass.NORMAL_DEPTH_PASS]) {
            this._passes[MaterialPass.NORMAL_DEPTH_PASS] = null;
        }
        else if (value && !this._passes[MaterialPass.NORMAL_DEPTH_PASS])
            this._invalidate();

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].writeDepth = value;

        }
    },

    get cullMode()
    {
        return this._cullMode;
    },

    set cullMode(value)
    {
        this._cullMode = value;
        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (i !== MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS && this._passes[i])
                this._passes[i].cullMode = value;
        }
    },

    getPass: function (type)
    {
        if (!this._initialized) this.init();
        return this._passes[type];
    },

    setPass: function (type, pass)
    {
        this._passes[type] = pass;

        if (pass) {
            if(type === MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS)
                pass.cullMode = DirectionalLight.SHADOW_FILTER.getCullMode();
            else
                pass.cullMode = this._cullMode;

            pass.elementType = this._elementType;
            pass.writeDepth = this._writeDepth; // TODO: this should probably only be true on base pass

            if (type !== MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS && type !== MaterialPass.NORMAL_DEPTH_PASS)
                pass.blendState = this._blendState;

            if (pass.getTextureSlot("hx_normalDepth"))
                this._needsNormalDepth = true;

            if (pass.getTextureSlot("hx_backbuffer"))
                this._needsBackbuffer = true;

            for (var slotName in this._textures) {
                if (this._textures.hasOwnProperty(slotName)) {
                    var texture = this._textures[slotName];
                    if (texture instanceof Array)
                        pass.setTextureArray(slotName, texture);
                    else
                        pass.setTexture(slotName, texture);
                }
            }

            for (var uniformName in this._uniforms) {
                if (this._uniforms.hasOwnProperty(uniformName)) {
                    if (uniformName.charAt(uniformName.length - 1) === ']')
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
        if (!this._initialized) this.init();
        return !!this._passes[type];
    },

    setTexture: function(slotName, texture)
    {
        if (texture)
            this._textures[slotName] = texture;
        else
            delete this._textures[slotName];

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i)
            if (this.hasPass(i)) this._passes[i].setTexture(slotName, texture);
    },

    setTextureArray: function(slotName, textures)
    {
        if (textures)
            this._textures[slotName] = textures;
        else
            delete this._textures[slotName];

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i)
            if (this.hasPass(i)) this._passes[i].setTextureArray(slotName, textures);
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

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
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

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniformArray(name, value);
        }
    },

    _setUseSkinning: function(value)
    {
        this._useSkinning = value;
    },

    _setUseMorphing: function(value)
    {
        this._useMorphing = value;
    },

    _invalidate: function()
    {
        this._initialized = false;
        this._passes = new Array(Material.NUM_PASS_TYPES);
        this.onChange.dispatch();
    },

    _setSSAOTexture: function(texture)
    {
        if (this._lights && this._lightingModel)
            this.getPass(MaterialPass.BASE_PASS)._setSSAOTexture(texture);
    },

    toString: function()
    {
        return "[Material(name=" + this._name + ")]";
    }
};

export { Material };