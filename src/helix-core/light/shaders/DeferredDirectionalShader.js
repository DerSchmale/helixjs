import {Comparison, CullMode, ElementType, META} from "../../Helix";
import {GL} from "../../core/GL";
import {Shader} from "../../shader/Shader";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {RectMesh} from "../../mesh/RectMesh";
import {Matrix4x4} from "../../math/Matrix4x4";
import {Float4} from "../../math/Float4";
import {DirectionalLight} from "../DirectionalLight";

function DeferredDirectionalShader(shadows)
{
    Shader.call(this);
    var defines = {};
    if (shadows) {
        defines.HX_SHADOW_MAP = 1;
    }

    var vertex = ShaderLibrary.get("deferred_dir_light_vertex.glsl", defines);
    var fragment =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        META.OPTIONS.defaultLightingModel + "\n\n\n" +
        DirectionalLight.SHADOW_FILTER.getGLSL() + "\n" +
        ShaderLibrary.get("directional_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_dir_light_fragment.glsl");

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    this._colorLocation = gl.getUniformLocation(p, "hx_directionalLight.color");
    this._dirLocation = gl.getUniformLocation(p, "hx_directionalLight.direction");

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);

    if (shadows) {
        this._shadowMatricesLocation = gl.getUniformLocation(p, "hx_directionalLight.shadowMapMatrices[0]");
        this._shadowSplitsLocation = gl.getUniformLocation(p, "hx_directionalLight.splitDistances");
        this._depthBiasLocation = gl.getUniformLocation(p, "hx_directionalLight.depthBias");
        this._maxShadowDistanceLocation = gl.getUniformLocation(p, "hx_directionalLight.maxShadowDistance");
        var shadowMapSlot = gl.getUniformLocation(p, "hx_shadowMap");
        gl.uniform1i(shadowMapSlot, 3);
    }
}

DeferredDirectionalShader.prototype = Object.create(Shader.prototype);

DeferredDirectionalShader.prototype.execute = function(renderer, light)
{
    var dir = new Float4();
    var matrix = new Matrix4x4();
    var matrixData = new Float32Array(64);

    return function(renderer, light) {
        var gl = GL.gl;

        gl.useProgram(this._program);

        var texs = renderer._gbuffer.textures;
        texs[0].bind(0);
        texs[1].bind(1);
        texs[2].bind(2);

        var camera = renderer._camera;
        var col = light._scaledIrradiance;

        camera.viewMatrix.transformVector(light.direction, dir);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._dirLocation, dir.x, dir.y, dir.z);

        if (light._castShadows) {
            var shadowRenderer = light._shadowMapRenderer;
            shadowRenderer._shadowMap.bind(3);

            var shadowRenderer = light._shadowMapRenderer;
            var numCascades = META.OPTIONS.numShadowCascades;
            var splits = shadowRenderer._splitDistances;
            var k = 0;

            for (var j = 0; j < numCascades; ++j) {
                matrix.multiply(shadowRenderer.getShadowMatrix(j), camera.worldMatrix);
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


        this.updatePassRenderState(renderer);

        var rect = RectMesh.DEFAULT;
        rect._vertexBuffers[0].bind();
        rect._indexBuffer.bind();

        gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

        GL.enableAttributes(2);

        GL.drawElements(ElementType.TRIANGLES, 6, 0);
    }
}();

export { DeferredDirectionalShader };