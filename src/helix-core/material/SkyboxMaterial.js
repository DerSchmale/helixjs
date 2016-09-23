/**
 * Creates a default skybox rendering material.
 */
HX.SkyboxMaterial = function(texture)
{
    HX.Material.call(this);

    var vertexShader = HX.ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = HX.ShaderLibrary.get("default_skybox_fragment.glsl");

    var pass = new HX.UnlitPass(vertexShader, fragmentShader);
    pass.writeDepth = false;
    pass.cullMode = HX.CullMode.NONE;

    // if no draw buffers, normals and specular don't need to be updated
    this._setPass(HX.MaterialPass.BASE_PASS, pass);
    this._initialized = true;

    this.setTexture("hx_skybox", texture);
};

HX.SkyboxMaterial.prototype = Object.create(HX.Material.prototype);