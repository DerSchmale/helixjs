import {DEFAULTS, CullMode, Comparison} from "../Helix";
import {MaterialPass} from '../material/MaterialPass'
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {RectMesh} from "../mesh/RectMesh";
import {VertexLayout} from "../mesh/VertexLayout";
import {Shader} from "../shader/Shader";
import {GL} from "../core/GL";

/**
 * @classdesc
 * EffectPass is a class used to execute a simple 2D render call. It's used by {@linkcode Effect} classes to perform
 * individual render tasks, but can also be used stand-alone for simple texture filtering tasks.
 *
 * @constructor
 * @param {string} vertexShader The vertex shader code for this pass's shader.
 * @param {string} fragmentShader The fragment shader code for this pass's shader.
 *
 * @property mesh Allows setting a custom mesh to render. Defaults to the default full-screen rect.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function EffectPass(vertexShader, fragmentShader)
{
	vertexShader = vertexShader || ShaderLibrary.get("default_post_vertex.glsl");
	var shader = new Shader(vertexShader, fragmentShader);

	MaterialPass.call(this, shader);

	this.cullMode = CullMode.NONE;
	this.depthTest = Comparison.DISABLED;
	this.writeDepth = false;
	this._vertexLayout = null;
	this.mesh = RectMesh.DEFAULT;

	this.setTexture("hx_dither2D", DEFAULTS.DEFAULT_2D_DITHER_TEXTURE);
}

EffectPass.prototype = Object.create(MaterialPass.prototype, {
	mesh: {
		get: function()
		{
			return this._mesh;
		},
		set: function(value)
		{
			if (this._mesh === value) return;
			this._mesh = value;
			this._vertexLayout = new VertexLayout(this._mesh, this.shader);
		}
	}
});

/**
 * Execute the EffectPass
 * @param renderer The main renderer used for drawing. This is only required if some automatically assigned uniforms are
 * used.
 */
EffectPass.prototype.draw = function(renderer)
{
	this.updateRenderState(renderer);
	GL.drawElements(GL.gl.TRIANGLES, 6);
};

/**
 * @ignore
 */
EffectPass.prototype.updateRenderState = function(renderer)
{
	var cam = renderer._camera;
	this.updateInstanceRenderState(cam);
	this.updatePassRenderState(cam, renderer);

	this._mesh._vertexBuffers[0].bind();
	this._mesh._indexBuffer.bind();

	var layout = this._vertexLayout;
	var attributes = layout.attributes;
	var len = attributes.length;

	for (var i = 0; i < len; ++i) {
		var attribute = attributes[i];
		GL.gl.vertexAttribPointer(attribute.index, attribute.numComponents, GL.gl.FLOAT, false, attribute.stride, attribute.offset);
	}
};

export {EffectPass};