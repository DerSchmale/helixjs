/**
 * Creates a default physically-based rendering material.
 */
HX.PBRMaterial = function()
{
    HX.Material.call(this);
    this._diffuseColor = new HX.Color();
    this._diffuseTexture = null;
    this._updatePasses();
    this.setMetallicness(0.0);
    this.setRoughness(0.5);
    this.setSpecularNormalReflection(0.027);
};

HX.PBRMaterial.prototype = Object.create(HX.Material.prototype);

HX.PBRMaterial.prototype.setDiffuseColor = function(value)
{
    this._diffuseColor = isNaN(value) ? value : new HX.Color(value);
    this.setUniform("albedoColor", this._diffuseColor);
};

HX.PBRMaterial.prototype.setDiffuseMap = function(value)
{
    this._diffuseTexture = value;
    this._passesInvalid = true;
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

    if (HX.EXT_DRAW_BUFFERS) {
        var defines = albedoDefines + normalDefines + specularDefines;
        this._initPass(HX.MaterialPass.GEOMETRY_PASS, defines, "default_geometry_mrt_vertex.glsl", "default_geometry_mrt_fragment.glsl");
    }
    else {
        this._initPass(HX.MaterialPass.GEOMETRY_ALBEDO_PASS, albedoDefines, "default_albedo_vertex.glsl", "default_albedo_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS, normalDefines, "default_normal_vertex.glsl", "default_normal_fragment.glsl");
        this._initPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS, specularDefines, "default_specular_vertex.glsl", "default_specular_fragment.glsl");
    }

    this.setUniform("albedoColor", this._diffuseColor);
    this.setTexture("albedoMap", this._diffuseTexture);

    this._passesInvalid = false;
};

HX.PBRMaterial.prototype._generateAlbedoDefines = function()
{
    var str = "";
    if (!!this._diffuseTexture) {
        str += "#define ALBEDO_MAP\n";
    }
    return str;
};

HX.PBRMaterial.prototype._generateNormalDefines = function()
{
    var str = "";
    return str;
};

HX.PBRMaterial.prototype._generateSpecularDefines = function()
{
    var str = "";
    return str;
};

HX.PBRMaterial.prototype._initPass = function(type, defines, vertexShaderID, fragmentShaderID)
{
    var vertexShader = defines + HX.ShaderLibrary.get(vertexShaderID);
    var fragmentShader = defines + HX.ShaderLibrary.get(fragmentShaderID);
    var shader = new HX.Shader(vertexShader, fragmentShader);
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