/**
 *
 * @constructor
 */
HX.TextureSlot = function() {
    this.location = -1;
    this.texture = null;
    this.name = null;   // for debugging
};

/**
 * Careful! Transparency and blending are two separate concepts!
 * Transparency represents actual transparent objects and affects how the light interacting with the object is
 * added to the rest of the lit scene.
 * Blending merely applies to how passes are applied to their render targets.
 */
HX.TransparencyMode = {
    OPAQUE: 0,      // light coming from behind the object is blocked.
    ALPHA: 1,       // light from behind is transparently blended with incoming light
    ADDITIVE: 2,    // light from behind the object is completely unblocked and added in. Useful for specular-only lighting such as glass, or when refracted diffuse is applied in a post pass.
    NUM_MODES: 3
};

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
    this._blendState = null;
    this._gbuffer = null;
    this._enabled = true;
    this._storeUniforms();
    this._textureSetters = HX.TextureSetter.getSetters(this);
};

HX.MaterialPass.GEOMETRY_PASS = 0;

// used for post-lighting
HX.MaterialPass.POST_LIGHT_PASS = 1;

// used for post-effects with composite available
HX.MaterialPass.POST_PASS = 2;

// the individual pass type are not taken into account, they will be dealt with specially
HX.MaterialPass.NUM_PASS_TYPES = 3;

// use diffuse as alias for geometry pass
// NUM_PASS_TYPES WILL BE SET PROPERLY UPON INITIALISATION DEPENDING ON DRAWBUFFER SUPPORT
HX.MaterialPass.GEOMETRY_COLOR_PASS = HX.MaterialPass.GEOMETRY_PASS;
HX.MaterialPass.GEOMETRY_NORMAL_PASS = HX.MaterialPass.NUM_PASS_TYPES;
HX.MaterialPass.GEOMETRY_SPECULAR_PASS = HX.MaterialPass.NUM_PASS_TYPES + 1;
// ALSO SET UPON INITIALISATION
HX.MaterialPass.SHADOW_MAP_PASS = -1;

HX.MaterialPass.prototype = {
    constructor: HX.MaterialPass,

    getShader: function ()
    {
        return this._shader;
    },

    set elementType(value)
    {
        this._elementType = value;
    },

    get elementType()
    {
        return this._elementType;
    },

    // use null for disabled
    set cullMode(value)
    {
        this._cullMode = value;
    },

    get cullMode()
    {
        return this._cullMode;
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

            if (texture.isReady())
                texture.bind(i);
            else
                texture._default.bind(i);
        }

        HX.setCullMode(this._cullMode);
        HX.setBlendState(this._blendState);
    },

    _storeUniforms: function()
    {
        var len = HX.GL.getProgramParameter(this._shader._program, HX.GL.ACTIVE_UNIFORMS);

        for (var i = 0; i < len; ++i) {
            var uniform = HX.GL.getActiveUniform(this._shader._program, i);
            var name = uniform.name;
            var location = HX.GL.getUniformLocation(this._shader._program, name);
            this._uniforms[name] = {type: uniform.type, location: location, size: uniform.size};
        }
    },

    getTextureSlot: function(slotName)
    {
        if (!this._uniforms.hasOwnProperty(slotName)) return null;

        HX.GL.useProgram(this._shader._program);

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

        if (slot == null) {
            slot = new HX.TextureSlot();
            slot.name = slotName;
            this._textureSlots.push(slot);
            HX.GL.uniform1i(location, i);
            slot.location = location;
        }

        return slot;
    },

    setTexture: function(slotName, texture)
    {
        var slot = this.getTextureSlot(slotName);
        if (slot)
            slot.texture = texture;
    },

    getUniformLocation: function(name)
    {
        if (this._uniforms.hasOwnProperty(name))
            return this._uniforms[name].location;
    },

    setUniformArray: function(name, value)
    {
        name = name + "[0]";

        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];

        HX.GL.useProgram(this._shader._program);

        switch(uniform.type) {
            case HX.GL.FLOAT:
                HX.GL.uniform1fv(uniform.location, value);
                break;
            case HX.GL.FLOAT_VEC2:
                HX.GL.uniform2fv(uniform.location, value);
                break;
            case HX.GL.FLOAT_VEC3:
                HX.GL.uniform3fv(uniform.location, value);
                break;
            case HX.GL.FLOAT_VEC4:
                HX.GL.uniform4fv(uniform.location, value);
                break;
            case HX.GL.INT:
                HX.GL.uniform1iv(uniform.location, value);
                break;
            case HX.GL.INT_VEC2:
                HX.GL.uniform2iv(uniform.location, value);
                break;
            case HX.GL.INT_VEC3:
                HX.GL.uniform3iv(uniform.location, value);
                break;
            case HX.GL.INT_VEC4:
                HX.GL.uniform1iv(uniform.location, value);
                break;
            case HX.GL.BOOL:
                HX.GL.uniform1bv(uniform.location, value);
                break;
            case HX.GL.BOOL_VEC2:
                HX.GL.uniform2bv(uniform.location, value);
                break;
            case HX.GL.BOOL_VEC3:
                HX.GL.uniform3bv(uniform.location, value);
                break;
            case HX.GL.BOOL_VEC4:
                HX.GL.uniform4bv(uniform.location, value);
                break;
            default:
                throw "Unsupported uniform format for setting. May be a todo.";

        }
    },

    setUniform: function(name, value)
    {
        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];

        HX.GL.useProgram(this._shader._program);

        switch(uniform.type) {
            case HX.GL.FLOAT:
                HX.GL.uniform1f(uniform.location, value);
                break;
            case HX.GL.FLOAT_VEC2:
                HX.GL.uniform2f(uniform.location, value.x, value.y);
                break;
            case HX.GL.FLOAT_VEC3:
                HX.GL.uniform3f(uniform.location, value.x || value.r, value.y || value.g, value.z || value.b );
                break;
            case HX.GL.FLOAT_VEC4:
                HX.GL.uniform4f(uniform.location, value.x || value.r, value.y || value.g, value.z || value.b, value.w || value.a);
                break;
            case HX.GL.INT:
                HX.GL.uniform1i(uniform.location, value);
                break;
            case HX.GL.INT_VEC2:
                HX.GL.uniform2i(uniform.location, value.x, value.y);
                break;
            case HX.GL.INT_VEC3:
                HX.GL.uniform3i(uniform.location, value.x, value.y, value.z);
                break;
            case HX.GL.INT_VEC4:
                HX.GL.uniform1i(uniform.location, value.x, value.y, value.z, value.w);
                break;
            case HX.GL.BOOL:
                HX.GL.uniform1i(uniform.location, value);
                break;
            case HX.GL.BOOL_VEC2:
                HX.GL.uniform2i(uniform.location, value.x, value.y);
                break;
            case HX.GL.BOOL_VEC3:
                HX.GL.uniform3i(uniform.location, value.x, value.y, value.z);
                break;
            case HX.GL.BOOL_VEC4:
                HX.GL.uniform4i(uniform.location, value.x, value.y, value.z, value.w);
                break;
            default:
                throw "Unsupported uniform format for setting. May be a todo.";

        }
    },

    isEnabled: function() { return this._enabled; },
    setEnabled: function(value) { this._enabled = value; }
};

