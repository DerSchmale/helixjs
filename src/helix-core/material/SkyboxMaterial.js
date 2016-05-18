/**
 * Creates a default skybox rendering material.
 */
HX.SkyboxMaterial = function(texture)
{
    HX.Material.call(this);

    var vertexShader = HX.ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = HX.GLSLIncludeGeometryPass + HX.ShaderLibrary.get("default_skybox_fragment.glsl");

    if (!HX.EXT_DRAW_BUFFERS)
        fragmentShader = "#define HX_NO_MRT_GBUFFER_COLOR\n" + fragmentShader;

    var shader = new HX.Shader(vertexShader, fragmentShader);
    var pass = new HX.MaterialPass(shader);
    pass.writeDepth = false;
    pass.cullMode = HX.CullMode.NONE;
    // if no draw buffers, normals and specular don't need to be updated
    this.setPass(HX.MaterialPass.GEOMETRY_PASS, pass);

    this.setTexture("hx_skybox", texture);
};

HX.SkyboxMaterial.prototype = Object.create(HX.Material.prototype);