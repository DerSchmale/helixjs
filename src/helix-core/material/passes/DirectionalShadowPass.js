import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {META} from "../../Helix";
import {ShaderUtils} from "../../utils/ShaderUtils";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DirectionalShadowPass(geometryVertex, geometryFragment, defines)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, defines));
}

DirectionalShadowPass.prototype = Object.create(MaterialPass.prototype);

DirectionalShadowPass.prototype._generateShader = function(geometryVertex, geometryFragment, defines)
{
	defines =
		ShaderUtils.processDefines(defines) +
		"#define HX_SKIP_NORMALS\n#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + META.OPTIONS.shadowFilter.getGLSL() + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_dir_shadow_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_unlit_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { DirectionalShadowPass };