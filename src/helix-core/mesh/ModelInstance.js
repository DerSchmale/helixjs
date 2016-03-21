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

    for (var i = 0; i < mesh.numVertexAttributes; ++i) {
        var attribute = mesh.getVertexAttribute(i);
        var index = shader.getAttributeLocation(attribute.name);

        this._numAttributes = Math.max(this._numAttributes, index + 1);

        // convert offset and stride to bytes
        if (index >= 0) {
            var stride = mesh.getVertexStride(attribute.streamIndex);
            // convert to bytes
            this.attributes.push({
                index: index,
                offset: attribute.offset * 4,
                numComponents: attribute.numComponents,
                stride: stride * 4,
                streamIndex: attribute.streamIndex
            });
        }

    }
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
    this._vertexLayouts = null;

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
        if (this._material) {
            this._material.onChange.bind(this._onMaterialChange, this);

            this.material._setUseSkinning(this._material._useSkinning || !!this._mesh._model.skeleton);
        }

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


        var vertexBuffers = this._mesh._vertexBuffers;
        this._mesh._indexBuffer.bind();

        var layout = this._vertexLayouts[passType];
        var attributes = layout.attributes;
        var len = attributes.length;

        for (var i = 0; i < len; ++i) {
            var attribute = attributes[i];
            vertexBuffers[attribute.streamIndex].bind();
            HX_GL.vertexAttribPointer(attribute.index, attribute.numComponents, HX_GL.FLOAT, false, attribute.stride, attribute.offset);
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
 * Creates a new ModelComponent object. ModelInstances are a given combination of a Model and a set of Materials
 * (up to 1 per Mesh). They can be reused and attached to several SceneNode objects.
 * @param model
 * @param materials Either a single material or an array of materials for each mesh in model.
 * @constructor
 */
HX.ModelInstance = function(model, materials)
{
    HX.Entity.call(this);
    this._meshBounds = new HX.BoundingAABB();
    this._model = null;
    this._meshInstances = [];
    this._castShadows = true;
    this._skeletonPose = null;

    this.init(model, materials);
};

HX.ModelInstance.prototype = Object.create(HX.Entity.prototype, {
    model:
    {
        get: function() { return this._model; }
    },

    castShadows: {
        get: function()
        {
            return this._castShadows;
        },

        set: function(value)
        {
            this._castShadows = value;
        }
    },

    numMeshInstances: {
        get: function ()
        {
            return this._meshInstances.length;
        }
    },

    skeleton: {
        get: function() {
            return this._model.skeleton;
        }
    },

    skeletonMatrices: {
        get: function() {
            return this._skeletonPose;
        },
        set: function(value) {
            this._skeletonPose = value;
        }
    }
});

/**
 * Used if we choose to deferedly initialize the model
 * @param model
 * @param materials
 */
HX.ModelInstance.prototype.init = function(model, materials)
{
    if (this._model || this._materials)
        throw new Error("ModelInstance already initialized");

    this._model = model;

    if (materials)
        this._materials = materials instanceof Array? materials : [ materials ];

    if (model) {
        if (model.skeleton) {
            this._skeletonPose = [];
            for (var i = 0; i < model.skeleton.numJoints; ++i) {
                this._skeletonPose[i] = new HX.Matrix4x4();
            }
        }
        model.onChange.bind(this._onModelChange, this);
        this._onModelChange();
    }

    this._invalidateWorldBounds();
};

HX.ModelInstance.prototype.getMeshInstance = function(index)
{
    return this._meshInstances[index];
};


HX.ModelInstance.prototype._addMeshInstance = function(mesh, material)
{
    this._meshInstances.push(new HX.MeshInstance(mesh, material));
};

HX.ModelInstance.prototype._onModelChange = function()
{
    var maxIndex = this._materials.length - 1;
    for (var i = 0; i < this._model.numMeshes; ++i) {
        this._addMeshInstance(this._model.getMesh(i), this._materials[Math.min(i, maxIndex)]);
    }

    this._invalidateWorldBounds();
};

// override for better matches
HX.ModelInstance.prototype._updateWorldBounds = function()
{
    this._meshBounds.transformFrom(this._model.localBounds, this.worldMatrix);
    this._worldBounds.growToIncludeBound(this._meshBounds);
    HX.Entity.prototype._updateWorldBounds.call(this);
};

HX.ModelInstance.prototype.acceptVisitor = function(visitor)
{
    visitor.visitModelInstance(this, this.worldMatrix, this.worldBounds);
    HX.Entity.prototype.acceptVisitor.call(this, visitor);
};

HX.ModelInstance.prototype.toString = function()
{
    return "[ModelInstance(name=" + this._name + ")]";
};