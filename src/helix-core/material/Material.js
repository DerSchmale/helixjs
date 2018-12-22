import {CullMode, META, BlendFactor, capabilities} from "../Helix";
import {Signal} from "../core/Signal";
import {MaterialPass} from "./MaterialPass";
import {UnlitPass} from "./passes/UnlitPass";
import {DirectionalShadowPass} from "./passes/DirectionalShadowPass";
import {BlendState} from "../render/BlendState";
import {DirectionalLightingPass} from "./passes/DirectionalLightingPass";
import {TiledLitPass} from "./passes/TiledLitPass";
import {DynamicLitBasePass} from "./passes/DynamicLitBasePass";
import {FixedLitPass} from "./passes/FixedLitPass";
import {PointLightingPass} from "./passes/PointLightingPass";
import {SpotLightingPass} from "./passes/SpotLightingPass";
import {NormalDepthPass} from "./passes/NormalDepthPass";
import {RenderPath} from "../render/RenderPath";
import {PointShadowPass} from "./passes/PointShadowPass";
import {DynamicLitBaseProbesPass} from "./passes/DynamicLitBaseProbesPass";
import {MotionVectorPass} from "./passes/MotionVectorPass";

/**
 * @ignore
 */
var MATERIAL_ID_COUNTER = 0;

