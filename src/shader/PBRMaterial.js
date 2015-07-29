/**
 * Creates a default physically-based rendering material.
 */
HX.PBRMaterial = function()
{
    HX.Material.call(this);
    this._diffuseColor = new HX.Color();
    this._diffuseMap = null;
    this._specularMap = null;
    this._specularMapMode = HX.SPECULAR_MAP_ROUGHNESS_ONLY;
    this._updatePasses();
    this.setMetallicness(0.0);
    this.setRoughness(0.3);
    this.setSpecularNormalReflection(0.027);
};

// used in setSpecularMap to pass in a specular map using only roughness data
HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY = 1;
// used in setSpecularMap to pass in a specular map with rgb containing respecitvely roughness, normal reflectance, metallicness
HX.PBRMaterial.SPECULAR_MAP_ALL = 2;
// used in setSpecularMap to specify roughness data is in the alpha channel of the normal map
HX.PBRMaterial.SPECULAR_MAP_SHARE_NORMAL_MAP = 3;


HX.PBRMaterial.prototype = Object.create(HX.Material.prototype);

HX.PBRMaterial.prototype.setDiffuseColor = function(value)
{
    this._diffuseColor = isNaN(value) ? value : new HX.Color(value);
    this.setUniform("albedoColor", this._diffuseColor);
};

HX.PBRMaterial.prototype.setDiffuseMap = function(value)
{
    if (!!this._diffuseMap !== !!value)
        this._passesInvalid = true;

    if (!this._passesInvalid && value)
        this.setTexture("albedoMap", value);

    this._diffuseMap = value;
};

/**
 *
 * @param value
 */
HX.PBRMaterial.prototype.setNormalMap = function(value)
{
    if (!!this._normalMap !== !!value)
        this._passesInvalid = true;

    if (!this._passesInvalid && value)
        this.setTexture("normalMap", value);

    this._normalMap = value;
};

/**
 * Specular map expects roughness in X (inverted: black = rough), specular normal reflectance (rarely used in practice), metallicness in Z.
 * @param value A Texture2D object containing a specular map.
 * @param mode Describes the data contained in the specular map. Can be either HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY
 * or HX.PBRMaterial.SPECULAR_MAP_ALL. Defaults to HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY when omitted. Once assigned,
 * it will keep its value when omitted.
 *
 * An exception can be made to put the roughness data in the alpha channel of the normal map. In that case, simply call
 */
HX.PBRMaterial.prototype.setSpecularMap = function(value, mode)
{
    if (value === HX.PBRMaterial.SPECULAR_MAP_SHARE_NORMAL_MAP)
        mode = value;
    else
        mode = mode || HX.PBRMaterial.SPECULAR_MAP_ROUGHNESS_ONLY;

    if ((this._specularMapMode != mode) || (!!this._specularMap !== !!value))
        this._passesInvalid = true;

    // won't be recompiled, and have something to reassign
    if (!this._passesInvalid && value)
        this.setTexture("specularMap", value);

    this._specularMap = value;
};

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

HX.PBRMaterial.prototype.setMetallicness = function(value)
{
    this.setUniform("metallicness", value);
};

HX.PBRMaterial.prototype.setSpecularNormalReflection = function(value)
{
    this.setUniform("specularNormalReflection", value);
};

HX.PBRMaterial.prototype.setRoughness = function(value)
{
    this.setUniform("roughness", value);
};