import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {DirectionalLight} from "../../light/DirectionalLight";
import {GL} from "../../core/GL";
import {Float4} from "../../math/Float4";
import {Matrix4x4} from "../../math/Matrix4x4";
import {META} from "../../Helix";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @param shadows
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ForwardLitDirPass(geometryVertex, geometryFragment, lightingModel)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel));

    this._colorLocation = this.getUniformLocation("hx_directionalLight.color");
    this._dirLocation = this.getUniformLocation("hx_directionalLight.direction");

    this._castShadowsLocation = this.getUniformLocation("hx_directionalLight.castShadows");
    this._shadowMatricesLocation = this.getUniformLocation("hx_directionalLight.shadowMapMatrices[0]");
    this._shadowSplitsLocation = this.getUniformLocation("hx_directionalLight.splitDistances");
    this._depthBiasLocation = this.getUniformLocation("hx_directionalLight.depthBias");
    this._maxShadowDistanceLocation = this.getUniformLocation("hx_directionalLight.maxShadowDistance");
}

ForwardLitDirPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ForwardLitDirPass.prototype.updatePassRenderState = function(camera, renderer, light)
{
    var dir = new Float4();
    var matrix = new Matrix4x4();
    var matrixData = new Float32Array(64);

    return function(camera, renderer, light) {
        var gl = GL.gl;
        var col = light._scaledIrradiance;

        gl.useProgram(this._shader._program);

        camera.viewMatrix.transformVector(light.direction, dir);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._dirLocation, dir.x, dir.y, dir.z);
        gl.uniform1i(this._castShadowsLocation, light.castShadows);

        if (light.castShadows) {
            var numCascades = META.OPTIONS.numShadowCascades;
            var splits = light._cascadeSplitDistances;
            var k = 0;

            for (var j = 0; j < numCascades; ++j) {
                matrix.multiply(light.getShadowMatrix(j), camera.worldMatrix);
                var m = matrix._m;
                for (var l = 0; l < 16; ++l) {
                    matrixData[k++] = m[l];
                }
            }

            gl.uniformMatrix4fv(this._shadowMatricesLocation, false, matrixData);
            gl.uniform4f(this._shadowSplitsLocation, splits[0], splits[1], splits[2], splits[3]);
            gl.uniform1f(this._depthBiasLocation, light.depthBias);
            gl.uniform1f(this._maxShadowDistanceLocation, splits[numCascades - 1]);
        }

        MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
    }
}();

ForwardLitDirPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel, shadows)
{
    var defines = {};
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_dir_vertex.glsl", defines);

    var fragmentShader =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.shadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("directional_light.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_dir_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { ForwardLitDirPass };