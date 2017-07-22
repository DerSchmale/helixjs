import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {GL} from "../../core/GL";
import {Float4} from "../../math/Float4";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ForwardLitPointPass(geometryVertex, geometryFragment, lightingModel)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel));

    this._colorLocation = this.getUniformLocation("hx_pointLight.color");
    this._posLocation = this.getUniformLocation("hx_pointLight.position");
    this._radiusLocation = this.getUniformLocation("hx_pointLight.radius");
    this._rcpRadiusLocation = this.getUniformLocation("hx_pointLight.rcpRadius");
}

ForwardLitPointPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ForwardLitPointPass.prototype.updatePassRenderState = function(camera, renderer, light)
{
    var pos = new Float4();

    return function(camera, renderer, light) {
        var gl = GL.gl;
        var col = light._scaledIrradiance;

        gl.useProgram(this._shader._program);

        light.worldMatrix.getColumn(3, pos);
        camera.viewMatrix.transformPoint(pos, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);
        gl.uniform1f(this._radiusLocation, light._radius);
        gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);

        MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
    }
}();

ForwardLitPointPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel)
{
    var defines = {};

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_point_vertex.glsl", defines);

    var fragmentShader =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        lightingModel + "\n\n\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_point_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { ForwardLitPointPass };