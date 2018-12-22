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
function MotionVectorPass(geometryVertex, geometryFragment, defines)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, defines));
}

MotionVectorPass.prototype = Object.create(MaterialPass.prototype);

MotionVectorPass.prototype._generateShader = function(geometryVertex, geometryFragment, defines)
{
	defines = ShaderUtils.processDefines(defines) + "#define HX_SKIP_SPECULAR\n";
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_velocity_vertex.glsl");
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_velocity_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { MotionVectorPass };