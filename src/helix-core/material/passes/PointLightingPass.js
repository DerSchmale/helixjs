import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {GL} from "../../core/GL";
import {Float4} from "../../math/Float4";
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
function PointLightingPass(geometryVertex, geometryFragment, lightingModel)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel));

    this._colorLocation = this.getUniformLocation("hx_pointLight.color");
    this._posLocation = this.getUniformLocation("hx_pointLight.position");
    this._radiusLocation = this.getUniformLocation("hx_pointLight.radius");
    this._rcpRadiusLocation = this.getUniformLocation("hx_pointLight.rcpRadius");
    this._castShadowsLocation = this.getUniformLocation("hx_pointLight.castShadows");
    this._depthBiasLocation = this.getUniformLocation("hx_pointLight.depthBias");
    this._shadowMatrixLocation = this.getUniformLocation("hx_pointLight.shadowMapMatrix");
    this._shadowTilesLocation = this.getUniformLocation("hx_pointLight.shadowTiles[0]");

	this._MP_updatePassRenderState = MaterialPass.prototype.updatePassRenderState;
}

PointLightingPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
PointLightingPass.prototype.updatePassRenderState = function(camera, renderer, light)
{
    var pos = new Float4();
    var tiles = new Float32Array(24);

    return function(camera, renderer, light) {
        var gl = GL.gl;
        var col = light._scaledIrradiance;

        gl.useProgram(this.shader.program);

        light.entity.worldMatrix.getColumn(3, pos);
        camera.viewMatrix.transformPoint(pos, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);
        gl.uniform1f(this._radiusLocation, light._radius);
        gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);
        gl.uniform1i(this._castShadowsLocation, light.castShadows? 1 : 0);

        if (light.castShadows) {
            var j = 0;
            for (var i = 0; i < 6; ++i) {
                var t = light._shadowTiles[i];
                tiles[j++] = t.x;
                tiles[j++] = t.y;
                tiles[j++] = t.z;
                tiles[j++] = t.w;
            }
            gl.uniform4fv(this._shadowTilesLocation, tiles);
            gl.uniform1f(this._depthBiasLocation, light.depthBias);
            gl.uniformMatrix4fv(this._shadowMatrixLocation, false, camera.worldMatrix._m);
        }

        this._MP_updatePassRenderState(camera, renderer);
    }
}();

PointLightingPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel)
{
    var defines = {};

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_point_vertex.glsl", defines);

    var fragmentShader =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.shadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_point_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { PointLightingPass };