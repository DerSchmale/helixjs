/**
 *
 * @param meshData
 * @param model
 * @constructor
 */
import {IndexBuffer} from "../core/IndexBuffer";
import {VertexBuffer} from "../core/VertexBuffer";

var Mesh_ID_COUNTER = 0;

function Mesh(meshData, model)
{
    this._model = model;
    this._vertexBuffers = [];
    this._vertexStrides = [];
    this._vertexAttributes = null;
    this._morphAttributes = null;
    this._indexBuffer = new IndexBuffer();
    this._defaultMorphTarget = null;

    this._renderOrderHint = ++Mesh_ID_COUNTER;

    this.updateMeshData(meshData);
}

Mesh.ID_COUNTER = 0;

Mesh.prototype = {
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
                    this._vertexBuffers[i] = new VertexBuffer();
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
            this._defaultMorphTarget = new VertexBuffer();
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

export { Mesh };