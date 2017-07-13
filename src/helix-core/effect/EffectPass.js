/**
 * @constructor
 */
import {DEFAULTS, CullMode, Comparison} from "../Helix";
import {MaterialPass} from '../material/MaterialPass'
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {RectMesh} from "../mesh/RectMesh";
import {VertexLayout} from "../mesh/VertexLayout";
import {Shader} from "../shader/Shader";
import {GL} from "../core/GL";

function EffectPass(vertexShader, fragmentShader)
{
    vertexShader = vertexShader || ShaderLibrary.get("default_post_vertex.glsl");
    var shader = new Shader(vertexShader, fragmentShader);

    MaterialPass.call(this, shader);

    this._vertexLayout = null;
    this._cullMode = CullMode.NONE;
    this._depthTest = Comparison.DISABLED;
    this._writeDepth = false;
    this.setMesh(RectMesh.DEFAULT);

    this.setTexture("hx_dither2D", DEFAULTS.DEFAULT_2D_DITHER_TEXTURE);
}

EffectPass.prototype = Object.create(MaterialPass.prototype);

EffectPass.prototype.setMesh = function(mesh)
{
    if (this._mesh === mesh) return;
    this._mesh = mesh;
    this._vertexLayout = new VertexLayout(this._mesh, this);
};

EffectPass.prototype.updateRenderState = function(renderer)
{
    var cam = renderer._camera;
    this.updateInstanceRenderState(cam);
    this.updatePassRenderState(cam, renderer);

    // TODO: Could we implement this by GL.setMesh(mesh, layout), also in renderer?
    this._mesh._vertexBuffers[0].bind();
    this._mesh._indexBuffer.bind();

    var layout = this._vertexLayout;
    var attributes = layout.attributes;
    var len = attributes.length;

    for (var i = 0; i < len; ++i) {
        var attribute = attributes[i];
        GL.gl.vertexAttribPointer(attribute.index, attribute.numComponents, GL.gl.FLOAT, false, attribute.stride, attribute.offset);
    }

    GL.enableAttributes(layout._numAttributes);
};

export { EffectPass };