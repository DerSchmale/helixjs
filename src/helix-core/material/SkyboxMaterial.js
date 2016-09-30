/**
 * Creates a default skybox rendering material.
 */
HX.SkyboxMaterial = function(texture)
{
    HX.Material.call(this);

    var vertexShader = HX.ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = HX.ShaderLibrary.get("default_skybox_fragment.glsl");

    this.writeDepth = false;
    this.cullMode = HX.CullMode.NONE;

    var pass = new HX.UnlitPass(vertexShader, fragmentShader);

    // if no draw buffers, normals and specular don't need to be updated
    this.setPass(HX.MaterialPass.BASE_PASS, pass);
    this._initialized = true;
    this._renderOrder = Number.POSITIVE_INFINITY;

    this.setTexture("hx_skybox", texture);
};

HX.SkyboxMaterial.prototype = Object.create(HX.Material.prototype);