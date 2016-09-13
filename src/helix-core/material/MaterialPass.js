/**
 *
 * @param shader
 * @constructor
 */
HX.MaterialPass = function (shader)
{
    this._shader = shader;
    this._textureSlots = [];
    this._uniforms = {};
    this._elementType = HX.ElementType.TRIANGLES;
    this._cullMode = HX.CullMode.BACK;
    this._depthTest = HX.Comparison.LESS_EQUAL;
    this._writeDepth = true;
    this._blendState = null;
    this._gbuffer = null;
    this._storeUniforms();
    this._textureSetters = HX.TextureSetter.getSetters(this);

    // if material supports animations, this would need to be handled properly
    this._useSkinning = false;
};

// these will be set upon initialization
// if a shader supports multiple lights per pass, they will take up 3 type slots (fe: 3 point lights: POINT_LIGHT_PASS, POINT_LIGHT_PASS + 1, POINT_LIGHT_PASS + 2)
HX.MaterialPass.BASE_PASS = 0;  // used for unlit or for predefined lights
HX.MaterialPass.DIR_LIGHT_PASS = 1;
HX.MaterialPass.DIR_LIGHT_SHADOW_PASS = -1;
HX.MaterialPass.POINT_LIGHT_PASS = -1;
HX.MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS = -1;

HX.MaterialPass.NUM_PASS_TYPES = -1;

HX.MaterialPass.prototype =
{
    constructor: HX.MaterialPass,

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

    updateRenderState: function (renderer)
    {
        var len = this._textureSetters.length;

        for (var i = 0; i < len; ++i)
            this._textureSetters[i].execute(renderer);

        len = this._textureSlots.length;

        for (var i = 0; i < len; ++i) {
            var slot = this._textureSlots[i];
            var texture = slot.texture;

            if (!texture) {
                HX.Texture2D.DEFAULT.bind(i);
                continue;
            }

            if (texture.isReady())
                texture.bind(i);
            else
                texture._default.bind(i);
        }

        HX.setCullMode(this._cullMode);
        HX.setDepthTest(this._depthTest);
        HX.setDepthMask(this._writeDepth);
        HX.setBlendState(this._blendState);
    },

    _storeUniforms: function()
    {
        var len = HX_GL.getProgramParameter(this._shader._program, HX_GL.ACTIVE_UNIFORMS);

        for (var i = 0; i < len; ++i) {
            var uniform = HX_GL.getActiveUniform(this._shader._program, i);
            var name = uniform.name;
            var location = HX_GL.getUniformLocation(this._shader._program, name);
            this._uniforms[name] = {type: uniform.type, location: location, size: uniform.size};
        }
    },

    getTextureSlot: function(slotName)
    {
        if (!this._uniforms.hasOwnProperty(slotName)) return null;

        HX_GL.useProgram(this._shader._program);

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
            // TODO: Provide numTextures field, if > 1:
            // or instead of numTextures, can we query the size of the uniform vector?
            // instead of uniform1i, set uniform1iv
            // + push a texture slot for each
            var indices = new Int32Array(uniform.size);
            for (var s = 0; s < uniform.size; ++s) {
                slot = new HX.TextureSlot();
                slot.index = i;
                slot.name = slotName;
                this._textureSlots.push(slot);
                slot.location = location;
                indices[s] = i + s;
            }

            if (uniform.size === 1) {
                HX_GL.uniform1i(location, i);
            }
            else {
                HX_GL.uniform1iv(location, indices);
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
                if (slot.location !== location) return;
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
        name = name + "[0]";

        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];

        HX_GL.useProgram(this._shader._program);

        switch(uniform.type) {
            case HX_GL.FLOAT:
                HX_GL.uniform1fv(uniform.location, value);
                break;
            case HX_GL.FLOAT_VEC2:
                HX_GL.uniform2fv(uniform.location, value);
                break;
            case HX_GL.FLOAT_VEC3:
                HX_GL.uniform3fv(uniform.location, value);
                break;
            case HX_GL.FLOAT_VEC4:
                HX_GL.uniform4fv(uniform.location, value);
                break;
            case HX_GL.FLOAT_MAT4:
                HX_GL.uniformMatrix4fv(uniform.location, false, value);
                break;
            case HX_GL.INT:
                HX_GL.uniform1iv(uniform.location, value);
                break;
            case HX_GL.INT_VEC2:
                HX_GL.uniform2iv(uniform.location, value);
                break;
            case HX_GL.INT_VEC3:
                HX_GL.uniform3iv(uniform.location, value);
                break;
            case HX_GL.INT_VEC4:
                HX_GL.uniform1iv(uniform.location, value);
                break;
            case HX_GL.BOOL:
                HX_GL.uniform1bv(uniform.location, value);
                break;
            case HX_GL.BOOL_VEC2:
                HX_GL.uniform2bv(uniform.location, value);
                break;
            case HX_GL.BOOL_VEC3:
                HX_GL.uniform3bv(uniform.location, value);
                break;
            case HX_GL.BOOL_VEC4:
                HX_GL.uniform4bv(uniform.location, value);
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

        HX_GL.useProgram(this._shader._program);

        switch(uniform.type) {
            case HX_GL.FLOAT:
                HX_GL.uniform1f(uniform.location, value);
                break;
            case HX_GL.FLOAT_VEC2:
                HX_GL.uniform2f(uniform.location, value.x || value[0], value.y || value[1]);
                break;
            case HX_GL.FLOAT_VEC3:
                HX_GL.uniform3f(uniform.location, value.x || value.r || value[0] || 0, value.y || value.g || value[1] || 0, value.z || value.b || value[2] || 0 );
                break;
            case HX_GL.FLOAT_VEC4:
                HX_GL.uniform4f(uniform.location, value.x || value.r || value[0] || 0, value.y || value.g || value[1] || 0, value.z || value.b || value[2] || 0, value.w || value.a || value[3] || 0);
                break;
            case HX_GL.INT:
                HX_GL.uniform1i(uniform.location, value);
                break;
            case HX_GL.INT_VEC2:
                HX_GL.uniform2i(uniform.location, value.x || value[0], value.y || value[1]);
                break;
            case HX_GL.INT_VEC3:
                HX_GL.uniform3i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2]);
                break;
            case HX_GL.INT_VEC4:
                HX_GL.uniform1i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2], value.w || value[3]);
                break;
            case HX_GL.BOOL:
                HX_GL.uniform1i(uniform.location, value);
                break;
            case HX_GL.BOOL_VEC2:
                HX_GL.uniform2i(uniform.location, value.x || value[0], value.y || value[1]);
                break;
            case HX_GL.BOOL_VEC3:
                HX_GL.uniform3i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2]);
                break;
            case HX_GL.BOOL_VEC4:
                HX_GL.uniform4i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2], value.w || value[3]);
                break;
            case HX_GL.FLOAT_MAT4:
                HX_GL.uniformMatrix4fv(uniform.location, false, value._m);
                break;
            default:
                throw new Error("Unsupported uniform format for setting. May be a todo.");

        }
    }
};