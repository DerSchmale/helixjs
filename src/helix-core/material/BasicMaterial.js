import {Color} from "../core/Color";
import {CullMode} from "../Helix";
import {Material} from "./Material";
import {MathX} from "../math/MathX";
import {ShaderLibrary} from "../shader/ShaderLibrary";

/**
 * @classdesc
 * BasicMaterial is the default physically plausible rendering material.
 *
 * @property {boolean} doubleSided Defines whether the material is double sided (no back-face culling) or not. An easier-to-read alternative to {@linkcode Material#cullMode}
 * @property {number} alpha The overall transparency of the object. Has no effect without a matching blendState value.
 * @property {boolean} useVertexColors Defines whether the material should use the hx_vertexColor attribute. Only available for meshes that have this attribute.
 * @property {Color} color The base color of the material. Multiplied with the colorMap if provided.
 * @property {Color} emissiveColor The emission color of the material. Multiplied with the emissionMap if provided.
 * @property {Texture2D} colorMap A {@linkcode Texture2D} object containing color data.
 * @property {Texture2D} normalMap A {@linkcode Texture2D} object containing surface normals.
 * @property {Texture2D} occlusionMap A {@linkcode Texture2D} object containing baked ambient occlusion.
 * @property {Texture2D} emissionMap A {@linkcode Texture2D} object containing color emission.
 * @property {Texture2D} specularMap A texture containing specular reflection data. The contents of the map depend on {@linkcode BasicMaterial#specularMapMode}. The roughness in the specular map is encoded as shininess; ie: lower values result in higher roughness to reflect the apparent brighness of the reflection. This is visually more intuitive.
 * @property {Texture2D} maskMap A {@linkcode Texture2D} object containing transparency data. Requires a matching blendState.
 * @property {number} specularMapMode Defines the contents of the specular map. One of the following:
 * <ul>
 *     <li>{@linkcode BasicMaterial#SPECULAR_MAP_ROUGHNESS_ONLY}</li>
 *     <li>{@linkcode BasicMaterial#SPECULAR_MAP_ALL}</li>
 *     <li>{@linkcode BasicMaterial#SPECULAR_MAP_SHARE_NORMAL_MAP}</li>
 *     <li>{@linkcode BasicMaterial#SPECULAR_MAP_METALLIC_ROUGHNESS}</li>
 * </ul>
 * @property {number} metallicness A value describing the overall "metallicness" of an object. Normally 0 or 1, but it can be used for some hybrid materials.
 * @property {number} normalSpecularReflectance The amount of light reflecting off a surface at 90 degrees (ie: the minimum reflectance in the Fresnel equation according to Schlick's approximation). This is generally 0.027 for most materials.
 * @property {number} roughness The microfacet roughness of the material. Higher values will result in dimmer but larger highlights.
 * @property {number} roughnessRange Represents the range at which the roughness map operates. When using a roughness texture, roughness represents the middle roughness, range the deviation from there. So textured roughness ranges from [roughness - roughnessRange, roughness + roughnessRange]
 * @property {number} alphaThreshold The alpha threshold that prevents pixels with opacity below this from being rendered. This is not recommended on certain mobile platforms due to depth buffer hierarchy performance.
 *
 * @constructor
 *
 * @param options An object with key/value pairs describing the initial values of the material.
 *
 * <ul>
 * <li>color: {@linkcode Color} or hexcode Number</li>
 * <li>colorMap: {@linkcode Texture2D}</li>
 * <li>doubleSided: Boolean</li>
 * <li>normalMap: {@linkcode Texture2D}</li>
 * <li>specularMap: {@linkcode Texture2D}</li>
 * <li>maskMap: {@linkcode Texture2D}</li>
 * <li>specularMapMode: {@linkcode BasicMaterial#SPECULAR_MAP_ROUGHNESS_ONLY}</li>
 * <li>metallicness: Number</li>
 * <li>alpha: Number</li>
 * <li>roughness: Number</li>
 * <li>roughnessRange: Number</li>
 * <li>normalSpecularReflectance: Number</li>
 * <li>alphaThreshold: Number</li>
 * <li>useVertexColors: Boolean</li>
 * <li>lightingModel: {@linkcode LightingModel}</li>
 * </ul>
 *
 * @extends Material
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BasicMaterial(options)
{
    Material.call(this);

    options = options || {};

    this._color = options.color || new Color(1, 1, 1, 1);
    this._emissiveColor = options.emissiveColor || new Color(0, 0, 0, 1);
    this._colorMap = options.colorMap || null;
    this._doubleSided = !!options.doubleSided;
    this._normalMap = options.normalMap || null;
    this._specularMap = options.specularMap || null;
    this._maskMap = options.maskMap || null;
    this._specularMapMode = options.specularMapMode || BasicMaterial.SPECULAR_MAP_ROUGHNESS_ONLY;
    this._metallicness = options.metallicness === undefined? 0.0 : options.metallicness;
    this._alpha = options.alpha === undefined? 1.0 : options.alpha;
    this._roughness = options.roughness === undefined ? 0.5 : options.roughness;
    this._roughnessRange = options.roughnessRange === undefined? .5 : options.roughnessRange;
    this._normalSpecularReflectance = options.normalSpecularReflectance === undefined? 0.027 : options.normalSpecularReflectance;
    this._alphaThreshold = options.alphaThreshold === undefined? 1.0 : options.alphaThreshold;
    this._useVertexColors = !!options.useVertexColors;

    // trigger assignments
    this.color = this._color;
    this.emissiveColor = this._emissiveColor;
    this.alpha = this._alpha;
    this.metallicness = this._metallicness;
    this.roughness = this._roughness;
    this.normalSpecularReflectance = this._normalSpecularReflectance;

    if (options.lightingModel !== undefined)
        this.lightingModel = options.lightingModel;
}

/**
 * Converts to roughness from a "shininess" or "gloss" property, traditionally used in Phong lighting.
 * @param specularPower The specular power used as the gloss parameter.
 */
