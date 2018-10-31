import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {META} from "../../Helix";
import {GL} from "../../core/GL";
import {ShaderUtils} from "../../utils/ShaderUtils";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PointShadowPass(geometryVertex, geometryFragment, defines)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, defines));
    this._rcpRadiusLocation = this.getUniformLocation("hx_rcpRadius");

    this._MP_updatePassRenderState = MaterialPass.prototype.updatePassRenderState;
}

PointShadowPass.prototype = Object.create(MaterialPass.prototype);

PointShadowPass.prototype.updatePassRenderState = function(camera, renderer, light)
{
    this._MP_updatePassRenderState(camera, renderer);
    GL.gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);
};

PointShadowPass.prototype._generateShader = function(geometryVertex, geometryFragment, defines)
{
	defines =
		ShaderUtils.processDefines(defines) +
		"#define HX_SKIP_NORMALS\n#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + META.OPTIONS.shadowFilter.getGLSL() + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_point_shadow_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_point_shadow_vertex.glsl")
    return new Shader(vertexShader, fragmentShader);
};

export { PointShadowPass };