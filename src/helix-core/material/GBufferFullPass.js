import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function GBufferFullPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

GBufferFullPass.prototype = Object.create(MaterialPass.prototype);

GBufferFullPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_gbuffer_full_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_gbuffer_full_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { GBufferFullPass };