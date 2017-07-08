import {CullMode, ElementType, META, BlendFactor, capabilities} from "../Helix";
import {DirectionalLight} from "../light/DirectionalLight";
import {Signal} from "../core/Signal";
import {MaterialPass} from "./MaterialPass";
import {UnlitPass} from "./UnlitPass";
import {DynamicLitBasePass} from "./DynamicLitBasePass";
import {DirectionalShadowPass} from "./DirectionalShadowPass";
import {GBufferNormalDepthPass} from "./GBufferNormalDepthPass";
import {DynamicLitDirPass} from "./DynamicLitDirPass";
import {BlendState} from "../render/BlendState";
import {DynamicLitPointPass} from "./DynamicLitPointPass";
import {DynamicLitProbePass} from "./DynamicLitProbePass";
import {GBufferSpecularPass} from "./GBufferSpecularPass";
import {GBufferAlbedoPass} from "./GBufferAlbedoPass";
import {GBufferFullPass} from "./GBufferFullPass";
import {ApplyGBufferPass} from "./ApplyGBufferPass";

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

    this._name = null;
    this._ssao = false;
    this._geometryVertexShader = geometryVertexShader;
    this._geometryFragmentShader = geometryFragmentShader;
    this._lightingModel = lightingModel || META.OPTIONS.defaultLightingModel;

    this._initialized = false;
    this._blendState = null;
    this._additiveBlendState = BlendState.ADD;    // additive blend state is used for dynamic lighting
    this._needsNormalDepth = false;
    this._needsBackbuffer = false;
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

        if (!this._lightingModel)
            this.setPass(MaterialPass.BASE_PASS, new UnlitPass(this._geometryVertexShader, this._geometryFragmentShader));
        else if (this._lightingModel !== META.OPTIONS.defaultLightingModel || this._blendState) {
            this.setPass(MaterialPass.BASE_PASS, new DynamicLitBasePass(this._geometryVertexShader, this._geometryFragmentShader));

            this.setPass(MaterialPass.DIR_LIGHT_PASS, new DynamicLitDirPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, false));
            this.setPass(MaterialPass.DIR_LIGHT_SHADOW_PASS, new DynamicLitDirPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, true));
            this.setPass(MaterialPass.POINT_LIGHT_PASS, new DynamicLitPointPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel));
            this.setPass(MaterialPass.LIGHT_PROBE_PASS, new DynamicLitProbePass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, this._ssao));
        }
        else {
            // deferred lighting forward pass
            this.setPass(MaterialPass.BASE_PASS, new ApplyGBufferPass(this._geometryVertexShader, this._geometryFragmentShader));
        }

        this.setPass(MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS, new DirectionalShadowPass(this._geometryVertexShader, this._geometryFragmentShader));

        if (capabilities.GBUFFER_MRT) {
            this.setPass(MaterialPass.GBUFFER_PASS, new GBufferFullPass(this._geometryVertexShader, this._geometryFragmentShader));
        }
        else {
            this.setPass(MaterialPass.GBUFFER_ALBEDO_PASS, new GBufferAlbedoPass(this._geometryVertexShader, this._geometryFragmentShader));
            this.setPass(MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, new GBufferNormalDepthPass(this._geometryVertexShader, this._geometryFragmentShader));
            this.setPass(MaterialPass.GBUFFER_SPECULAR_PASS, new GBufferSpecularPass(this._geometryVertexShader, this._geometryFragmentShader));
        }

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
        if (value) {
            this._additiveBlendState = value.clone();
            this._additiveBlendState.dstFactor = BlendFactor.ONE;
        }
        else {
            this._additiveBlendState = BlendState.ADD;
        }

        // blend state can require different render path, so shaders need to adapt
        this._invalidate();
    },

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
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

        if (!value && this._passes[MaterialPass.GBUFFER_NORMAL_DEPTH_PASS]) {
            this._passes[MaterialPass.GBUFFER_NORMAL_DEPTH_PASS] = null;
        }
        else if (value && !this._passes[MaterialPass.GBUFFER_NORMAL_DEPTH_PASS])
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

            if (type === MaterialPass.DIR_LIGHT_PASS || type === MaterialPass.DIR_LIGHT_SHADOW_PASS || type === MaterialPass.POINT_LIGHT_PASS || type === MaterialPass.LIGHT_PROBE_PASS)
                pass.blendState = this._additiveBlendState;
            else if (type !== MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS && type !== MaterialPass.GBUFFER_NORMAL_DEPTH_PASS)
                pass.blendState = this._blendState;

            if (pass.getTextureSlot("hx_gbufferNormalDepth"))
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
        var pass = this.getPass(MaterialPass.BASE_PASS);
        if (pass) pass._setSSAOTexture(texture)
        pass = this.getPass(MaterialPass.BASE_PASS);
        if (pass) pass._setSSAOTexture(texture)
    },

    toString: function()
    {
        return "[Material(name=" + this._name + ")]";
    }
};

export { Material };