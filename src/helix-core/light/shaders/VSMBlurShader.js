import {Comparison, CullMode, DataType} from "../../Helix";
import {GL} from "../../core/GL";
import {Shader} from '../../shader/Shader';
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {VertexLayout} from "../../mesh/VertexLayout";
import {RectMesh} from "../../mesh/RectMesh";

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
	this._layout = new VertexLayout(RectMesh.DEFAULT, this);

    gl.useProgram(this.program);
    gl.uniform1i(this._textureLocation, 0);
}

VSMBlurShader.prototype = Object.create(Shader.prototype);

VSMBlurShader.prototype.execute = function (texture, dirX, dirY)
{
    var gl = GL.gl;
    GL.setDepthTest(Comparison.DISABLED);
    GL.setCullMode(CullMode.NONE);
	GL.setShader(this);
	GL.setVertexLayout(this._layout);

    texture.bind(0);

    gl.uniform2f(this._directionLocation, dirX, dirY);

    GL.drawElements(gl.TRIANGLES, 6);
};


export { VSMBlurShader };