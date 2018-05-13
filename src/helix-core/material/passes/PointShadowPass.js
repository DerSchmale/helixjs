import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {META} from "../../Helix";
import {GL} from "../../core/GL";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PointShadowPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
    this._rcpRadiusLocation = this.getUniformLocation("hx_rcpRadius");
}

PointShadowPass.prototype = Object.create(MaterialPass.prototype);

PointShadowPass.prototype.updatePassRenderState = function(geometryVertex, geometryFragment, light)
{
    MaterialPass.prototype.updatePassRenderState.call(this, geometryVertex, geometryFragment);
    GL.gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);
};

PointShadowPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines =
        "#define HX_SKIP_NORMALS\n" +
        "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + META.OPTIONS.shadowFilter.getGLSL() + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_point_shadow_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_point_shadow_vertex.glsl")
    return new Shader(vertexShader, fragmentShader);
};

export { PointShadowPass };