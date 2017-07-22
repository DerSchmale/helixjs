import {Comparison, CullMode, DEFAULTS, ElementType} from "../Helix";
import {TextureSetter} from "../shader/TextureSetter";
import {GL} from "../core/GL";
import {TextureSlot} from "./TextureSlot";
import {Texture2D} from "../texture/Texture2D";

/**
 * @ignore
 * @param shader
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MaterialPass(shader)
{
    this._shader = shader;
    this._textureSlots = [];
    this._uniforms = {};
    this._elementType = ElementType.TRIANGLES;
    this._cullMode = CullMode.BACK;
    this._writeColor = true;
    this._depthTest = Comparison.LESS_EQUAL;
    this._writeDepth = true;
    this._blendState = null;

    this._storeUniforms();
    this._textureSettersPass = TextureSetter.getSettersPerPass(this);
    this._textureSettersInstance = TextureSetter.getSettersPerInstance(this);

    // if material supports animations, this would need to be handled properly
    this._useSkinning = false;
    this.setTexture("hx_dither2D", DEFAULTS.DEFAULT_2D_DITHER_TEXTURE);
}

// these will be set upon initialization
// if a shader supports multiple lights per pass, they will take up 3 type slots (fe: 3 point lights: POINT_LIGHT_PASS, POINT_LIGHT_PASS + 1, POINT_LIGHT_PASS + 2)
MaterialPass.BASE_PASS = 0;  // used for unlit or for predefined lights

// dynamic lighting passes
MaterialPass.DIR_LIGHT_PASS = 1;
MaterialPass.DIR_LIGHT_SHADOW_PASS = 2;
MaterialPass.POINT_LIGHT_PASS = 3;
MaterialPass.SPOT_LIGHT_PASS = 4;
MaterialPass.LIGHT_PROBE_PASS = 5;

// shadow map generation
MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS = 6;

// used if MRT is supported:
MaterialPass.GBUFFER_PASS = 7;

// used if MRT is not supported
MaterialPass.GBUFFER_ALBEDO_PASS = 7;
MaterialPass.GBUFFER_NORMAL_DEPTH_PASS = 8;
MaterialPass.GBUFFER_SPECULAR_PASS = 9;

MaterialPass.NUM_PASS_TYPES = 10;

MaterialPass.prototype =
{
    constructor: MaterialPass,

    getShader: function ()
    {
        return this._shader;
    },

    get elementType()
    {
        return this._elementType;
    },

    set elementType(value)
    {
        this._elementType = value;
    },

    get depthTest()
    {
        return this._depthTest;
    },

    set depthTest(value)
    {
        this._depthTest = value;
    },

    get writeColor()
    {
        return this._writeColor;
    },

    set writeColor(value)
    {
        this._writeColor = value;
    },
    get writeDepth()
    {
        return this._writeDepth;
    },

    set writeDepth(value)
    {
        this._writeDepth = value;
    },

    get cullMode()
    {
        return this._cullMode;
    },

    // use null for disabled
    set cullMode(value)
    {
        this._cullMode = value;
    },

    get blendState()
    {
        return this._blendState;
    },

    set blendState(value)
    {
        this._blendState = value;
    },

    /**
     * Called per render item.
     * TODO: Could separate UniformSetters per pass / instance as well
     */
    updateInstanceRenderState: function(camera, renderItem)
    {
        var len = this._textureSettersInstance.length;

        for (var i = 0; i < len; ++i) {
            this._textureSettersInstance[i].execute(renderItem);
        }

        this._shader.updateInstanceRenderState(camera, renderItem);
    },

    /**
     * Only called upon activation, not per render item.
     */
    updatePassRenderState: function (camera, renderer)
    {
        var len = this._textureSettersPass.length;
        var i;
        for (i = 0; i < len; ++i) {
            this._textureSettersPass[i].execute(renderer);
        }

        len = this._textureSlots.length;

        for (i = 0; i < len; ++i) {
            var slot = this._textureSlots[i];
            var texture = slot.texture;

            if (!texture) {
                Texture2D.DEFAULT.bind(i);
                continue;
            }

            if (texture.isReady())
                texture.bind(i);
            else
                texture._default.bind(i);
        }

        GL.setMaterialPassState(this._cullMode, this._depthTest, this._writeDepth, this._writeColor, this._blendState);

        this._shader.updatePassRenderState(camera, renderer);
    },

    _storeUniforms: function()
    {
        var gl = GL.gl;
        var len = gl.getProgramParameter(this._shader._program, gl.ACTIVE_UNIFORMS);

        for (var i = 0; i < len; ++i) {
            var uniform = gl.getActiveUniform(this._shader._program, i);
            var name = uniform.name;
            var location = gl.getUniformLocation(this._shader._program, name);
            this._uniforms[name] = {type: uniform.type, location: location, size: uniform.size};
        }
    },

    getTextureSlot: function(slotName)
    {
        if (!this._uniforms.hasOwnProperty(slotName)) return null;

        var gl = GL.gl;
        gl.useProgram(this._shader._program);

        var uniform = this._uniforms[slotName];

        if (!uniform) return;

        var location = uniform.location;

        var slot = null;

        // reuse if location is already used
        var len = this._textureSlots.length;
        for (var i = 0; i < len; ++i) {
            if (this._textureSlots[i].location === location) {
                slot = this._textureSlots[i];
                break;
            }
        }

        if (!slot) {
            var indices = new Int32Array(uniform.size);
            for (var s = 0; s < uniform.size; ++s) {
                slot = new TextureSlot();
                slot.index = i;
                slot.name = slotName;
                this._textureSlots.push(slot);
                slot.location = location;
                indices[s] = i + s;
            }

            if (uniform.size === 1) {
                gl.uniform1i(location, i);
            }
            else {
                gl.uniform1iv(location, indices);
            }
        }

        return slot;
    },

    setTexture: function(slotName, texture)
    {
        var slot = this.getTextureSlot(slotName);
        if (slot)
            slot.texture = texture;
    },

    setTextureArray: function(slotName, textures)
    {
        var firstSlot = this.getTextureSlot(slotName + "[0]");
        var location = firstSlot.location;
        if (firstSlot) {
            var len = textures.length;
            for (var i = 0; i < len; ++i) {
                var slot = this._textureSlots[firstSlot.index + i];
                // make sure we're not overshooting the array and writing to another element (larger arrays are allowed analogous to uniform arrays)
                if (!slot || slot.location !== location) return;
                slot.texture = textures[i];
            }
        }
    },

    getUniformLocation: function(name)
    {
        if (this._uniforms.hasOwnProperty(name))
            return this._uniforms[name].location;
    },

    getAttributeLocation: function(name)
    {
        return this._shader.getAttributeLocation(name);
    },

    // slow :(
    setUniformStructArray: function(name, value)
    {
        var len = value.length;
        for (var i = 0; i < len; ++i) {
            var elm = value[i];
            for (var key in elm) {
                if (elm.hasOwnProperty("key"))
                    this.setUniform(name + "[" + i + "]." + key, value);
            }
        }
    },

    setUniformArray: function(name, value)
    {
        name += "[0]";

        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];
        var gl = GL.gl;
        gl.useProgram(this._shader._program);

        switch(uniform.type) {
            case gl.FLOAT:
                gl.uniform1fv(uniform.location, value);
                break;
            case gl.FLOAT_VEC2:
                gl.uniform2fv(uniform.location, value);
                break;
            case gl.FLOAT_VEC3:
                gl.uniform3fv(uniform.location, value);
                break;
            case gl.FLOAT_VEC4:
                gl.uniform4fv(uniform.location, value);
                break;
            case gl.FLOAT_MAT4:
                gl.uniformMatrix4fv(uniform.location, false, value);
                break;
            case gl.INT:
                gl.uniform1iv(uniform.location, value);
                break;
            case gl.INT_VEC2:
                gl.uniform2iv(uniform.location, value);
                break;
            case gl.INT_VEC3:
                gl.uniform3iv(uniform.location, value);
                break;
            case gl.INT_VEC4:
                gl.uniform1iv(uniform.location, value);
                break;
            case gl.BOOL:
                gl.uniform1bv(uniform.location, value);
                break;
            case gl.BOOL_VEC2:
                gl.uniform2bv(uniform.location, value);
                break;
            case gl.BOOL_VEC3:
                gl.uniform3bv(uniform.location, value);
                break;
            case gl.BOOL_VEC4:
                gl.uniform4bv(uniform.location, value);
                break;
            default:
                throw new Error("Unsupported uniform format for setting (" + uniform.type + ") for uniform '" + name + "'. May be a todo.");

        }
    },

    setUniform: function(name, value)
    {
        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];

        var gl = GL.gl;
        gl.useProgram(this._shader._program);

        switch(uniform.type) {
            case gl.FLOAT:
                gl.uniform1f(uniform.location, value);
                break;
            case gl.FLOAT_VEC2:
                gl.uniform2f(uniform.location, value.x || value[0] || 0, value.y || value[1] || 0);
                break;
            case gl.FLOAT_VEC3:
                gl.uniform3f(uniform.location, value.x || value.r || value[0] || 0, value.y || value.g || value[1] || 0, value.z || value.b || value[2] || 0 );
                break;
            case gl.FLOAT_VEC4:
                gl.uniform4f(uniform.location, value.x || value.r || value[0] || 0, value.y || value.g || value[1] || 0, value.z || value.b || value[2] || 0, value.w || value.a || value[3] || 0);
                break;
            case gl.INT:
                gl.uniform1i(uniform.location, value);
                break;
            case gl.INT_VEC2:
                gl.uniform2i(uniform.location, value.x || value[0], value.y || value[1]);
                break;
            case gl.INT_VEC3:
                gl.uniform3i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2]);
                break;
            case gl.INT_VEC4:
                gl.uniform4i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2], value.w || value[3]);
                break;
            case gl.BOOL:
                gl.uniform1i(uniform.location, value);
                break;
            case gl.BOOL_VEC2:
                gl.uniform2i(uniform.location, value.x || value[0], value.y || value[1]);
                break;
            case gl.BOOL_VEC3:
                gl.uniform3i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2]);
                break;
            case gl.BOOL_VEC4:
                gl.uniform4i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2], value.w || value[3]);
                break;
            case gl.FLOAT_MAT4:
                gl.uniformMatrix4fv(uniform.location, false, value._m);
                break;
            default:
                throw new Error("Unsupported uniform format for setting. May be a todo.");

        }
    }
};

export { MaterialPass };