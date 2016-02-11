/**
 * The HMT file format is for file-based materials (JSON)
 * @constructor
 */
HX.HMT = function()
{
    HX.Importer.call(this, HX.Material);
    HX.HMT._initPropertyMap();
};

HX.HMT.prototype = Object.create(HX.Importer.prototype);

HX.HMT.prototype.parse = function(data, target)
{
    data = JSON.parse(data);
    this._loadShaders(data, target);
};

HX.HMT.prototype._gatherShaderFiles = function(data)
{
    var passes = data.passes;
    var files = [];
    for (var key in passes) {
        if (passes.hasOwnProperty(key)) {
            var vertex = passes[key].vertexShader;
            var fragment = passes[key].fragmentShader;
            if (files.indexOf(vertex) < 0) files.push(this._correctURL(vertex));
            if (files.indexOf(fragment) < 0) files.push(this._correctURL(fragment));
        }
    }

    return files;
};

HX.HMT.prototype._loadShaders = function(data, material)
{
    var shaders = {};
    var shaderFiles = this._gatherShaderFiles(data);
    var bulkLoader = new HX.BulkURLLoader();
    var self = this;

    bulkLoader.onComplete = function() {
        for (var i = 0; i < shaderFiles.length; ++i) {
            shaders[shaderFiles[i]] = bulkLoader.getData(shaderFiles[i]);
        }

        self._processMaterial(data, shaders, material);
        self._loadTextures(data, material);
    };
    bulkLoader.onFail = function(code)
    {
        self._notifyFailure("Error loading shaders: " + code);
    };
    bulkLoader.load(shaderFiles);
};


HX.HMT.prototype._processMaterial = function(data, shaders, material)
{
    var passes = data.passes;

    if (passes.geometry !== undefined) this._processPass(material, passes.geometry, HX.MaterialPass.GEOMETRY_PASS, shaders);
    if (passes.postlight !== undefined) this._processPass(material, passes.postlight, HX.MaterialPass.POST_LIGHT_PASS, shaders);
    if (passes.post !== undefined) this._processPass(material, passes.post, HX.MaterialPass.POST_PASS, shaders);

    if (data.transparencyMode !== undefined) material.transparencyMode = HX.HMT._PROPERTY_MAP[data.transparencyMode];

    this._applyUniforms(data, material);

    // default pre-defined texture
    material.setTexture("hx_dither2D", HX.DEFAULT_2D_DITHER_TEXTURE);
};

HX.HMT.prototype._processPass = function(material, passData, passType, shaders)
{
    var vertexShader = shaders[this._correctURL(passData.vertexShader)];
    var fragmentShader = shaders[this._correctURL(passData.fragmentShader)];

    if (passType === HX.MaterialPass.GEOMETRY_PASS) {
        if (HX.EXT_DRAW_BUFFERS)
            this._addPass(vertexShader, fragmentShader, passData, material, passType);
        else {
            this._addPass(vertexShader, fragmentShader, passData, material, HX.MaterialPass.GEOMETRY_COLOR_PASS, "HX_NO_MRT_GBUFFER_COLOR");
            this._addPass(vertexShader, fragmentShader, passData, material, HX.MaterialPass.GEOMETRY_NORMAL_PASS, "HX_NO_MRT_GBUFFER_NORMALS");
            this._addPass(vertexShader, fragmentShader, passData, material, HX.MaterialPass.GEOMETRY_SPECULAR_PASS, "HX_NO_MRT_GBUFFER_SPECULAR");
        }

        this._addPass(vertexShader, fragmentShader, passData, material, HX.MaterialPass.SHADOW_DEPTH_PASS, "HX_SHADOW_DEPTH_PASS");
    }
    else {
        this._addPass(vertexShader, fragmentShader, passData, material, passType);
    }
};

HX.HMT.prototype._addPass = function(vertexShader, fragmentShader, passData, material, passType, geometryPassTypeDef)
{
    fragmentShader = HX.GLSLIncludeGeometryPass + fragmentShader;

    if (geometryPassTypeDef) {
        var defines = "#define " + geometryPassTypeDef + "\n";
        vertexShader = defines + vertexShader;
        fragmentShader = defines + fragmentShader;
    }

    var shader = new HX.Shader(vertexShader, fragmentShader);
    var pass = new HX.MaterialPass(shader);

    if (passData.elementType)
        pass.elementType = HX.HMT._PROPERTY_MAP[passData.elementType];

    if (passData.cullMode)
        pass.cullMode = HX.HMT._PROPERTY_MAP[passData.cullMode];

    if (passData.blend) {
        var blendState = new HX.BlendState();

        if (blend.hasOwnProperty("source"))
            blendState.srcFactor = HX.HMT._PROPERTY_MAP[blend.source];

        if (blend.hasOwnProperty("destination"))
            blendState.srcFactor = HX.HMT._PROPERTY_MAP[blend.destination];

        if (blend.hasOwnProperty("operator"))
            blendState.operator = HX.HMT._PROPERTY_MAP[blend.operator];

        pass.blendState = blendState;
    }

    material.setPass(passType, pass);
};

HX.HMT.prototype._applyUniforms = function(data, material)
{
    if (!data.uniforms) return;

    for (var key in data.uniforms) {
        if (!data.uniforms.hasOwnProperty(key)) continue;

        var value = data.uniforms[key];
        if (isNaN(value))
            material.setUniform(key, {
                x: value[0],
                y: value[1],
                z: value[2],
                w: value[3]
            }, false);
        else
            material.setUniform(key, value, false);
    }
};

HX.HMT.prototype._loadTextures = function(data, material)
{
    var files = [];

    for (var key in data.textures) {
        if (data.textures.hasOwnProperty(key))
            files.push(this._correctURL(data.textures[key]));
    }

    var bulkLoader = new HX.BulkAssetLoader();
    var self = this;
    bulkLoader.onComplete = function()
    {
        for (var key in data.textures) {
            if (data.textures.hasOwnProperty(key)) {
                material.setTexture(key, bulkLoader.getAsset(self._correctURL(data.textures[key])));
            }
        }
        self._notifyComplete(material);
    };
    bulkLoader.onFail = function(message)
    {
        self._notifyFailure(message);
    };

    bulkLoader.load(files, HX.JPG);
};


HX.HMT._PROPERTY_MAP = null;

HX.HMT._initPropertyMap = function() {
    HX.HMT._PROPERTY_MAP = HX.HMT._PROPERTY_MAP || {
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
        reverseSubtract: HX.BlendOperation.REVERSE_SUBTRACT,

        // transparency modes
        additive: HX.TransparencyMode.ADDITIVE,
        alpha: HX.TransparencyMode.ALPHA,
        opaque: HX.TransparencyMode.OPAQUE
    };
};