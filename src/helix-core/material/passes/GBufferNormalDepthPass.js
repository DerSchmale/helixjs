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
function GBufferNormalDepthPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

GBufferNormalDepthPass.prototype = Object.create(MaterialPass.prototype);

GBufferNormalDepthPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines = "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_gbuffer_normal_depth_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_gbuffer_normal_depth_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { GBufferNormalDepthPass };