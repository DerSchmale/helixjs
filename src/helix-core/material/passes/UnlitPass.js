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
function UnlitPass(geometryVertex, geometryFragment, debugMode, defines)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, debugMode, defines));
}

UnlitPass.prototype = Object.create(MaterialPass.prototype);

UnlitPass.prototype._generateShader = function(geometryVertex, geometryFragment, debugMode, defines)
{
	defines =
		ShaderUtils.processDefines(defines) +
		"#define HX_SKIP_NORMALS\n#define HX_SKIP_SPECULAR\n";


    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_unlit_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_unlit_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { UnlitPass };