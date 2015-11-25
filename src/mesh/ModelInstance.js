/**
 *
 * @param mesh
 * @param pass
 * @constructor
 */
HX.VertexLayout = function(mesh, pass)
{
    var shader = pass.getShader();
    this.attributes = [];

    this._numAttributes = -1;

    var stride = mesh.getVertexStride();
    for (var i = 0; i < mesh.numVertexAttributes(); ++i) {
        var attribute = mesh.getVertexAttribute(i);
        var index = shader.getVertexAttributeIndex(attribute.name);

        this._numAttributes = Math.max(this._numAttributes, index);

        // convert offset and stride to bytes
        if (index >= 0)
            this.attributes.push({index: index, offset: attribute.offset * 4, numComponents: attribute.numComponents, stride: stride * 4});

    }

    ++this._numAttributes;
};

HX.VertexLayout.prototype = {
    constructor: HX.VertexLayout
};

/**
 *
 * @param mesh
 * @param material
 * @constructor
 */
HX.MeshInstance = function(mesh, material)
{
    this._mesh = mesh;
    this._meshMaterialLinkInvalid = false;

    this.material = material;
};

HX.MeshInstance.prototype = {
    constructor: HX.MeshInstance,

    get material()
    {
        return this._material;
    },

    set material(value)
    {
        if (this._material)
            this._material.onChange.unbind(this._onMaterialChange);

        this._material = value;

        // TODO: May want to set a default "purple" material when nothing is provided?
        if (this._material)
            this._material.onChange.bind(this, this._onMaterialChange);

        this._linkMeshWithMaterial();
    },

    /**
     * Sets state for this mesh/material combination.
     * @param passType
     */
    updateRenderState: function(passType)
    {
        if (this._meshMaterialLinkInvalid)
            this._linkMeshWithMaterial();

        this._mesh._vertexBuffer.bind();
        this._mesh._indexBuffer.bind();

        var layout = this._vertexLayouts[passType];
        var attributes = layout.attributes;
        var len = attributes.length;

        for (var i = 0; i < len; ++i) {
            var attribute = attributes[i];
            HX.GL.vertexAttribPointer(attribute.index, attribute.numComponents, HX.GL.FLOAT, false, attribute.stride, attribute.offset);
        }

        HX.enableAttributes(layout._numAttributes);
    },

    _initVertexLayouts: function()
    {
        this._vertexLayouts = new Array(HX.MaterialPass.NUM_PASS_TYPES);
        for (var type = 0; type < HX.MaterialPass.NUM_PASS_TYPES; ++type) {
            var pass = this._material.getPass(type);
            if (pass)
                this._vertexLayouts[type] = new HX.VertexLayout(this._mesh, pass);
        }
    },

    _linkMeshWithMaterial: function()
    {
        this._initVertexLayouts();

        this._meshMaterialLinkInvalid = false;
    },

    _onMaterialChange: function()
    {
        this._meshMaterialLinkInvalid = true;
    }
};

/**
 * Creates a new ModelInstance object. ModelInstances are a given combination of a Model and a set of Materials
 * (up to 1 per Mesh). They can be reused and attached to several SceneNode objects.
 * @param model
 * @param materials
 * @constructor
 */
HX.ModelInstance = function(model, materials)
{
    this._model = model;
    this._meshInstances = [];
    this._castShadows = true;
    this.onChange = new HX.Signal();
    this._model.onChange.bind(this, this._onModelChange);

    this._materials = materials instanceof Array? materials : [ materials ];

    this._onModelChange();
};

HX.ModelInstance.prototype = {
    constructor: HX.ModelInstance,

    getModel: function() { return this._model; },

    get castShadows() { return this._castShadows; },
    set castShadows(value) { this._castShadows = value; },

    numMeshInstances: function() { return this._meshInstances.length; },
    getMeshInstance: function(index) { return this._meshInstances[index]; },

    getLocalBounds: function() { return this._model.getLocalBounds(); },

    _addMeshInstance: function(mesh, material)
    {
        this._meshInstances.push(new HX.MeshInstance(mesh, material));
    },

    _onModelChange: function()
    {
        var maxIndex = this._materials.length - 1;
        for (var i = 0; i < this._model.numMeshes(); ++i) {
            this._addMeshInstance(this._model.getMesh(i), this._materials[Math.min(i, maxIndex)]);
        }

        this.onChange.dispatch();
    }
};