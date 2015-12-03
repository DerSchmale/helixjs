/**
 *
 * @constructor
 */
HX.MeshData = function ()
{
    this._vertexStride = 0;
    this._vertexData = undefined;
    this._indexData = undefined;
    this.vertexUsage = HX.GL.STATIC_DRAW;
    this.indexUsage = HX.GL.STATIC_DRAW;
    this._vertexAttributes = [];
};

HX.MeshData.DEFAULT_VERTEX_SIZE = 12;
HX.MeshData.DEFAULT_BATCHED_VERTEX_SIZE = 13;

HX.MeshData.createDefaultEmpty = function()
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 3);
    data.addVertexAttribute('hx_normal', 3);
    data.addVertexAttribute('hx_tangent', 4);
    data.addVertexAttribute('hx_texCoord', 2);
    return data;
};

HX.MeshData.createDefaultBatchEmpty = function()
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 3);
    data.addVertexAttribute('hx_normal', 3);
    data.addVertexAttribute('hx_tangent', 4);
    data.addVertexAttribute('hx_texCoord', 2);
    data.addVertexAttribute('hx_instanceID', 1);
    return data;
};


HX.MeshData.prototype = {
    constructor: HX.MeshData,

    /**
     * Sets data from Array
     */
    setVertexData: function (data)
    {
        this._vertexData = new Float32Array(data);
    },

    /**
     * Sets data from Array
     */
    setIndexData: function (data)
    {
        this._indexData = new Uint16Array(data);
    },

    /**
     * Adds a named vertex attribute. All properties are given manually to make it easier to support multiple streams in the future.
     * @param name The name of the attribute, matching the attribute name used in the vertex shaders.
     * @param numComponents The amount of components used by the attribute value.
     */
    addVertexAttribute: function (name, numComponents)
    {
        var offset = this._vertexStride;
        this._vertexStride += numComponents;
        this._vertexAttributes.push({name: name, offset: offset, numComponents: numComponents});
    },

    getVertexAttribute: function(name)
    {
        var len = this._vertexAttributes.length;
        for (var i = 0; i < len; ++i) {
            if (this._vertexAttributes[i].name === name)
                return this._vertexAttributes[i];
        }
    },

    /**
     * Returns the stride of each vertex. This matches the total amount of elements used by all vertex attributes combined.
     */
    getVertexStride: function()
    {
        return this._vertexStride;
    }
};

/**
 *
 * @param meshData
 * @constructor
 */
HX.Mesh = function (meshData)
{
    this._vertexBuffer = new HX.VertexBuffer();
    this._indexBuffer = new HX.IndexBuffer();

    this._vertexBuffer.uploadData(meshData._vertexData, meshData.vertexUsage);
    this._indexBuffer.uploadData(meshData._indexData, meshData.indexUsage);

    this._numIndices = meshData._indexData.length;

    this._vertexStride = meshData.getVertexStride();

    this._vertexAttributes = meshData._vertexAttributes;
    this._renderOrderHint = ++HX.Mesh.ID_COUNTER;
};

HX.Mesh.ID_COUNTER = 0;


HX.Mesh.prototype = {
    constructor: HX.Mesh,

    dispose: function ()
    {
        this._vertexBuffer.dispose();
        this._indexBuffer.dispose();
    },

    numIndices: function ()
    {
        return this._numIndices;
    },

    numVertexAttributes: function ()
    {
        return this._vertexAttributes.length;
    },

    getVertexStride: function ()
    {
        return this._vertexStride;
    },

    getVertexAttribute: function (index)
    {
        return this._vertexAttributes[index];
    }
};

/**
 *
 * @constructor
 */
HX.ModelData = function ()
{
    this._meshDataList = [];
};

HX.ModelData.prototype = {
    constructor: HX.ModelData,

    get numMeshes()
    {
        return this._meshDataList.length;
    },
    getMeshData: function (index)
    {
        return this._meshDataList[index];
    },
    addMeshData: function (meshData)
    {
        this._meshDataList.push(meshData);
    }
};

/**
 *
 * @param modelData
 * @constructor
 */
HX.Model = function (modelData)
{
    this._localBounds = new HX.BoundingAABB();
    this.onChange = new HX.Signal();

    if (modelData) {
        this._meshes = null;
        this._setModelData(modelData);
    }
    else
        this._meshes = [];
};

HX.Model.prototype = {
    constructor: HX.Model,

    get numMeshes()
    {
        return this._meshes.length;
    },

    getMesh: function (index)
    {
        return this._meshes[index];
    },

    dispose: function()
    {
        if (this._meshes)
            for (var i = 0; i < this._meshes.length; ++i)
                this._meshes[i].dispose();
    },

    get localBounds()
    {
        return this._localBounds;
    },

    _setModelData: function (modelData)
    {
        this.dispose();

        this._localBounds.clear();
        this._meshes = [];

        for (var i = 0; i < modelData.numMeshes; ++i) {
            var meshData = modelData.getMeshData(i);
            this._localBounds.growToIncludeMesh(meshData);
            this._meshes.push(new HX.Mesh(meshData));
        }

        this.onChange.dispatch();
    }
};