import {Comparison, CullMode, DataType} from "../../Helix";
import {GL} from "../../core/GL";
import {Shader} from '../../shader/Shader';
import {ShaderLibrary} from "../../shader/ShaderLibrary";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VSMBlurShader(blurRadius)
{
    var gl = GL.gl;
    Shader.call(this);

    var defines = {
        RADIUS: blurRadius,
        RCP_NUM_SAMPLES: "float(" + (1.0 / (1.0 + 2.0 * blurRadius)) + ")"
    };

    var vertex = ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment = ShaderLibrary.get("vsm_blur_fragment.glsl", defines);

    this.init(vertex, fragment);

    this._textureLocation = this.getUniformLocation("source");
    this._directionLocation = this.getUniformLocation("direction");
    this._positionAttributeLocation = this.getAttributeLocation("hx_position");
    this._texCoordAttributeLocation = this.getAttributeLocation("hx_texCoord");

    gl.useProgram(this.program);
    gl.uniform1i(this._textureLocation, 0);
}

VSMBlurShader.prototype = Object.create(Shader.prototype);

VSMBlurShader.prototype.execute = function (rect, texture, dirX, dirY)
{
    var gl = GL.gl;
    GL.setDepthTest(Comparison.DISABLED);
    GL.setCullMode(CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

	GL.setShader(this);

    texture.bind(0);

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, DataType.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, DataType.FLOAT, false, 16, 8);

    gl.uniform2f(this._directionLocation, dirX, dirY);

    GL.drawElements(gl.TRIANGLES, 6);
};


export { VSMBlurShader };