/**
 * Creates a default skybox rendering material.
 */
HX.SkyboxMaterial = function(texture)
{
    HX.Material.call(this);

    var vertexShader = HX.ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = HX.ShaderLibrary.get("default_skybox_fragment.glsl");
    var shader = new HX.Shader(vertexShader, fragmentShader);
    var pass = new HX.MaterialPass(shader);
    pass.cullMode = HX.CullMode.NONE;
    this.setPass(HX.MaterialPass.POST_LIGHT_PASS, pass);

    this.setTexture("hx_skybox", texture);
    this._lightingModelID = 0;
};

HX.SkyboxMaterial.prototype = Object.create(HX.Material.prototype);