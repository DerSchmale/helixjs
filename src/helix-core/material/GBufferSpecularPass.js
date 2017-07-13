import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";

/**
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function GBufferSpecularPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

GBufferSpecularPass.prototype = Object.create(MaterialPass.prototype);

GBufferSpecularPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_gbuffer_specular_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_gbuffer_specular_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { GBufferSpecularPass };