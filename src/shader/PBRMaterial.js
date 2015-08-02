/**
 * Creates a default physically-based rendering material.
 */
HX.PBRMaterial = function()
{
    HX.Material.call(this);
    this._diffuseColor = new HX.Color(1, 1, 1, 1);
    this._diffuseMap = null;
    this._normalMap = null;
    this._specularMap = null;
    this._specularMapMode = HX.SPECULAR_MAP_ROUGHNESS_ONLY;
    this._updatePasses();
    this._metallicness = 0.0;
    this._roughness = 0.3;
    this._specularNormalReflection = 0.027;
    this.metallicness = 0.0;
    this.roughness = 0.3;
    this.specularNormalReflection = 0.027;
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

HX.PBRMaterial.prototype.hasPass = function(type)
{
    if (this._passesInvalid)
        this._updatePasses();

    return HX.Material.prototype.hasPass.call(this, type);
};

HX.PBRMaterial.prototype.getPass = function(type)
{
    if (this._passesInvalid)
        this._updatePasses();

    return HX.Material.prototype.getPass.call(this, type);
};

HX.PBRMaterial.prototype._updatePasses = function()
{
    var albedoDefines = this._generateAlbedoDefines();
    var normalDefines = this._generateNormalDefines();
    var specularDefines = this._generateSpecularDefines();

    // TODO: this is something every material should have to do, so perhaps it should work differently?
    if (HX.EXT_DRAW_BUFFERS) {
        var defines = albedoDefines + normalDefines + specularDefines;
        this._initPass(HX.MaterialPass.GEOMETRY_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }
    else {
        albedoDefines = "#define NO_MRT_GBUFFER_ALBEDO\n" + albedoDefines;
        normalDefines = "#define NO_MRT_GBUFFER_NORMALS\n" + normalDefines;
        specularDefines = "#define NO_MRT_GBUFFER_SPECULAR\n" + specularDefines;
        this._initPass(HX.MaterialPass.GEOMETRY_ALBEDO_PASS, albedoDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS, normalDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS, specularDefines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }

    this.setUniform("albedoColor", this._diffuseColor);
    if (this._diffuseMap) this.setTexture("albedoMap", this._diffuseMap);
    if (this._normalMap) this.setTexture("normalMap", this._normalMap);
    if (this._specularMap) this.setTexture("specularMap", this._specularMap);

    this._passesInvalid = false;
};

HX.PBRMaterial.prototype._generateAlbedoDefines = function()
{
    return !!this._diffuseMap? "#define ALBEDO_MAP\n" : "";
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
};

Object.defineProperty(HX.PBRMaterial.prototype, "diffuseColor",
    {
        get: function() { return this._diffuseColor; },
        set: function(value) {
            this._diffuseColor = isNaN(value) ? value : new HX.Color(value);
            this.setUniform("albedoColor", this._diffuseColor);
        }
    }
);

Object.defineProperty(HX.PBRMaterial.prototype, "diffuseMap",
    {
        get: function() { return this._diffuseMap; },
        set: function(value) {
            if (!!this._diffuseMap !== !!value)
                this._passesInvalid = true;

            if (!this._passesInvalid && value)
                this.setTexture("albedoMap", value);

            this._diffuseMap = value;
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