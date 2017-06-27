/**
 *
 * @param meshData
 * @param model
 * @constructor
 */
HX.Mesh = function (meshData, model)
{
    this._model = model;
    this._vertexBuffers = [];
    this._vertexStrides = [];
    this._vertexAttributes = null;
    this._morphAttributes = null;
    this._indexBuffer = new HX.IndexBuffer();
    this._defaultMorphTarget = null;

    this._renderOrderHint = ++HX.Mesh.ID_COUNTER;

    this.updateMeshData(meshData);
};

HX.Mesh.ID_COUNTER = 0;

HX.Mesh.prototype = {
    constructor: HX.Mesh,

    get hasMorphData()
    {
        return !!this._morphAttributes;
    },

    updateMeshData: function(meshData)
    {
        var numStreams = meshData.numStreams;
        var numVertexBuffers = this._vertexBuffers.length;

        if (numStreams > numVertexBuffers) {
            for (var i = numVertexBuffers; i < numStreams; ++i) {
                if (meshData.hasVertexData(i))
                    this._vertexBuffers[i] = new HX.VertexBuffer();
            }
        }
        else if (numStreams < numVertexBuffers) {
            this._vertexBuffers.length = numStreams;
            this._vertexStrides.length = numStreams;
        }

        for (i = 0; i < numStreams; ++i) {
            if (meshData.hasVertexData(i))
                this._vertexBuffers[i].uploadData(meshData.getVertexData(i), meshData.vertexUsage);

            this._vertexStrides[i] = meshData.getVertexStride(i);
        }

        this._numIndices = meshData._indexData.length;
        this._numVertices = meshData.numVertices;

        this._indexBuffer.uploadData(meshData._indexData, meshData.indexUsage);
        this._vertexAttributes = meshData._vertexAttributes;
        this._morphAttributes = meshData._morphAttributes;

        if (this._morphAttributes) {
            this._defaultMorphTarget = new HX.VertexBuffer();
            this._defaultMorphTarget.uploadData(meshData._defaultMorphTarget);
        }
    },

    dispose: function ()
    {
        for (var i = 0; i < this._vertexBuffers.length; ++i)
            this._vertexBuffers[i].dispose();
        this._indexBuffer.dispose();
    },

    get numVertices()
    {
        return this._numVertices;
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