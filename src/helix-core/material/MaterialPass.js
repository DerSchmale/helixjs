import {capabilities, Comparison, CullMode, DEFAULTS} from "../Helix";
import {TextureSetter} from "../shader/TextureSetter";
import {GL} from "../core/GL";
import {Texture2D} from "../texture/Texture2D";
import {UniformBufferSetter} from "../shader/UniformBufferSetter";
import {UniformSetter} from "../shader/UniformSetter";

/**
 * @ignore
 * @param shader
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MaterialPass(shader)
{
    this.shader = shader;
    this.cullMode = CullMode.BACK;
    this.writeColor = true;
    this.depthTest = Comparison.LESS_EQUAL;
    this.writeDepth = true;
    this.blendState = null;

    this._textures = new Array(shader.numTextures);
	this._uniformBuffers = new Array(shader.numUniformBuffers);

	this._uniformSettersInstance = UniformSetter.getSettersPerInstance(this);
	this._uniformSettersPass = UniformSetter.getSettersPerPass(this);
	this._textureSettersPass = TextureSetter.getSettersPerPass(this);
    this._textureSettersInstance = TextureSetter.getSettersPerInstance(this);

    if (capabilities.WEBGL_2) {
        this._uniformBufferSettersPass = UniformBufferSetter.getSettersPerPass(this);
        this._uniformBufferSettersInstance = UniformBufferSetter.getSettersPerInstance(this);
    }

    this.setTexture("hx_dither2D", DEFAULTS.DEFAULT_2D_DITHER_TEXTURE);
    this._uniformFuncs = {};
}

// these will be set upon initialization
// if a shader supports multiple lights per pass, they will take up 3 type slots (fe: 3 point lights: POINT_LIGHT_PASS, POINT_LIGHT_PASS + 1, POINT_LIGHT_PASS + 2)
MaterialPass.BASE_PASS = 0;  // used for unlit, for predefined lights, or for WebGL 2 dynamic  passes

MaterialPass.NORMAL_DEPTH_PASS = 1;

// shadow map generation
MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS = 2;
MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS = 3;

// dynamic lighting passes
MaterialPass.DIR_LIGHT_PASS = 4;
MaterialPass.POINT_LIGHT_PASS = 5;
MaterialPass.SPOT_LIGHT_PASS = 6;

// when using dynamic lighting and there are light probes, use this
MaterialPass.BASE_PASS_PROBES = 7;

MaterialPass.NUM_PASS_TYPES = 8;

MaterialPass.prototype =
    {
        constructor: MaterialPass,

        /**
         * Called per render item.
         */
        updateInstanceRenderState: function(camera, renderItem)
        {
            var len = this._textureSettersInstance.length;

            for (var i = 0; i < len; ++i) {
                this._textureSettersInstance[i].execute(renderItem);
            }

			len = this._uniformSettersInstance.length;
			for (var i = 0; i < len; ++i)
				this._uniformSettersInstance[i].execute(camera, renderItem);

            if (this._uniformBufferSettersInstance) {
                len = this._uniformBufferSettersInstance.length;

                for (i = 0; i < len; ++i) {
                    this._uniformBufferSettersInstance[i].execute(renderItem);
                }
            }
        },

        /**
         * Only called upon activation, not per render item.
         */
        updatePassRenderState: function (camera, renderer, data)
        {
			GL.setShader(this.shader);

            var len, i;

			for (var key in this._uniformFuncs)
				this._uniformFuncs[key]();

			len = this._uniformSettersPass.length;
			for (var i = 0; i < len; ++i)
				this._uniformSettersPass[i].execute(camera, renderer);

			len = this._textureSettersPass.length;

            for (i = 0; i < len; ++i) {
                this._textureSettersPass[i].execute(renderer);
            }

            if (this._uniformBufferSettersPass) {
                len = this._uniformBufferSettersPass.length;
                for (i = 0; i < len; ++i) {
                    this._uniformBufferSettersPass[i].execute(renderer);
                }
            }

            len = this._textures.length;

            for (i = 0; i < len; ++i) {
                var texture = this._textures[i];

                if (!texture) {
                    Texture2D.DEFAULT.bind(i);
                    continue;
                }

                if (texture.isReady())
                    texture.bind(i);
                else
                    texture._default.bind(i);
            }

            len = this._uniformBuffers.length;

            for (i = 0; i < len; ++i) {
                var buffer = this._uniformBuffers[i];
                if (buffer)
                    buffer.bind(i);
            }

            GL.setMaterialPassState(this.cullMode, this.depthTest, this.writeDepth, this.writeColor, this.blendState);
        },

		/**
         * Allows getting the texture index. For textures that often change, it may be better to cache this value and
         * assign the textures through setTextureByIndex.
		 */
		getTextureIndex: function(name)
        {
			return this.shader.getTextureIndex(name);
        },

		hasTexture: function(name)
		{
			return this.getTextureIndex(name) !== -1;
		},

        setTexture: function(name, texture)
        {
            var index = this.shader.getTextureIndex(name);
			if (index !== -1)
                this._textures[index] = texture;
        },

		setTextureByIndex: function(index, texture)
		{
			this._textures[index] = texture;
		},

		setTextureArray: function(name, textures)
		{
			var firstIndex = this.getTextureIndex(name + "[0]");

			if (firstIndex === -1) return;
			for (var i = 0, len = textures.length; i < len; ++i) {
				this._textures[firstIndex + i] = textures[i]
			}
		},

		setTextureArrayByIndex: function(firstIndex, textures)
		{
			for (var i = 0, len = textures.length; i < len; ++i) {
				this._textures[firstIndex + i] = textures[i]
			}
		},

		/**
		 * Allows getting the uniform buffer index. For textures that often change, it may be better to cache this value
		 * and assign the textures through setUniformBufferByIndex.
		 */
		getUniformBufferIndex: function(name)
		{
			return this.shader.getUniformBufferIndex(name);
		},

        setUniformBuffer: function(name, buffer)
        {
            var index = this.shader.getUniformBufferIndex(name);
            if (index !== -1)
                this._uniformBuffers[index] = buffer;
        },

		setUniformBufferByIndex: function(index, buffer)
		{
			this._uniformBuffers[index] = buffer;
		},

		getUniformLocation: function(name)
        {
            return this.shader.getUniformLocation(name);
        },

        getAttributeLocation: function(name)
        {
            return this.shader.getAttributeLocation(name);
        },

        // slow :(
        setUniformStructArray: function(name, value)
        {
            var len = value.length;
            for (var i = 0; i < len; ++i) {
                var elm = value[i];
                for (var key in elm) {
                    if (elm.hasOwnProperty(key))
                        this.setUniform(name + "[" + i + "]." + key, value);
                }
            }
        },

        setUniformArray: function(name, value)
        {
            name += "[0]";

            var uniform = this.shader.getUniform(name);

            if (!uniform) return;
            var gl = GL.gl;
            var func;

            switch(uniform.type) {
                case gl.FLOAT:
					func = gl.uniform1fv.bind(gl, uniform.location, value);
                    break;
                case gl.FLOAT_VEC2:
					func = gl.uniform2fv.bind(gl, uniform.location, value);
                    break;
                case gl.FLOAT_VEC3:
					func = gl.uniform3fv.bind(gl, uniform.location, value);
                    break;
                case gl.FLOAT_VEC4:
					func = gl.uniform4fv.bind(gl, uniform.location, value);
                    break;
                case gl.FLOAT_MAT4:
					func = gl.uniformMatrix4fv.bind(gl, uniform.location, false, value);
                    break;
                case gl.INT:
					func = gl.uniform1iv.bind(gl, uniform.location, value);
                    break;
                case gl.INT_VEC2:
					func = gl.uniform2iv.bind(gl, uniform.location, value);
                    break;
                case gl.INT_VEC3:
					func = gl.uniform3iv.bind(gl, uniform.location, value);
                    break;
                case gl.INT_VEC4:
					func = gl.uniform1iv.bind(gl, uniform.location, value);
                    break;
                case gl.BOOL:
					func = gl.uniform1bv.bind(gl, uniform.location, value);
                    break;
                case gl.BOOL_VEC2:
					func = gl.uniform2bv.bind(gl, uniform.location, value);
                    break;
                case gl.BOOL_VEC3:
					func = gl.uniform3bv.bind(gl, uniform.location, value);
                    break;
                case gl.BOOL_VEC4:
					func = gl.uniform4bv.bind(gl, uniform.location, value);
                    break;
                default:
                    throw new Error("Unsupported uniform format for setting (" + uniform.type + ") for uniform '" + name + "'. May be a todo.");

            }

			this._uniformFuncs[name] = func;
        },

        setUniform: function(name, value)
        {
            var uniform = this.shader.getUniform(name);

            if (!uniform) return;

            var gl = GL.gl;
            var func;

            switch(uniform.type) {
                case gl.FLOAT:
					func = gl.uniform1f.bind(gl, uniform.location, value);
                    break;
                case gl.FLOAT_VEC2:
					func = gl.uniform2f.bind(gl, uniform.location, value.x || value[0] || 0, value.y || value[1] || 0);
                    break;
                case gl.FLOAT_VEC3:
					func = gl.uniform3f.bind(gl, uniform.location, value.x || value.r || value[0] || 0, value.y || value.g || value[1] || 0, value.z || value.b || value[2] || 0 );
                    break;
                case gl.FLOAT_VEC4:
					func = gl.uniform4f.bind(gl, uniform.location, value.x || value.r || value[0] || 0, value.y || value.g || value[1] || 0, value.z || value.b || value[2] || 0, value.w || value.a || value[3] || 0);
                    break;
                case gl.INT:
					func = gl.uniform1i.bind(gl, uniform.location, value);
                    break;
                case gl.INT_VEC2:
					func = gl.uniform2i.bind(gl, uniform.location, value.x || value[0], value.y || value[1]);
                    break;
                case gl.INT_VEC3:
					func = gl.uniform3i.bind(gl, uniform.location, value.x || value[0], value.y || value[1], value.z || value[2]);
                    break;
                case gl.INT_VEC4:
					func = gl.uniform4i.bind(gl, uniform.location, value.x || value[0], value.y || value[1], value.z || value[2], value.w || value[3]);
                    break;
                case gl.BOOL:
					func = gl.uniform1i.bind(gl, uniform.location, value);
                    break;
                case gl.BOOL_VEC2:
					func = gl.uniform2i.bind(gl, uniform.location, value.x || value[0], value.y || value[1]);
                    break;
                case gl.BOOL_VEC3:
					func = gl.uniform3i.bind(gl, uniform.location, value.x || value[0], value.y || value[1], value.z || value[2]);
                    break;
                case gl.BOOL_VEC4:
					func = gl.uniform4i.bind(gl, uniform.location, value.x || value[0], value.y || value[1], value.z || value[2], value.w || value[3]);
                    break;
                case gl.FLOAT_MAT4:
					func = gl.uniformMatrix4fv.bind(gl, uniform.location, false, value._m);
                    break;
                default:
                    throw new Error("Unsupported uniform format for setting. May be a todo.");
            }

			this._uniformFuncs[name] = func;
        }
    };

export { MaterialPass };