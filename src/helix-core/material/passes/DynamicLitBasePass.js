import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {ShaderUtils} from "../../utils/ShaderUtils";

/**
 * The base pass for dynamic lighting
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DynamicLitBasePass(geometryVertex, geometryFragment, defines)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, defines));
}

DynamicLitBasePass.prototype = Object.create(MaterialPass.prototype);

DynamicLitBasePass.prototype._generateShader = function(geometryVertex, geometryFragment, defines)
{
	defines =
		ShaderUtils.processDefines(defines) +
		"#define HX_SKIP_NORMALS\n#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_fwd_base_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_fwd_base_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { DynamicLitBasePass };