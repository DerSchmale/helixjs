/**
 *
 * @constructor
 */
HX.MeshData = function ()
{
    this._vertexStrides = [];
    this._vertexData = [];
    this._indexData = undefined;
    this.vertexUsage = HX.GL.STATIC_DRAW;
    this.indexUsage = HX.GL.STATIC_DRAW;
    this._vertexAttributes = [];
    this._numStreams = 0;
};

HX.MeshData.DEFAULT_VERTEX_SIZE = 12;

// other possible indices:
// hx_instanceID (used by MeshBatch)
// hx_boneIndices (4)
// hx_boneWeights (4)
HX.MeshData.createDefaultEmpty = function()
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 3);
    data.addVertexAttribute('hx_normal', 3);
    data.addVertexAttribute('hx_tangent', 4);
    data.addVertexAttribute('hx_texCoord', 2);
    return data;
};

HX.MeshData.prototype = {
    constructor: HX.MeshData,

    getVertexData: function (streamIndex)
    {
        return this._vertexData[streamIndex];
    },

    /**
     * Sets data from Array
     */
    setVertexData: function (data, streamIndex)
    {
        this._vertexData[streamIndex] = new Float32Array(data);
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
     * @param streamIndex [Optional] The stream index indicating which vertex buffer is used, defaults to 0
     */
    addVertexAttribute: function (name, numComponents, streamIndex)
    {
        streamIndex = streamIndex || 0;
        this._numStreams = Math.max(this._numStreams, streamIndex);
        this._vertexStrides[streamIndex] = this._vertexStrides[streamIndex] || 0;
        this._vertexAttributes.push({
            name: name,
            offset: this._vertexStrides[streamIndex],
            numComponents: numComponents,
            streamIndex: streamIndex
        });
        this._vertexStrides[streamIndex] += numComponents;
    },

    getVertexAttribute: function (name)
    {
        var len = this._vertexAttributes.length;
        for (var i = 0; i < len; ++i) {
            if (this._vertexAttributes[i].name === name)
                return this._vertexAttributes[i];
        }
    },

    /**
     * Returns the stride of each vertex for the given stream index. This matches the total amount of elements used by all vertex attributes combined.
     */
    getVertexStride: function (streamIndex)
    {
        return this._vertexStrides[streamIndex];
    },

    get numStreams()
    {
        return this._numStreams;
    },

    get numVertices()
    {
        return this._vertexData[0].length / this._vertexStrides[0];
    }
};

/**
 *
 * @param meshData
 * @constructor
 */
HX.Mesh = function (meshData, model)
{
    this._model = model;
    this._vertexBuffers = [];
    this._vertexStrides = [];
    this._indexBuffer = new HX.IndexBuffer();

    for (var i = 0; i < meshData._vertexData.length; ++i) {
        var buffer = new HX.VertexBuffer();
        buffer.uploadData(meshData._vertexData[i], meshData.vertexUsage);
        this._vertexBuffers[i] = buffer;
        this._vertexStrides[i] = meshData.getVertexStride(i);
    }
    this._indexBuffer.uploadData(meshData._indexData, meshData.indexUsage);

    this._numIndices = meshData._indexData.length;

    this._vertexAttributes = meshData._vertexAttributes;
    this._renderOrderHint = ++HX.Mesh.ID_COUNTER;
};

HX.Mesh.ID_COUNTER = 0;


HX.Mesh.prototype = {
    constructor: HX.Mesh,

    dispose: function ()
    {
        for (var i = 0; i < this._vertexBuffers.length; ++i)
            this._vertexBuffers[i].dispose();
        this._indexBuffer.dispose();
    },

    get numIndices()
    {
        return this._numIndices;
    },

    get numVertexAttributes()
    {
        return this._vertexAttributes.length;
    },

    getVertexStride: function(streamIndex)
    {
        return this._vertexStrides[streamIndex];
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
    this._joints = [];
    this.skeleton = null;
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
    },

    addJoint: function(joint)
    {
        this._joints.push(joint);
    },

    get hasSkeleton()
    {
        return this._joints.length > 0;
    }
};

/**
 *
 * @param modelData
 * @constructor
 */
HX.Model = function (modelData)
{
    this._name = null;
    this._localBounds = new HX.BoundingAABB();
    this._skeleton = null;
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

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

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


    get skeleton()
    {
        return this._skeleton;
    },

    set skeleton(value)
    {
        this._skeleton = value;
    },

    _setModelData: function (modelData)
    {
        this.dispose();

        this._localBounds.clear();
        this._meshes = [];

        for (var i = 0; i < modelData.numMeshes; ++i) {
            var meshData = modelData.getMeshData(i);
            this._localBounds.growToIncludeMesh(meshData);
            this._meshes.push(new HX.Mesh(meshData, this));
        }

        this.skeleton = modelData.skeleton;

        this.onChange.dispatch();
    },

    toString: function()
    {
        return "[Model(name=" + this._name + ")]";
    }
};