HX.UnlitPass = function(geometryVertex, geometryFragment)
{
    HX.MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
};

HX.UnlitPass.prototype = Object.create(HX.MaterialPass.prototype);

HX.UnlitPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = HX.ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + HX.ShaderLibrary.get("material_unlit_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + HX.ShaderLibrary.get("material_unlit_vertex.glsl");
    return new HX.Shader(vertexShader, fragmentShader);
};