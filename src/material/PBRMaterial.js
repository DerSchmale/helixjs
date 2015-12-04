/**
 * PBRMaterial is a default physically plausible rendering material.
 * @constructor
 */
HX.PBRMaterial = function()
{
    HX.Material.call(this);
    this._passesInvalid = true;
    this._color = new HX.Color(1, 1, 1, 1);
    this._colorMap = null;
    this._doubleSided = false;
    this._normalMap = null;
    this._specularMap = null;
    this._maskMap = null;
    this._specularMapMode = HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY;
    this._metallicness = 0.0;
    this._roughness = 0.3;
    this._specularNormalReflection = 0.027;
    this._refractiveRatio = 1.0 / 1.33;
    this._transparent = false;
    this._refract = false;
    this._alphaThreshold = 1.0;

    // trigger assignments
    this.color = this._color;
    this.alpha = 1.0;
    this.metallicness = this._metallicness;
    this.roughness = this._roughness;
    this.specularNormalReflection = this._specularNormalReflection;
    this.refractiveRatio = this._refractiveRatio;
};

/**
 * used for specularMapMode to specify the specular map only uses roughness data
 */
HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY = 1;
/**
 * used for specularMapMode to specify the specular map has rgb channels containing roughness, normal reflectance and metallicness, respectively
 */
HX.PBRMaterial.SPECULAR_MAP_ALL = 2;
/**
 * used for specularMapMode to specify there is no explicit specular map, but roughness data is present in the alpha channel of the normal map.
 */
HX.PBRMaterial.SPECULAR_MAP_SHARE_NORMAL_MAP = 3;


