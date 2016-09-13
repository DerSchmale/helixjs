HX.DirectionalShadowPass = function(geometryVertex, geometryFragment)
{
    HX.MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
};

HX.DirectionalShadowPass.prototype = Object.create(HX.MaterialPass.prototype);

HX.DirectionalShadowPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = HX.ShaderLibrary.get("snippets_geometry.glsl") + "\n" + HX.DirectionalLight.SHADOW_FILTER.getGLSL() + "\n" + geometryFragment + "\n" + HX.ShaderLibrary.get("material_dir_shadow_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + HX.ShaderLibrary.get("material_unlit_vertex.glsl");
    return new HX.Shader(vertexShader, fragmentShader);
};