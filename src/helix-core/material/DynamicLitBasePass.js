import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";

function DynamicLitBasePass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

DynamicLitBasePass.prototype = Object.create(MaterialPass.prototype);

DynamicLitBasePass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_lit_dynamic_base_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_lit_dynamic_base_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { DynamicLitBasePass };