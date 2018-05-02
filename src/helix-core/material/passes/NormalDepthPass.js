import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function NormalDepthPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

NormalDepthPass.prototype = Object.create(MaterialPass.prototype);

NormalDepthPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines = "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_normal_depth_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_normal_depth_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { NormalDepthPass };