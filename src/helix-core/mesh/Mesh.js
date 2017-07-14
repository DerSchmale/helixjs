import {capabilities, BufferUsage} from "../Helix";
import {IndexBuffer} from "../core/IndexBuffer";
import {VertexBuffer} from "../core/VertexBuffer";

/**
 * @ignore
 */
var Mesh_ID_COUNTER = 0;

/**
 * @classdesc
 *
 * <p>Mesh contains the actual geometry of a renderable object. A {@linkcode Model} can contain several Mesh objects. The
 * {@linkcode Model} is used by {@linkcode ModelInstance}, which links materials to the meshes, and provides them a
 * place in the scene graph.</p>
 *
 * <p>A Mesh can have vertex attributes spread out over several "streams". Every stream means a separate vertex buffer will be used.</p>
 *
 * <p>A Mesh should have its layout defined using addVertexAttribute, and initial data supplied using setVertexData,
 * before passing it on to a Model. These values will be used to calculate its local bounding box.
 * After this, setVertexData can be called to change data, but it will not change the model</p>
 *
 * @param vertexUsage One of {@linkcode} BufferUsage
 * @param indexUsage One of {@linkcode} BufferUsage
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
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

/**
 * The vertex stride for meshes created with {@linkcode Mesh.createDefaultEmpty}
 */
Mesh.DEFAULT_VERTEX_SIZE = 12;

/**
 * @ignore
 */
Mesh.ID_COUNTER = 0;

// other possible indices:
// hx_instanceID (used by MeshBatch)
// hx_jointIndices (4)
// hx_jointWeights (4)
/**
 * Creates an empty Mesh with a default layout.
 */
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
    /**
     * Whether or not this Mesh supports morph target animations. This is the case if {@linkcode Mesh.generateMorphData}
     * was called.
     */
    get hasMorphData()
    {
        return !!this._defaultMorphTarget;
    },

    /**
     * Returns whether or not vertex data was uploaded to the given stream index.
     */
    hasVertexData: function (streamIndex)
    {
        return !!this._vertexData[streamIndex];
    },

    /**
     * Gets the vertex data for a given stream.
     */
    getVertexData: function (streamIndex)
    {
        return this._vertexData[streamIndex];
    },

    /**
     * Uploads vertex data from an Array or a Float32Array. This method must be called after the layout for the stream
     * has been finalized using setVertexAttribute calls. The data in the stream should be an interleaved array of
     * floats, with each attribute data in the order specified with the setVertexAttribute calls.
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
     * Uploads index data from an Array or a Uint16Array
     */
    setIndexData: function (data)
    {
        this._indexData = data instanceof Uint16Array? data : new Uint16Array(data);
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

    /**
     * The amount of streams (vertex buffers) used for this Mesh/
     */
    get numStreams()
    {
        return this._numStreams;
    },

    /**
     * Extracts the vertex attribute data for the given attribute name as a flat Array.
     */
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

    /**
     * Generates the required data to support morph target animations.
     */
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

    /**
     * The amount of vertices contained in the Mesh.
     */
    get numVertices()
    {
        return this._numVertices;
    },

    /**
     * The amount of face indices contained in the Mesh.
     */
    get numIndices()
    {
        return this._numIndices;
    },

    /**
     * The amount of vertex attributes contained in the Mesh.
     */
    get numVertexAttributes()
    {
        return this._vertexAttributes.length;
    },

    /**
     * Gets the vertex stride (number of components used per stream per vertex) for a given stream
     */
    getVertexStride: function(streamIndex)
    {
        return this._vertexStrides[streamIndex];
    },

    /**
     * Gets the vertex attribute data according to the attribute name.
     */
    getVertexAttributeByName: function (name)
    {
        return this._vertexAttributesLookUp[name];
    },

    /**
     * Gets the vertex attribute data according to the index.
     */
    getVertexAttributeByIndex: function (index)
    {
        return this._vertexAttributes[index];
    }
};

export { Mesh };