/**
 *
 * @constructor
 */
HX.Material = function ()
{
    this._transparencyMode = HX.TransparencyMode.OPAQUE;
    this._passes = new Array(HX.Material.NUM_PASS_TYPES);
    this._renderOrderHint = ++HX.Material.ID_COUNTER;
    // forced render order by user:
    this._renderOrder = 0;
    this.onChange = new HX.Signal();
    this._textures = {};
    this._uniforms = {};

    // practically unused atm, except for unlit (0)
    this._lightingModelID = 1;
};

HX.Material.ID_COUNTER = 0;

HX.Material.prototype = {
    constructor: HX.Material,

    get transparencyMode()
    {
        return this._transparencyMode;
    },

    set transparencyMode(value)
    {
        this._transparencyMode = value;
    },

    get renderOrder()
    {
        return this._renderOrder;
    },

    set renderOrder(value)
    {
        this._renderOrder = value;
    },

    getPass: function (type)
    {
        return this._passes[type];
    },

    setPass: function (type, pass)
    {
        this._passes[type] = pass;

        if (pass) {
            for (var slotName in this._textures) {
                if (this._textures.hasOwnProperty(slotName))
                    pass.setTexture(slotName, this._textures[slotName]);
            }

            for (var uniformName in this._uniforms)
                if (this._uniforms.hasOwnProperty(uniformName)) {
                    if (uniformName.charAt(uniformName.length-1) == ']')
                        pass.setUniformArray(uniformName.substr(0, uniformName.length - 3), this._uniforms[uniformName]);
                    else
                        pass.setUniform(uniformName, this._uniforms[uniformName]);
                }
        }

        this.onChange.dispatch();
    },

    hasPass: function (type)
    {
        return !!this._passes[type];
    },

    setTexture: function(slotName, texture)
    {
        this._textures[slotName] = texture;

        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
            if (this.hasPass(i)) this._passes[i].setTexture(slotName, texture);
    },

    /**
     *
     * @param name
     * @param value
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniform: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name))
            return;

        this._uniforms[name] = value;

        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniform(name, value);
        }
    },

    /**
     *
     * @param name
     * @param value
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniformArray: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name + '[0]'))
            return;

        this._uniforms[name + '[0]'] = value;

        for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniformArray(name, value);
        }
    }

};