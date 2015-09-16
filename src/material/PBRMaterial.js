/**
 * Creates a default physically-based rendering material.
 */
HX.PBRMaterial = function()
{
    HX.Material.call(this);
    this._passesInvalid = true;
    this._color = new HX.Color(1, 1, 1, 1);
    this._colorMap = null;
    this._normalMap = null;
    this._specularMap = null;
    this._specularMapMode = HX.SPECULAR_MAP_ROUGHNESS_ONLY;
    this._metallicness = 0.0;
    this._roughness = 0.3;
    this._specularNormalReflection = 0.027;
    this._refractiveRatio = .8;
    this.metallicness = this._metallicness;
    this.roughness = this._roughness;
    this.specularNormalReflection = this._specularNormalReflection;
    this.refractiveRatio = this._refractiveRatio;
    this._transparent = false;
    this._refract = false;
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


HX.PBRMaterial.prototype = Object.create(HX.Material.prototype);

//HX.PBRMaterial.prototype.hasPass = function(type)
//{
    //if (this._passesInvalid)
    //    this._updatePasses();

    //return HX.Material.prototype.hasPass.call(this, type);
//};

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

    // TODO: this is something every material should have to do, so perhaps it should work differently?
    if (this._transparent) {
        // this is actually the same code as simple albedo output, but multiplicative blending
        if (this._refract) {
            var defines = normalDefines + colorDefines;
            this._initPass(HX.MaterialPass.POST_PASS, defines, "default_refract_vertex.glsl", "default_refract_fragment.glsl");
        }
        else {
            var defines = "#define NO_MRT_GBUFFER_COLOR\n" + normalDefines + colorDefines;
            var pass = this._initPass(HX.MaterialPass.POST_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
            pass.setBlendMode(HX.BlendFactor.ZERO, HX.BlendFactor.SOURCE_COLOR, HX.BlendOperation.ADD);
        }
    }

    var colorPass;
    if (HX.EXT_DRAW_BUFFERS) {
        var defines = colorDefines + normalDefines + specularDefines;
        colorPass = this._initPass(HX.MaterialPass.GEOMETRY_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }
    else {
        // do not assign texture if transparent (albedo will be black)
        if (!this._transparent)
            colorDefines = "#define NO_MRT_GBUFFER_COLOR\n" + colorDefines;
        normalDefines = "#define NO_MRT_GBUFFER_NORMALS\n" + normalDefines;
        specularDefines = "#define NO_MRT_GBUFFER_SPECULAR\n" + specularDefines;
        colorPass = this._initPass(HX.MaterialPass.GEOMETRY_COLOR_PASS, colorDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS, normalDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS, specularDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }

    this.setUniform("color", this._color);
    if (this._colorMap) this.setTexture("colorMap", this._colorMap);
    if (this._normalMap) this.setTexture("normalMap", this._normalMap);
    if (this._specularMap) this.setTexture("specularMap", this._specularMap);

    if (this._transparent) {
        if (HX.EXT_DRAW_BUFFERS) {
            colorPass.setUniform("color", new HX.Color(0, 0, 0, 1));
            colorPass.setTexture("colorMap", null);
        }
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
    var vertexShader = HX.ShaderLibrary.get(vertexShaderID);
    var fragmentShader = HX.ShaderLibrary.get(fragmentShaderID);
    var shader = new HX.Shader(vertexShader, fragmentShader, defines, defines);
    var pass = new HX.MaterialPass(shader);
    this.setPass(type, pass);
    return pass;
};

Object.defineProperty(HX.PBRMaterial.prototype, "color",
    {
        get: function() { return this._color; },
        set: function(value) {
            this._color = isNaN(value) ? value : new HX.Color(value);
            this.setUniform("color", this._color);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "colorMap",
    {
        get: function() { return this._colorMap; },
        set: function(value) {
            if (!!this._colorMap !== !!value)
                this._passesInvalid = true;

            if (!this._passesInvalid && value)
                this.setTexture("colorMap", value);

            this._colorMap = value;
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "normalMap",
    {
        get: function() { return this._normalMap; },
        set: function(value) {
            if (!!this._normalMap !== !!value)
                this._passesInvalid = true;

            if (!this._passesInvalid && value)
                this.setTexture("normalMap", value);

            this._normalMap = value;
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "specularMap",
    {
        get: function() { return this._specularMap; },
        set: function(value) {
            if (!!this._normalMap !== !!value)
                this._passesInvalid = true;

            if (!this._passesInvalid && value)
                this.setTexture("specularMap", value);

            this._specularMap = value;
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "specularMapMode",
    {
        get: function() { return this._specularMapMode; },
        set: function(value) {
            if (this._specularMapMode != value)
                this._passesInvalid = true;

            this._specularMapMode = value;
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "metallicness",
    {
        get: function() { return this._metallicness; },
        set: function(value) {
            this._metallicness = HX.saturate(value);
            this.setUniform("metallicness", this._metallicness);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "specularNormalReflection",
    {
        get: function() { return this._specularNormalReflection; },
        set: function(value) {
            this._specularNormalReflection = HX.saturate(value);
            this.setUniform("specularNormalReflection", this._specularNormalReflection);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "roughness",
    {
        get: function() { return this._roughness; },
        set: function(value) {
            this._roughness = HX.saturate(value);
            this.setUniform("roughness", this._roughness);
        }
    }
);

// TODO: Provide transparency modes:
//  - alpha
//  - absorbant
//  - absorbant no specular (for performance, removes gbuffer passes)
Object.defineProperty(HX.PBRMaterial.prototype, "transparent",
    {
        get: function() { return this._transparent; },
        set: function(value) {
            // only specular will be output to hdr buffer, so additive
            if (this._transparent !== value)
                this._passesInvalid = true;

            this._transparent = value;
            this._transparencyMode = value? HX.TransparencyMode.ADDITIVE : HX.TransparencyMode.OPAQUE;
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "refract",
    {
        get: function() { return this._refract; },
        set: function(value) {
            if (!!this._refract !== !!value)
                this._passesInvalid = true;

            this._refract = HX.saturate(value);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "refractiveRatio",
    {
        get: function() { return this._refractiveRatio; },
        set: function(value) {
            this._refractiveRatio = value;
            this.setUniform("refractiveRatio", value);
        }
    }
);