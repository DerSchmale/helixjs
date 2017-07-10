import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";

function ForwardLitBasePass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

ForwardLitBasePass.prototype = Object.create(MaterialPass.prototype);

ForwardLitBasePass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_fwd_base_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_base_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { ForwardLitBasePass };