BasicMaterial.roughnessFromShininess = function(specularPower)
{
    return Math.sqrt(2.0/(specularPower + 2.0));
};

/**
 * Used for specularMapMode to specify the specular map only uses roughness data
 */
BasicMaterial.SPECULAR_MAP_ROUGHNESS_ONLY = 1;
/**
 * Used for specularMapMode to specify the specular map has rgb channels containing roughness, normal reflectance and metallicness, respectively
 */
BasicMaterial.SPECULAR_MAP_ALL = 2;
/**
 * Used for specularMapMode to specify there is no explicit specular map, but roughness data is present in the alpha channel of the normal map.
 */
BasicMaterial.SPECULAR_MAP_SHARE_NORMAL_MAP = 3;
/**
 * Used for specularMapMode to specify the specular map has gb channels containing metallicness and roughness. This is the glTF standard.
 */
BasicMaterial.SPECULAR_MAP_METALLIC_ROUGHNESS = 4;


BasicMaterial.prototype = Object.create(Material.prototype,
    {
        doubleSided: {
            get: function()
            {
                return this._doubleSided;
            },

            set: function(value)
            {
                if (this._doubleSided !== value)
                    this._invalidate();

                this._doubleSided = value;
                this.cullMode = value? CullMode.NONE : CullMode.BACK;
            }
        },

        alpha: {
            get: function ()
            {
                return this._alpha;
            },
            set: function (value)
            {
                this._alpha = MathX.saturate(value);
                this.setUniform("alpha", this._alpha);
            }
        },

        useVertexColors: {
            get: function ()
            {
                return this._useVertexColors;
            },
            set: function (value)
            {
                if (this._useVertexColors !== value)
                    this._invalidate();

                this._useVertexColors = value;
            }
        },

        color: {
            get: function ()
            {
                return this._color;
            },
            set: function (value)
            {
                this._color = isNaN(value) ? value : new Color(value);
                this.setUniform("color", this._color);
            }
        },

        colorMap: {
            get: function ()
            {
                return this._colorMap;
            },

            set: function (value)
            {
                if (!!this._colorMap !== !!value) {
                    this._invalidate();
                }

                this._colorMap = value;

                this.setTexture("colorMap", value);
            }
        },

        normalMap: {
            get: function ()
            {
                return this._normalMap;
            },
            set: function (value)
            {
                if (!!this._normalMap !== !!value)
                    this._invalidate();

                this.setTexture("normalMap", value);

                this._normalMap = value;
            }
        },

        occlusionMap: {
            get: function ()
            {
                return this._occlusionMap;
            },
            set: function (value)
            {
                if (!!this._occlusionMap !== !!value)
                    this._invalidate();

                this.setTexture("occlusionMap", value);

                this._occlusionMap = value;
            }
        },

        emissiveColor: {
            get: function ()
            {
                return this._emissiveColor;
            },
            set: function (value)
            {
                this._emissiveColor = isNaN(value) ? value : new Color(value);
                this.setUniform("emissiveColor", this._emissiveColor);
            }
        },

        emissionMap: {
            get: function ()
            {
                return this._emissionMap;
            },
            set: function (value)
            {
                if (!!this._emissionMap !== !!value)
                    this._invalidate();

                this.setTexture("emissionMap", value);

                this._emissionMap = value;
            }
        },

        specularMap: {
            get: function ()
            {
                return this._specularMap;
            },
            set: function (value)
            {
                if (!!this._specularMap !== !!value)
                    this._invalidate();

                this.setTexture("specularMap", value);

                this._specularMap = value;
            }
        },

        maskMap: {
            get: function ()
            {
                return this._maskMap;
            },
            set: function (value)
            {
                if (!!this._maskMap !== !!value)
                    this._invalidate();

                this.setTexture("maskMap", value);

                this._maskMap = value;
            }
        },

        specularMapMode: {
            get: function ()
            {
                return this._specularMapMode;
            },
            set: function (value)
            {
                if (this._specularMapMode !== value)
                    this._invalidate();

                this._specularMapMode = value;
            }
        },

        metallicness: {
            get: function ()
            {
                return this._metallicness;
            },
            set: function (value)
            {
                this._metallicness = MathX.saturate(value);
                this.setUniform("metallicness", this._metallicness);
            }
        },

        normalSpecularReflectance: {
            get: function ()
            {
                return this._normalSpecularReflectance;
            },
            set: function (value)
            {
                this._normalSpecularReflectance = MathX.saturate(value);
                this.setUniform("normalSpecularReflectance", this._normalSpecularReflectance);
            }
        },

        roughness:
            {
                get: function ()
                {
                    return this._roughness;
                },

                set: function(value)
                {
                    this._roughness = value;
                    this.setUniform("roughness", this._roughness);
                }
            },

        roughnessRange:
            {
                get: function ()
                {
                    return this._roughnessRange;
                },

                set: function(value)
                {
                    this._roughnessRange = value;
                    this.setUniform("roughnessRange", this._roughnessRange * 2.0);
                }
            },

        alphaThreshold:
            {
                get: function() { return this._alphaThreshold; },
                set: function(value) {
                    value = MathX.saturate(value);
                    if ((this._alphaThreshold === 1.0) !== (value === 1.0))
                        this._invalidate();

                    this._alphaThreshold = value;
                    this.setUniform("alphaThreshold", value);
                }
            }
    }
);

