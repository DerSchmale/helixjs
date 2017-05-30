/**
 * BasicMaterial is the default physically plausible rendering material.
 * @constructor
 */
HX.BasicMaterial = function(options)
{
    HX.Material.call(this);

    options = options || {};

    this._color = options.color || new HX.Color(1, 1, 1, 1);
    this._colorMap = options.colorMap || null;
    this._doubleSided = !!options.doubleSided;
    this._normalMap = options.normalMap || null;
    this._specularMap = options.specularMap || null;
    this._maskMap = options.maskMap || null;
    this._specularMapMode = options.specularMapMode || HX.BasicMaterial.SPECULAR_MAP_ROUGHNESS_ONLY;
    this._metallicness = options.metallicness === undefined? 0.0 : options.metallicness;
    this._alpha = options.alpha === undefined? 1.0 : options.alpha;
    this._roughness = options.roughness === undefined ? 0.5 : options.roughness;
    this._roughnessRange = options.roughnessRange === undefined? .5 : options.roughnessRange;
    this._normalSpecularReflectance = options.normalSpecularReflectance === undefined? 0.027 : options.normalSpecularReflectance;
    this._alphaThreshold = options.alphaThreshold === undefined? 1.0 : options.alphaThreshold;
    this._useVertexColors = !!options.useVertexColors;

    // trigger assignments
    this.color = this._color;
    this.alpha = this._alpha;
    this.metallicness = this._metallicness;
    this.roughness = this._roughness;
    this.normalSpecularReflectance = this._normalSpecularReflectance;

    if (options.lightingModel !== undefined)
        this.lightingModel = options.lightingModel;
};

HX.BasicMaterial.roughnessFromShininess = function(specularPower)
{
    return Math.sqrt(2.0/(specularPower + 2.0));
};

/**
 * used for specularMapMode to specify the specular map only uses roughness data
 */
HX.BasicMaterial.SPECULAR_MAP_ROUGHNESS_ONLY = 1;
/**
 * used for specularMapMode to specify the specular map has rgb channels containing roughness, normal reflectance and metallicness, respectively
 */
HX.BasicMaterial.SPECULAR_MAP_ALL = 2;
/**
 * used for specularMapMode to specify there is no explicit specular map, but roughness data is present in the alpha channel of the normal map.
 */
HX.BasicMaterial.SPECULAR_MAP_SHARE_NORMAL_MAP = 3;


HX.BasicMaterial.prototype = Object.create(HX.Material.prototype,
    {
        doubleSided: {
            get: function()
            {
                return this._doubleSided;
            },

            set: function(value)
            {
                this._doubleSided = value;

                for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
                    if (this._passes[i])
                        this._passes[i].cullMode = value ? HX.CullMode.NONE : HX.CullMode.BACK;
                }
            }
        },

        alpha: {
            get: function ()
            {
                return this._alpha;
            },
            set: function (value)
            {
                this._alpha = HX.saturate(value);
                this.setUniform("alpha", this._alpha);
            }
        },

        // this can ONLY be used if the MeshData was created with a hx_vertexColor attribute!
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
                this._color = isNaN(value) ? value : new HX.Color(value);
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

        /**
         * The roughness in the specular map is encoded as shininess; ie: lower values result in higher roughness to reflect the apparent brighness of the reflection. This is visually more intuitive.
         */
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
                this._metallicness = HX.saturate(value);
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
                this._normalSpecularReflectance = HX.saturate(value);
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

        /**
         * When using a roughness texture, roughness represents the middle roughness, range the deviation from there.
         * So textured roughness ranges from [roughness - roughnessRange, roughness + roughnessRange]
         */
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
                    value = HX.saturate(value);
                    if ((this._alphaThreshold === 1.0) != (value === 1.0))
                        this._invalidate();

                    this._alphaThreshold = value;
                    this.setUniform("alphaThreshold", value);
                }
            }
    }
);

HX.BasicMaterial.prototype.init = function()
{
    var defines = this._generateDefines();

    this._geometryVertexShader = HX.ShaderLibrary.get("default_geometry_vertex.glsl", defines);
    this._geometryFragmentShader = HX.ShaderLibrary.get("default_geometry_fragment.glsl", defines);

    HX.Material.prototype.init.call(this);
};

HX.BasicMaterial.prototype._generateDefines = function()
{
    var defines = {};
    if (this._colorMap) defines.COLOR_MAP = 1;
    if (this._useVertexColors) defines.VERTEX_COLORS = 1;
    if (this._normalMap) defines.NORMAL_MAP = 1;
    if (this._maskMap) defines.MASK_MAP = 1;
    if (this._alphaThreshold < 1.0) defines.ALPHA_THRESHOLD = 1;
    if (this._useSkinning) defines.USE_SKINNING = 1;

    switch (this._specularMapMode) {
        case HX.BasicMaterial.SPECULAR_MAP_ROUGHNESS_ONLY:
            if (this._specularMap) defines.ROUGHNESS_MAP = 1;
            break;
        case HX.BasicMaterial.SPECULAR_MAP_ALL:
            if (this._specularMap) defines.SPECULAR_MAP = 1;
        default:
            defines.NORMAL_ROUGHNESS_MAP = 1;
    }
    return defines;
};

HX.BasicMaterial.prototype._setUseSkinning = function(value)
{
    if (this._useSkinning !== value)
        this._invalidate();

    this._useSkinning = value;
};