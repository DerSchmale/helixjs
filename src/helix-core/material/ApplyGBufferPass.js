import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";

function ApplyGBufferPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

ApplyGBufferPass.prototype = Object.create(MaterialPass.prototype);

ApplyGBufferPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_apply_gbuffer_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_apply_gbuffer_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { ApplyGBufferPass };