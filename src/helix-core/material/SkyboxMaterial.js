/**
 * Creates a default skybox rendering material.
 */
HX.SkyboxMaterial = function(texture)
{
    HX.Material.call(this);

    var vertexShader = HX.ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = HX.GLSLIncludeGeometryPass + HX.ShaderLibrary.get("default_skybox_fragment.glsl");
    var passType;

    if (HX.EXT_DRAW_BUFFERS) {
        passType = HX.MaterialPass.GEOMETRY_PASS;
    }
    else {
        fragmentShader = "#define HX_NO_MRT_GBUFFER_COLOR\n" + fragmentShader;
        passType = HX.MaterialPass.GEOMETRY_COLOR_PASS;
    }

    var shader = new HX.Shader(vertexShader, fragmentShader);
    var pass = new HX.MaterialPass(shader);
    pass.writeDepth = false;
    pass.cullMode = HX.CullMode.NONE;
    this.setPass(passType, pass);

    this.setTexture("hx_skybox", texture);
};

HX.SkyboxMaterial.prototype = Object.create(HX.Material.prototype);