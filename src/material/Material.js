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

HX.Material.parseFromXML = function(xml)
{
    var material = new HX.Material();
    HX.Material._parseXMLTo(xml, material);
    return material;
};

HX.Material._parseXMLTo = function(xml, material)
{
    HX.Material._parsePassFromXML(xml, HX.MaterialPass.GEOMETRY_PASS, "geometry", material);

    HX.Material._parsePassFromXML(xml, HX.MaterialPass.POST_LIGHT_PASS, "preEffect", material);
    HX.Material._parsePassFromXML(xml, HX.MaterialPass.POST_PASS, "post", material);

    material.transparencyMode = HX.Material._translateTransparencyMode(xml.documentElement.getAttribute("transparencyMode"));

    var uniforms = xml.getElementsByTagName("uniforms")[0];

    if (uniforms) {
        var node = uniforms.firstChild;

        while (node) {
            if (node.nodeName != "#text") {
                var value = node.getAttribute("value").split(",");
                if (value.length == 1)
                    material.setUniform(node.nodeName, Number(value[0]), false);
                else
                    material.setUniform(node.nodeName, {x: Number(value[0]), y: Number(value[1]), z: Number(value[2]), w: Number(value[3])}, false);
            }

            node = node.nextSibling;
        }
    }

    // assign default textures
    material.setTexture("hx_dither2D", HX.DEFAULT_2D_DITHER_TEXTURE);
};

HX.Material._translateTransparencyMode = function(value)
{
    switch(value) {
        case "additive":
            return HX.TransparencyMode.ADDITIVE;
        case "alpha":
            return HX.TransparencyMode.ALPHA;
        default:
            return HX.TransparencyMode.OPAQUE;
    }
};

HX.Material._translateProperty = function(value)
{
    if (!HX.Material._properties) {
        HX.Material._properties = {
            back: HX.GL.BACK,
            front: HX.CullMode.FRONT,
            both: HX.CullMode.ALL,
            none: null,
            lines: HX.ElementType.LINES,
            points: HX.ElementType.POINTS,
            triangles: HX.ElementType.TRIANGLES,
            one: HX.BlendFactor.ONE,
            zero: HX.BlendFactor.ZERO,
            sourceColor: HX.BlendFactor.SOURCE_COLOR,
            oneMinusSourceColor: HX.BlendFactor.ONE_MINUS_SOURCE_COLOR,
            sourceAlpha: HX.BlendFactor.SOURCE_ALPHA,
            oneMinusSourceAlpha: HX.BlendFactor.ONE_MINUS_SOURCE_ALPHA,
            destinationAlpha: HX.BlendFactor.DST_ALPHA,
            oneMinusDestinationAlpha: HX.BlendFactor.ONE_MINUS_DESTINATION_ALPHA,
            destinationColor: HX.BlendFactor.DESTINATION_COLOR,
            sourceAlphaSaturate: HX.BlendFactor.SOURCE_ALPHA_SATURATE,
            add: HX.BlendOperation.ADD,
            subtract: HX.BlendOperation.SUBTRACT,
            reverseSubtract: HX.BlendOperation.REVERSE_SUBTRACT
        }
    }

    return HX.Material._properties[value];
};

HX.Material._decodeHTML = function(value)
{
    var e = document.createElement('div');
    e.innerHTML = value;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
};

HX.Material._addParsedPass = function (vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, passType, geometryPassTypeDef)
{
    fragmentShader = HX.GLSLIncludeGeometryPass + fragmentShader;

    if (geometryPassTypeDef) {
        var defines = "#define " + geometryPassTypeDef + "\n";
        vertexShader = defines + vertexShader;
        fragmentShader = defines + fragmentShader;
    }

    var shader = new HX.Shader(vertexShader, fragmentShader);
    var pass = new HX.MaterialPass(shader);

    if (elements)
        pass.elementType = HX.Material._translateProperty(elements.innerHTML);

    if (cullmode)
        pass.cullMode = HX.Material._translateProperty(cullmode.innerHTML);

    if (blend) {
        var blendState = new HX.BlendState();
        var source = blend.getElementsByTagName("source")[0];
        var dest = blend.getElementsByTagName("destination")[0];
        var op = blend.getElementsByTagName("operator")[0];
        blendState.srcFactor = source ? HX.Material._translateProperty(source.innerHTML) : HX.GL.ONE;
        blendState.dstFactor = dest ? HX.Material._translateProperty(dest.innerHTML) : HX.GL.ZERO;
        blendState.operator = source ? HX.Material._translateProperty(op.innerHTML) : HX.GL.FUNC_ADD;
        pass.blendState = blendState;
    }

    targetMaterial.setPass(passType, pass);
};

HX.Material._parsePassFromXML = function(xml, passType, tagName, targetMaterial)
{
    var common = xml.getElementsByTagName("common")[0];
    common = common ? common.innerHTML : "";
    var tags = xml.getElementsByTagName(tagName);
    if (tags === undefined || tags.length === 0) return;
    var passDef = tags[0];

    var vertexShaderID = passDef.getElementsByTagName("vertex")[0].innerHTML;
    var fragmentShaderID = passDef.getElementsByTagName("fragment")[0].innerHTML;
    var elements = passDef.getElementsByTagName("element")[0];
    var cullmode = passDef.getElementsByTagName("cullmode")[0];
    var blend = passDef.getElementsByTagName("blend")[0];

    var vertexShader = common + xml.querySelector("[id=" + vertexShaderID + "]").innerHTML;
    var fragmentShader = common + xml.querySelector("[id=" + fragmentShaderID + "]").innerHTML;
    vertexShader = HX.Material._decodeHTML(vertexShader);
    fragmentShader = HX.Material._decodeHTML(fragmentShader);

    if (passType === HX.MaterialPass.GEOMETRY_PASS) {
        if (HX.EXT_DRAW_BUFFERS)
            this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, passType);
        else {
            this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.MaterialPass.GEOMETRY_COLOR_PASS, "HX_NO_MRT_GBUFFER_COLOR");
            this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.MaterialPass.GEOMETRY_NORMAL_PASS, "HX_NO_MRT_GBUFFER_NORMALS");
            this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.MaterialPass.GEOMETRY_SPECULAR_PASS, "HX_NO_MRT_GBUFFER_SPECULAR");
        }

        if (HX.MaterialPass.SHADOW_MAP_PASS !== -1)
            this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.MaterialPass.SHADOW_MAP_PASS, "HX_SHADOW_MAP_PASS");
    }
    else {
        this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, passType);
    }


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

HX.FileMaterial = function(url, onComplete, onError)
{
    HX.Material.call(this);

    var urlLoader = new HX.URLLoader();
    var material = this;

    urlLoader.onComplete = function(data) {
        var parser = new DOMParser();
        var xml = parser.parseFromString(data, "text/xml");

        HX.Material._parseXMLTo(xml, material);

        if (onComplete) onComplete();
    };

    urlLoader.onError = function(code) {
        console.warn("Failed loading " + url + ". Error code: " + code);
        if (onError) onError(code);
    };

    urlLoader.load(url);
};

HX.FileMaterial.prototype = Object.create(HX.Material.prototype);