/**
 * @classdesc
 * Material is a base class for materials. It splits up into two components: the geometry stage, and the lighting model.
 *
 * @constructor
 *
 * @param geometryVertexShader The vertex code for the geometry stage.
 * @param geometryFragmentShader The fragment code for the geometry stage.
 * @param [lightingModel] The {@linkcode LightingModel} to use. Defaults to what was passed in (if anything) with {@linkcode InitOptions#defaultLightingModel}.
 *
 * @property name The name of the material.
 * @property renderOrder A Number that can force the order in which the material is rendered. Higher values will be rendered later!
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Material(geometryVertexShader, geometryFragmentShader, lightingModel)
{
    // dispatched when the material's code changed and a link with a mesh may have become invalid
    this.onChange = new Signal();

	this.name = "hx_material_" + MATERIAL_ID_COUNTER;
    this._cullMode = CullMode.BACK;
    this._debugMode = 0;
    this._writeDepth = true;
    this._writeColor = true;
    this._passes = new Array(Material.NUM_PASS_TYPES);

	this.renderOrder = 0; // forced render order by user:
    this._renderOrderHint = MATERIAL_ID_COUNTER; // automatic render order to limit pass switches by engine
    this._shaderRenderOrderHint = 0; // automatic render order to limit program switches by engine

    this._renderPath = null;
    this._textures = {};
    this._uniforms = {};
    this._fixedLights = null;
    this._useMorphing = false;
    this._useNormalMorphing = false;
    this._useSkinning = false;
    this._useInstancing = false;

    this._geometryVertexShader = geometryVertexShader;
    this._geometryFragmentShader = geometryFragmentShader;
    this._lightingModel = lightingModel || META.OPTIONS.defaultLightingModel;
	this._useTranslucency = false;

    this._initialized = false;
    this._blendState = null;
    this._additiveBlendState = BlendState.ADD;    // additive blend state is used for dynamic lighting

    this.needsNormalDepth = false;
    this.needsBackBuffer = false;

    ++MATERIAL_ID_COUNTER;
}

Material.ID_COUNTER = 0;

Material.DEBUG_NONE = 0;
Material.DEBUG_NORMALS = 1;

Material.prototype =
{
    /**
     * @ignore
     */
    init: function()
    {
        if (this._initialized || !this._geometryVertexShader || !this._geometryFragmentShader)
            return;

        this.needsNormalDepth = false;
        this.needsBackBuffer = false;

        var vertex = this._geometryVertexShader;
        var fragment = this._geometryFragmentShader;
        var defines = {};

        if (this._debugMode === 1)
			defines.HX_DEBUG_NORMALS = 1;

        if (this._useSkinning)
			defines.HX_USE_SKINNING = 1;

        if (this._useInstancing)
			defines.HX_USE_INSTANCING = 1;

        if (this._useMorphing) {
			defines.HX_USE_MORPHING = 1;

            if (this._useNormalMorphing)
				defines.HX_USE_NORMAL_MORPHING = 1;
        }

        var lightingModel = this._lightingModel;

        if (this._useTranslucency)
			defines.HX_USE_TRANSLUCENCY = 1;

        if (!lightingModel || this._debugMode) {
            this._renderPath = RenderPath.FORWARD_FIXED;
            var pass = new UnlitPass(vertex, fragment, this._debugMode, defines);
            this.setPass(MaterialPass.BASE_PASS, pass);
            this.setPass(MaterialPass.BASE_PASS_PROBES, pass);
        }
        else if (this._fixedLights) {
            pass = new FixedLitPass(vertex, fragment, lightingModel, this._fixedLights, defines);
            this._renderPath = RenderPath.FORWARD_FIXED;
            this.setPass(MaterialPass.BASE_PASS, pass);
            this.setPass(MaterialPass.BASE_PASS_PROBES, pass);
        }
        else if (capabilities.WEBGL_2) {
            this._renderPath = RenderPath.FORWARD_DYNAMIC;
            var pass = new TiledLitPass(vertex, fragment, lightingModel, defines);
            this.setPass(MaterialPass.BASE_PASS, pass);
            this.setPass(MaterialPass.BASE_PASS_PROBES, pass);
        }
        else {
            this._renderPath = RenderPath.FORWARD_DYNAMIC;

            this.setPass(MaterialPass.BASE_PASS, new DynamicLitBasePass(vertex, fragment, defines));

            this.setPass(MaterialPass.DIR_LIGHT_PASS, new DirectionalLightingPass(vertex, fragment, lightingModel, defines));
            this.setPass(MaterialPass.POINT_LIGHT_PASS, new PointLightingPass(vertex, fragment, lightingModel, defines));
            this.setPass(MaterialPass.SPOT_LIGHT_PASS, new SpotLightingPass(vertex, fragment, lightingModel, defines));

			this.setPass(MaterialPass.BASE_PASS_PROBES, new DynamicLitBaseProbesPass(vertex, fragment, defines));
        }

        this.setPass(MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS, new DirectionalShadowPass(vertex, fragment, defines));
        this.setPass(MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS, new PointShadowPass(vertex, fragment, defines));

        this.setPass(MaterialPass.NORMAL_DEPTH_PASS, new NormalDepthPass(vertex, fragment, defines));
        this.setPass(MaterialPass.MOTION_VECTOR_PASS, new MotionVectorPass(vertex, fragment, defines));

        // We will also need to order per shader
        this._shaderRenderOrderHint = this._passes[MaterialPass.BASE_PASS].shader.renderOrderHint;

        this._initialized = true;
    },

    /**
     * Whether or not the Material was initialized and ready to use.
     * @ignore
     */
    get initialized() { return this._initialized; },

	/**
     * Allows setting the output to something different than the lit material, such as normals.
	 */
	get debugMode()
    {
        return this._debugMode;
    },

    set debugMode(value)
    {
        if (this._debugMode !== value)
            this._invalidate();

        this._debugMode = value;
    },

    /**
     * The blend state used for this material.
     *
     * @see {@linkcode BlendState}
     */
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

    /**
     * Allows setting a specific set of lights to this material, avoiding having to figure out lighting dynamically.
     * This will cause all lighting to happen in a single pass, which is generally *much* faster than any other option.
     */
    get fixedLights()
    {
        return this._fixedLights;
    },

    set fixedLights(value)
    {
        this._fixedLights = value;
        this._invalidate();
    },

    /**
     * The {@options LightingModel} used to light this material.
     */
    get lightingModel()
    {
        return this._lightingModel;
    },

    set lightingModel(value)
    {
        this._lightingModel = value;
        this._invalidate();
    },

    /**
     * Defines whether or not this material should write depth information.
     */
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

    /**
     * Defines whether or not this material should write color information. This should only be used for some special
     * cases.
     */
    get writeColor()
    {
        return this._writeColor;
    },

    set writeColor(value)
    {
        this._writeColor = value;

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].writeColor = value;
        }
    },

    /**
     * Defines how back-face culling is applied. One of {@linkcode CullMode}.
     */
    get cullMode()
    {
        return this._cullMode;
    },

    set cullMode(value)
    {
        this._cullMode = value;
        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (i !== MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS  &&
                i !== MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS &&
                this._passes[i])
                this._passes[i].cullMode = value;
        }
    },

    /**
     * @ignore
     */
    get renderPath()
    {
        // make sure that if we request the path, it's figured out
        if (!this._initialized) this.init();
        return this._renderPath;
    },

    /**
     * @ignore
     */
    getPass: function (type)
    {
        if (!this._initialized) this.init();
        return this._passes[type];
    },

    /**
     * @ignore
     */
    setPass: function (type, pass)
    {
        this._passes[type] = pass;

        if (pass) {

            if(type === MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS || type === MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS)
                pass.cullMode = META.OPTIONS.shadowFilter.getCullMode();
            else
                pass.cullMode = this._cullMode;

            pass.writeDepth = this._writeDepth;
            pass.writeColor = this._writeColor;

            // one of the lit ones
            if (type >= MaterialPass.DIR_LIGHT_PASS && type <= MaterialPass.SPOT_LIGHT_PASS)
                pass.blendState = this._additiveBlendState;

            if (type === MaterialPass.BASE_PASS || type === MaterialPass.BASE_PASS_PROBES)
                pass.blendState = this._blendState;

            if (pass.hasTexture("hx_normalDepthBuffer"))
                this.needsNormalDepth = true;

            if (pass.hasTexture("hx_backBuffer"))
                this.needsBackBuffer = true;

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

    /**
     * @ignore
     */
    hasPass: function (type)
    {
        if (!this._initialized) this.init();
        return !!this._passes[type];
    },

    /**
     * Assigns a texture to the shaders with a given name.
     * @param {string} slotName The name of the texture as it appears in the shader code.
     * @param {Texture2D} texture The texture to assign
     */
    setTexture: function(slotName, texture)
    {
        if (texture)
            this._textures[slotName] = texture;
        else
            delete this._textures[slotName];

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i)
            if (this._passes[i]) this._passes[i].setTexture(slotName, texture);
    },

    /**
     * Assigns a texture array to the shaders with a given name.
     * @param {string} slotName The name of the texture array as it appears in the shader code.
     * @param {Array} texture An Array of {@linkcode Texture2D} objects
     */
    setTextureArray: function(slotName, textures)
    {
        if (textures)
            this._textures[slotName] = textures;
        else
            delete this._textures[slotName];

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i)
            if (this._passes[i]) this._passes[i].setTextureArray(slotName, textures);
    },

    /**
     * Sets a uniform value to the shaders.
     * @param name The uniform name as it appears in the shader code.
     * @param value The uniform value. For vectors, this can be a {@linkcode Float2}, {@linkcode Float4}, or an Array
     * @param [overwrite] If the value was already set, ignore the new value. Defaults to true.
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
     * Sets the value for a uniform array to the shaders.
     * @param name The uniform array name as it appears in the shader code.
     * @param value An array of values.
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

    /**
     * @ignore
     */
    _setUseSkinning: function(value)
    {
        if (this._useSkinning !== value)
            this._invalidate();

        this._useSkinning = value;
    },

    /**
     * @ignore
     */
    _setUseInstancing: function(value)
    {
        if (this._useInstancing !== value)
            this._invalidate();

        this._useInstancing = value;
    },

    /**
     * @ignore
     */
    _setUseMorphing: function(positions, normals)
    {
        if (this._useSkinning !== positions || this._useNormalMorphing !== normals)
            this._invalidate();

        this._useMorphing = positions;
        this._useNormalMorphing = normals;
    },

    /**
     * Called by subclasses when their shaders are invalidated
     * @ignore
     */
    _invalidate: function()
    {
        this._initialized = false;
        this._passes = new Array(Material.NUM_PASS_TYPES);
        this.onChange.dispatch();
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[Material(name=" + this.name + ")]";
    }
};

export { Material };