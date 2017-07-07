import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";
import {DirectionalLight} from "../light/DirectionalLight";
import {GL} from "../core/GL";
import {Float4} from "../math/Float4";
import {Matrix4x4} from "../math/Matrix4x4";
import {META} from "../Helix";

function DynamicLitPointPass(geometryVertex, geometryFragment, lightingModel)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel));

    this._colorLocation = this.getUniformLocation("hx_pointLight.color");
    this._posLocation = this.getUniformLocation("hx_pointLight.position");
    this._radiusLocation = this.getUniformLocation("hx_pointLight.radius");
}

DynamicLitPointPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
DynamicLitPointPass.prototype.updatePassRenderState = function(renderer, light)
{
    var pos = new Float4();

    return function(renderer, light) {
        var camera = renderer._camera;
        var gl = GL.gl;
        var col = light._scaledIrradiance;

        gl.useProgram(this._shader._program);

        camera.viewMatrix.transformPoint(light.position, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);
        gl.uniform1f(this._radiusLocation, light.radius);

        MaterialPass.prototype.updatePassRenderState.call(this, renderer);
    }
}();

DynamicLitPointPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel)
{
    var defines = {};

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_lit_dynamic_point_vertex.glsl", defines);

    var fragmentShader =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        lightingModel + "\n\n\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_lit_dynamic_point_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { DynamicLitPointPass };