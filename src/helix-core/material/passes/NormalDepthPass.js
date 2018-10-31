import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {ShaderUtils} from "../../utils/ShaderUtils";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function NormalDepthPass(geometryVertex, geometryFragment, defines)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, defines));
}

NormalDepthPass.prototype = Object.create(MaterialPass.prototype);

NormalDepthPass.prototype._generateShader = function(geometryVertex, geometryFragment, defines)
{
	defines = ShaderUtils.processDefines(defines) + "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_normal_depth_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_normal_depth_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { NormalDepthPass };