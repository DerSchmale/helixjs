import {Comparison, CullMode, ElementType} from "../../Helix";
import {GL} from "../../core/GL";
import {Shader} from "../../shader/Shader";
import {ShaderLibrary} from "../../shader/ShaderLibrary";

function ESMBlurShader(blurRadius)
{
    Shader.call(this);
    var gl = GL.gl;

    var defines = {
        RADIUS: blurRadius,
        RCP_NUM_SAMPLES: "float(" + (1.0 / (1.0 + 2.0 * blurRadius)) + ")"
    };

    var vertex = ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment = ShaderLibrary.get("esm_blur_fragment.glsl", defines);

    this.init(vertex, fragment);

    this._textureLocation = gl.getUniformLocation(this._program, "source");
    this._directionLocation = gl.getUniformLocation(this._program, "direction");
    this._positionAttributeLocation = gl.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(this._program, "hx_texCoord");

    gl.useProgram(this._program);
    gl.uniform1i(this._textureLocation, 0);
}

ESMBlurShader.prototype = Object.create(Shader.prototype);

ESMBlurShader.prototype.execute = function(rect, texture, dirX, dirY)
{
    var gl = GL.gl;

    GL.setDepthTest(Comparison.DISABLED);
    GL.setCullMode(CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updateRenderState();

    texture.bind(0);

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

    GL.enableAttributes(2);

    gl.uniform2f(this._directionLocation, dirX, dirY);

    GL.drawElements(ElementType.TRIANGLES, 6, 0);
};

export { ESMBlurShader };