HX.NormalDepthPass = function(geometryVertex, geometryFragment)
{
    HX.MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
};

HX.NormalDepthPass.prototype = Object.create(HX.MaterialPass.prototype);

HX.NormalDepthPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = HX.ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + HX.ShaderLibrary.get("material_normal_depth_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + HX.ShaderLibrary.get("material_normal_depth_vertex.glsl");
    return new HX.Shader(vertexShader, fragmentShader);
};