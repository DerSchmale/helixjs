import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {ShaderUtils} from "../../utils/ShaderUtils";
import {capabilities, META} from "../../Helix";

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
    var baseName = capabilities.EXT_DRAW_BUFFERS && META.OPTIONS.renderMotionVectors? "material_normal_depth_motion" : "material_normal_depth";
    defines = ShaderUtils.processDefines(defines) + "#define HX_SKIP_SPECULAR\n";
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get(baseName + "_vertex.glsl");
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get(baseName + "_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { NormalDepthPass };