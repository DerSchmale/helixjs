import {GL} from '../core/GL';
import {capabilities} from '../Helix';
import {UniformBuffer} from "../core/UniformBuffer";
import {ProgramCache} from "./ProgramCache";

var COUNTER = 0;

/**
 * @ignore
 * @param vertexShaderCode
 * @param fragmentShaderCode
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Shader(vertexShaderCode, fragmentShaderCode)
{
	this.program = null;
	this.renderOrderHint = -1;
	this._uniforms = null;
	this._numAttributes = 0;
	this._textureUniforms = null;
	this._uniformBlocks = null;
	this._ready = false;
	this._idx = COUNTER++;	// internal caching id, probably need to use program._idx instead?

	if (vertexShaderCode && fragmentShaderCode)
		this.init(vertexShaderCode, fragmentShaderCode);
}

Shader.prototype = {
	constructor: Shader,

	isReady: function()
	{
		return this._ready;
	},

	init: function(vertexShaderCode, fragmentShaderCode)
	{
		this._cachedProgram = ProgramCache.getProgram(vertexShaderCode, fragmentShaderCode);
		// program compilation error:
		if (!this._cachedProgram) return;
		this.program = this._cachedProgram.program;
		this.renderOrderHint = this._cachedProgram.renderOrderHint;

		this._storeUniforms();
		this._storeAttributes();

		this._ready = true;
	},

	hasUniform: function(name)
	{
		return this._uniforms.hasOwnProperty(name);
	},

	getUniform: function(name)
	{
		return this._uniforms[name];
	},

	getUniformLocation: function(name)
	{
		if (this.hasUniform(name))
			return this._uniforms[name].location;

		return null;
	},

	getAttributeLocation: function(name)
	{
		return GL.gl.getAttribLocation(this.program, name);
	},

	_storeAttributes: function()
	{
		var gl = GL.gl;

		this._attributeFlags = 0;
		this._numAttributes = 0;
		var len = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
		for (var i = 0; i < len; ++i) {
			var attrib = gl.getActiveAttrib(this.program, i);
			var loc = gl.getAttribLocation(this.program, attrib.name);
			this._attributeFlags |= 1 << loc;
			this._numAttributes = Math.max(loc + 1, this._numAttributes);
		}
	},

	_storeUniforms: function()
	{
		this._uniforms = {};
		this._textureUniforms = [];
		this._uniformBlocks = [];

		var textureCount = 0;

		var gl = GL.gl;

		gl.useProgram(this.program);

		var len = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);

		for (var i = 0; i < len; ++i) {
			var uniform = gl.getActiveUniform(this.program, i);
			var name = uniform.name;
			var location = gl.getUniformLocation(this.program, name);
			this._uniforms[name] = {type: uniform.type, location: location, size: uniform.size};

			if (uniform.type === gl.SAMPLER_2D || uniform.type === gl.SAMPLER_CUBE) {
				// this should also take care of texture arrays, right?
				this._textureUniforms.push(uniform);
				gl.uniform1i(location, textureCount++);
			}
		}

		if (capabilities.WEBGL_2) {
			len = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORM_BLOCKS);
			for (i = 0; i < len; ++i) {
				var name = gl.getActiveUniformBlockName(this.program, i);
				gl.uniformBlockBinding(this.program, i, i);
				this._uniformBlocks.push(name);
			}
		}

	},

	createUniformBuffer: function(name)
	{
		var gl = GL.gl;
		var program = this.program;

		var blockIndex = null;
		for (var i = 0, len = this._uniformBlocks.length; i < len; ++i) {
			if (this._uniformBlocks[i] === name) {
				blockIndex = i;
				break;
			}
		}
		if (!blockIndex) return null;


		var indices = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES);
		var totalSize = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE);
		var uniformBuffer = new UniformBuffer(totalSize);

		var offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);

		for (i = 0; i < indices.length; ++i) {
			var uniform = gl.getActiveUniform(program, indices[i]);
			uniformBuffer.registerUniform(uniform.name, offsets[i], uniform.size, uniform.type);
		}

		uniformBuffer.uploadData(new Float32Array(totalSize / 4));

		return uniformBuffer;
	},

	get numTextures()
	{
		return this._textureUniforms.length;
	},

	getTextureIndex: function(name)
	{
		for (var i = 0, len = this._textureUniforms.length; i < len; ++i) {
			var uniform = this._textureUniforms[i];
			if (uniform.name === name) return i;
		}

		return -1;
	},

	getUniformBufferIndex: function(name)
	{
		for (var i = 0, len = this._uniformBlocks.length; i < len; ++i) {
			if (this._uniformBlocks[i] === name) return i;
		}

		return -1;
	},

	get numUniformBuffers()
	{
		return this._uniformBlocks.length;
	}
};

export {Shader};