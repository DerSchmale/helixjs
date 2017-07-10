import {Comparison, CullMode, ElementType, META} from "../../Helix";
import {GL} from "../../core/GL";
import {Shader} from "../../shader/Shader";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {RectMesh} from "../../mesh/RectMesh";
import {Matrix4x4} from "../../math/Matrix4x4";
import {Float4} from "../../math/Float4";
import {DirectionalLight} from "../DirectionalLight";

function DeferredAmbientShader()
{
    Shader.call(this);
    var defines = {};

    var vertex = ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        ShaderLibrary.get("deferred_ambient_light_fragment.glsl");

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");
    var ssaoSlot = gl.getUniformLocation(p, "hx_ssao");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);
    gl.uniform1i(ssaoSlot, 3);
}

DeferredAmbientShader.prototype = Object.create(Shader.prototype);

DeferredAmbientShader.prototype.execute = function(renderer)
{
    var gl = GL.gl;

    gl.useProgram(this._program);

    var texs = renderer._gbuffer.textures;
    texs[0].bind(0);
    texs[1].bind(1);
    texs[2].bind(2);
    renderer._ssaoTexture.bind(3);

    this.updatePassRenderState(renderer);

    var rect = RectMesh.DEFAULT;
    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

    GL.enableAttributes(2);

    GL.drawElements(ElementType.TRIANGLES, 6, 0);
};

export { DeferredAmbientShader };