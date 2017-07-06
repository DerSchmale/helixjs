import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";

function UnlitPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

UnlitPass.prototype = Object.create(MaterialPass.prototype);

UnlitPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_unlit_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_unlit_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { UnlitPass };