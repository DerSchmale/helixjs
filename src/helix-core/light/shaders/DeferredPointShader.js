import {ElementType, META, CullMode} from "../../Helix";
import {GL} from "../../core/GL";
import {Shader} from "../../shader/Shader";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Float4} from "../../math/Float4";
import {SpherePrimitive} from "../../mesh/primitives/SpherePrimitive";
import {RectMesh} from "../../mesh/RectMesh";

function DeferredPointShader(useSphere)
{
    Shader.call(this);
    this._useSphere = useSphere;

    var defines = {};

    if (useSphere) {
        var primitive = new SpherePrimitive({
            // overshoot a bit
            radius: 1.1
        });
        this._mesh = primitive.getMesh(0);
        defines.HX_SPHERE_MESH = 1;
    }

    var vertex =
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        META.OPTIONS.defaultLightingModel + "\n\n\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_point_light_vertex.glsl", defines);
    var fragment =
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        META.OPTIONS.defaultLightingModel + "\n\n\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_point_light_fragment.glsl", defines);

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    this._colorLocation = gl.getUniformLocation(p, "hx_pointLight.color");
    this._posLocation = gl.getUniformLocation(p, "hx_pointLight.position");
    this._radiusLocation = gl.getUniformLocation(p, "hx_pointLight.radius");

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);
}

DeferredPointShader.prototype = Object.create(Shader.prototype);

DeferredPointShader.prototype.execute = function(renderer, light)
{
    var pos = new Float4();

    return function(renderer, light) {
        var gl = GL.gl;

        gl.useProgram(this._program);

        var texs = renderer._gbuffer.textures;
        texs[0].bind(0);
        texs[1].bind(1);
        texs[2].bind(2);

        var camera = renderer._camera;
        var col = light._scaledIrradiance;

        light.worldMatrix.getColumn(3, pos);
        camera.viewMatrix.transformPoint(pos, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);
        gl.uniform1f(this._radiusLocation, light._radius);

        this.updatePassRenderState(renderer);

        if (this._useSphere) {
            GL.setCullMode(CullMode.FRONT);
            var mesh = this._mesh;
            mesh._vertexBuffers[0].bind();
            mesh._indexBuffer.bind();

            gl.vertexAttribPointer(this._positionAttributeLocation, 3, gl.FLOAT, false, 48, 0);
            GL.enableAttributes(1);
            GL.drawElements(ElementType.TRIANGLES, mesh.numIndices, 0);
        }
        else {
            GL.setCullMode(CullMode.NONE);
            var rect = RectMesh.DEFAULT;
            rect._vertexBuffers[0].bind();
            rect._indexBuffer.bind();

            gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
            gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

            GL.enableAttributes(2);

            GL.drawElements(ElementType.TRIANGLES, 6, 0);
        }
    }
}();

export { DeferredPointShader };