HX.PBRMaterial.prototype = Object.create(HX.Material.prototype,
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

        // only used with TransparencyMode.ALPHA
        alpha: {
            get: function ()
            {
                return this._alpha;
            },
            set: function (value)
            {
                this._alpha = HX.saturate(value);
                this.setUniform("alpha", this._alpha);

                this.transparencyMode = value === 1.0? HX.TransparencyMode.OPAQUE : HX.TransparencyMode.ALPHA;
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
                if (!!this._colorMap !== !!value)
                    this._passesInvalid = true;

                if (!this._passesInvalid && value)
                    this.setTexture("colorMap", value);

                this._colorMap = value;
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
                    this._passesInvalid = true;

                if (!this._passesInvalid && value)
                    this.setTexture("normalMap", value);

                this._normalMap = value;
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
                    this._passesInvalid = true;

                if (!this._passesInvalid && value)
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
                    this._passesInvalid = true;

                if (!this._passesInvalid && value)
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
                if (this._specularMapMode != value)
                    this._passesInvalid = true;

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

        specularNormalReflection: {
            get: function ()
            {
                return this._specularNormalReflection;
            },
            set: function (value)
            {
                this._specularNormalReflection = HX.saturate(value);
                this.setUniform("specularNormalReflection", this._specularNormalReflection);
            }
        },

        roughness: {
            get: function ()
            {
                return this._roughness;
            },
            set: function (value)
            {
                this._roughness = HX.saturate(value);
                this.setUniform("roughness", this._roughness);
            }
        },

        // TODO: Provide transparency modes:
        //  - alpha
        //  - absorbant
        //  - absorbant no specular (for performance, removes gbuffer passes)
        transparent:
        {
            get: function() { return this._transparent; },
            set: function(value) {
                // only specular will be output to hdr buffer, so additive
                if (this._transparent !== value)
                    this._passesInvalid = true;

                this._transparent = value;
                this._transparencyMode = value? HX.TransparencyMode.ADDITIVE : HX.TransparencyMode.OPAQUE;
            }
        },

        refract:
        {
            get: function() { return this._refract; },
            set: function(value) {
                if (this._refract !== value)
                    this._passesInvalid = true;

                this._refract = HX.saturate(value);
            }
        },

        refractiveRatio:
        {
            get: function() { return this._refractiveRatio; },
            set: function(value) {
                this._refractiveRatio = value;
                this.setUniform("refractiveRatio", value);
            }
        },

        alphaThreshold:
        {
            get: function() { return this._alphaThreshold; },
            set: function(value) {
                value = HX.saturate(value);
                if ((this._alphaThreshold === 1.0) != (value === 1.0))
                    this._passesInvalid = true;
                this._alphaThreshold = value;
                this.setUniform("alphaThreshold", value);
            }
        }
    }
);


HX.PBRMaterial.prototype.getPass = function(type)
{
    if (this._passesInvalid)
        this._updatePasses();

    return HX.Material.prototype.getPass.call(this, type);
};

HX.PBRMaterial.prototype._clearPasses = function()
{
    for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
        this.setPass(i, null);
};

HX.PBRMaterial.prototype._updatePasses = function()
{
    this._clearPasses();

    var colorDefines = this._generateColorDefines();
    var normalDefines = this._generateNormalDefines();
    var specularDefines = this._generateSpecularDefines();
    var generalDefines = this._generateGeneralDefines();

    // TODO: this is something every material should have to do, so perhaps it should work differently?
    if (this._transparent) {
        // this is actually the same code as simple albedo output, but multiplicative blending
        if (this._refract) {
            var defines = normalDefines + colorDefines + generalDefines;
            this._initPass(HX.MaterialPass.POST_PASS, defines, "default_refract_vertex.glsl", "default_refract_fragment.glsl");
        }
        else {
            var defines = "#define HX_NO_MRT_GBUFFER_COLOR\n" + normalDefines + colorDefines + generalDefines;
            var pass = this._initPass(HX.MaterialPass.POST_LIGHT_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
            pass.blendState = HX.BlendState.MULTIPLY;
        }
    }

    var colorPass;
    if (HX.EXT_DRAW_BUFFERS) {
        var defines = colorDefines + normalDefines + specularDefines + generalDefines;
        colorPass = this._initPass(HX.MaterialPass.GEOMETRY_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }
    else {
        colorDefines = "#define HX_NO_MRT_GBUFFER_COLOR\n" + colorDefines + generalDefines;
        normalDefines = "#define HX_NO_MRT_GBUFFER_NORMALS\n" + normalDefines + generalDefines;
        specularDefines = "#define HX_NO_MRT_GBUFFER_SPECULAR\n" + specularDefines + generalDefines;
        colorPass = this._initPass(HX.MaterialPass.GEOMETRY_COLOR_PASS, colorDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS, normalDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS, specularDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }

    // need to initialize shadow map pass if its index is not -1
    if (HX.MaterialPass.SHADOW_MAP_PASS !== -1) {
        var defines = "#define HX_SHADOW_MAP_PASS\n" + generalDefines;
        this._initPass(HX.MaterialPass.SHADOW_MAP_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }

    this.setUniform("color", this._color);
    this.setUniform("alpha", this._alpha);
    this.setUniform("alphaThreshold", this._alphaThreshold);

    if (this._colorMap) this.setTexture("colorMap", this._colorMap);
    if (this._normalMap) this.setTexture("normalMap", this._normalMap);
    if (this._specularMap) this.setTexture("specularMap", this._specularMap);

    if (this._transparent) {
        // do not assign texture or color if transparent (albedo will be black)
        colorPass.setUniform("color", new HX.Color(0, 0, 0, 1));
        colorPass.setTexture("colorMap", null);
    }

    this._passesInvalid = false;
};

HX.PBRMaterial.prototype._generateColorDefines = function()
{
    return !!this._colorMap? "#define COLOR_MAP\n" : "";
};

HX.PBRMaterial.prototype._generateNormalDefines = function()
{
    return !!this._normalMap? "#define NORMAL_MAP\n" : "";
};

HX.PBRMaterial.prototype._generateGeneralDefines = function()
{
    var defines = "";
    if (this._maskMap) defines += "#define MASK_MAP\n";
    if (this._alphaThreshold < 1.0) defines += "#define ALPHA_THRESHOLD\n";
    return defines;
};

HX.PBRMaterial.prototype._generateSpecularDefines = function()
{
    switch (this._specularMapMode) {
        case HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY:
            return this._specularMap? "#define ROUGHNESS_MAP\n" : "";
        case HX.PBRMaterial.SPECULAR_MAP_ALL:
            return this._specularMap? "#define SPECULAR_MAP\n" : "";
        default:
            return "#define NORMAL_ROUGHNESS_MAP\n";
    }
};

HX.PBRMaterial.prototype._initPass = function(type, defines, vertexShaderID, fragmentShaderID)
{
    var vertexShader = defines + HX.ShaderLibrary.get(vertexShaderID);
    var fragmentShader = defines + HX.GLSLIncludeGeometryPass + HX.ShaderLibrary.get(fragmentShaderID);
    var shader = new HX.Shader(vertexShader, fragmentShader);
    var pass = new HX.MaterialPass(shader);
    pass.cullMode = this._doubleSided? HX.CullMode.NONE : HX.CullMode.BACK;
    this.setPass(type, pass);
    return pass;
};