/**
 * @ignore
 */
BasicMaterial.prototype.init = function()
{
    var defines = this._generateDefines();

    this._geometryVertexShader = ShaderLibrary.get("default_geometry_vertex.glsl", defines);
    this._geometryFragmentShader = ShaderLibrary.get("default_geometry_fragment.glsl", defines);

    Material.prototype.init.call(this);
};

/**
 * @ignore
 */
BasicMaterial.prototype._generateDefines = function()
{
    var defines = {};
    if (this._colorMap) defines.COLOR_MAP = 1;
    if (this._useVertexColors) defines.VERTEX_COLORS = 1;
    if (this._normalMap) defines.NORMAL_MAP = 1;
    if (this._occlusionMap) defines.OCCLUSION_MAP = 1;
    if (this._emissionMap) defines.EMISSION_MAP = 1;
    if (this._maskMap) defines.MASK_MAP = 1;
    if (this._alphaThreshold < 1.0) defines.ALPHA_THRESHOLD = 1;
    if (this._useSkinning) defines.HX_USE_SKINNING = 1;
    if (this._useMorphing) {
        defines.HX_USE_MORPHING = 1;

        if (this._useNormalMorphing)
            defines.HX_USE_NORMAL_MORPHING = 1;
    }

    switch (this._specularMapMode) {
        case BasicMaterial.SPECULAR_MAP_ROUGHNESS_ONLY:
            if (this._specularMap) defines.ROUGHNESS_MAP = 1;
            break;
        case BasicMaterial.SPECULAR_MAP_ALL:
            if (this._specularMap) defines.SPECULAR_MAP = 1;
            break;
        case BasicMaterial.SPECULAR_MAP_METALLIC_ROUGHNESS:
            if (this._specularMap) defines.METALLIC_ROUGHNESS_MAP = 1;
            break;
        default:
            defines.NORMAL_ROUGHNESS_MAP = 1;
    }

    if (this._doubleSided) {
        defines.DOUBLE_SIDED = 1;
    }

    return defines;
};

/**
 * @ignore
 */
BasicMaterial.prototype._setUseSkinning = function(value)
{
    if (this._useSkinning !== value)
        this._invalidate();

    this._useSkinning = value;
};

export { BasicMaterial };