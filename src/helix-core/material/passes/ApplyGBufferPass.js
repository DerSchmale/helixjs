import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ApplyGBufferPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

ApplyGBufferPass.prototype = Object.create(MaterialPass.prototype);

ApplyGBufferPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines =
        "#define HX_SKIP_NORMALS\n" +
        "#define HX_SKIP_SPECULAR\n";
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_apply_gbuffer_vertex.glsl");
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_apply_gbuffer_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { ApplyGBufferPass };