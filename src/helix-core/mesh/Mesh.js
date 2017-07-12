/**
 *
 * @param meshData
 * @param model
 * @constructor
 */
import {capabilities, BufferUsage} from "../Helix";
import {IndexBuffer} from "../core/IndexBuffer";
import {VertexBuffer} from "../core/VertexBuffer";

var Mesh_ID_COUNTER = 0;

/**
 * A Mesh should have its layout defined using addVertexAttribute, and initial data supplied using setVertexData,
 * before passing it on to a Model. These values will be used to calculate its local bounding box.
 * After this, setVertexData can be called to change data, but it will not change the model
 * @param vertexUsage
 * @param indexUsage
 * @constructor
 */
function Mesh(vertexUsage, indexUsage)
{
    this._model = null;
    this._vertexBuffers = [];
    this._vertexStrides = [];
    this._vertexData = [];
    this._indexData = undefined;
    this._vertexUsage = vertexUsage || BufferUsage.STATIC_DRAW;
    this._indexUsage = indexUsage || BufferUsage.STATIC_DRAW;
    this._numStreams = 0;
    this._numVertices = 0;

    this._vertexAttributes = [];
    this._vertexAttributesLookUp = {};
    this._indexBuffer = new IndexBuffer();
    this._defaultMorphTarget = null;

    this._renderOrderHint = ++Mesh_ID_COUNTER;
}

Mesh.DEFAULT_VERTEX_SIZE = 12;

Mesh.ID_COUNTER = 0;

// other possible indices:
// hx_instanceID (used by MeshBatch)
// hx_boneIndices (4)
// hx_boneWeights (4)
Mesh.createDefaultEmpty = function()
{
    var data = new Mesh();
    data.addVertexAttribute('hx_position', 3);
    data.addVertexAttribute('hx_normal', 3);
    data.addVertexAttribute('hx_tangent', 4);
    data.addVertexAttribute('hx_texCoord', 2);
    return data;
};


Mesh.prototype = {
    get hasMorphData()
    {
        return !!this._defaultMorphTarget;
    },

    // this should only be null for morph targets!
    hasVertexData: function (streamIndex)
    {
        return !!this._vertexData[streamIndex];
    },

    getVertexData: function (streamIndex)
    {
        return this._vertexData[streamIndex];
    },

    /**
     * Sets data from Array. Must call this after addVertexAttribute defines where the data goes in the array.
     */
    setVertexData: function (data, streamIndex)
    {
        streamIndex = streamIndex || 0;

        this._vertexData[streamIndex] = data instanceof Float32Array? data : new Float32Array(data);
        this._vertexBuffers[streamIndex] = this._vertexBuffers[streamIndex] || new VertexBuffer();
        this._vertexBuffers[streamIndex].uploadData(this._vertexData[streamIndex], this._vertexUsage);

        if (streamIndex === 0)
            this._numVertices = data.length / this._vertexStrides[0];
    },

    /**
     * Sets data from Array
     */
    setIndexData: function (data)
    {
        this._indexData = new Uint16Array(data);
        this._numIndices = this._indexData.length;
        this._indexBuffer.uploadData(this._indexData, this._indexUsage);
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
        this._numStreams = Math.max(this._numStreams, streamIndex + 1);
        var offset = this._vertexStrides[streamIndex] || 0;
        var attrib = {
            name: name,
            offset: offset,
            numComponents: numComponents,
            streamIndex: streamIndex
        };
        this._vertexAttributes.push(attrib);
        this._vertexAttributesLookUp[name] = attrib;

        this._vertexStrides[streamIndex] = offset + numComponents;
    },

    get numStreams()
    {
        return this._numStreams;
    },

    extractAttributeData: function(name)
    {
        var attrib = this.getVertexAttributeByName(name);
        var stride = this.getVertexStride(attrib);
        var data = this.getVertexData(attrib.streamIndex);
        var numComps = attrib.numComponents;
        var vertData = [];
        var t = 0;
        for (var i = attrib.offset; i < data.length; i += stride) {
            for (var j = 0; j < numComps; ++j) {
                vertData[t++] = data[i + j];
            }
        }
        return vertData;
    },

    generateMorphData: function()
    {
        for (i = 0; i < capabilities.NUM_MORPH_TARGETS; ++i) {
            // these will never have data assigned to them!
            // append these each as a different stream
            this.addVertexAttribute("hx_morphPosition" + i, 3, this._numStreams);
        }

        var data = [];

        for (var i = 0; i < this._numVertices; ++i) {
            data.push(0, 0, 0);
        }

        this._defaultMorphTarget = new VertexBuffer();
        this._defaultMorphTarget.uploadData(new Float32Array(data), BufferUsage.STATIC_DRAW);
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

    getVertexAttributeByName: function (name)
    {
        return this._vertexAttributesLookUp[name];
    },

    getVertexAttributeByIndex: function (index)
    {
        return this._vertexAttributes[index];
    }
};

export { Mesh };