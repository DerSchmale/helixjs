import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {GL} from "../../core/GL";
import {Float4} from "../../math/Float4";
import {Matrix4x4} from "../../math/Matrix4x4";
import {META} from "../../Helix";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ForwardLitSpotPass(geometryVertex, geometryFragment, lightingModel)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel));

    this._colorLocation = this.getUniformLocation("hx_spotLight.color");
    this._posLocation = this.getUniformLocation("hx_spotLight.position");
    this._radiusLocation = this.getUniformLocation("hx_spotLight.radius");
    this._anglesLocation = this.getUniformLocation("hx_spotLight.angleData");
    this._dirLocation = this.getUniformLocation("hx_spotLight.direction");
    this._rcpRadiusLocation = this.getUniformLocation("hx_spotLight.rcpRadius");
    this._castShadowsLocation = this.getUniformLocation("hx_spotLight.castShadows");
    this._depthBiasLocation = this.getUniformLocation("hx_spotLight.depthBias");
    this._shadowMatrixLocation = this.getUniformLocation("hx_spotLight.shadowMapMatrix");
    this._shadowTileLocation = this.getUniformLocation("hx_spotLight.shadowTile");
}

ForwardLitSpotPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ForwardLitSpotPass.prototype.updatePassRenderState = function(camera, renderer, light)
{
    var pos = new Float4();
    var matrix = new Matrix4x4();

    return function(camera, renderer, light) {
        var gl = GL.gl;
        var col = light._scaledIrradiance;

        gl.useProgram(this._shader._program);

        var worldMatrix = light.worldMatrix;
        var viewMatrix = camera.viewMatrix;
        worldMatrix.getColumn(3, pos);
        viewMatrix.transformPoint(pos, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);

        worldMatrix.getColumn(1, pos);
        viewMatrix.transformVector(pos, pos);
        gl.uniform3f(this._dirLocation, pos.x, pos.y, pos.z);

        gl.uniform1f(this._radiusLocation, light._radius);
        gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);
        gl.uniform2f(this._anglesLocation, light._cosOuter, 1.0 / Math.max((light._cosInner - light._cosOuter), .00001));
        gl.uniform1i(this._castShadowsLocation, light.castShadows);

        if (light.castShadows) {
            var tile = light._shadowTile;
            gl.uniform1f(this._depthBiasLocation, light.depthBias);
            gl.uniform4f(this._shadowTileLocation, tile.x, tile.y, tile.z, tile.w);
            matrix.multiply(light._shadowMatrix, camera.worldMatrix);
            gl.uniformMatrix4fv(this._shadowMatrixLocation, false, matrix._m);
        }

        MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
    }
}();

ForwardLitSpotPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel)
{
    var defines = {};

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_spot_vertex.glsl", defines);

    var fragmentShader =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.shadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_spot_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { ForwardLitSpotPass };