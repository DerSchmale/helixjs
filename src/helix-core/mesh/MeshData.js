/**
 * MeshData contains the cpu-side definition data for a Mesh.
 * @constructor
 */
HX.MeshData = function ()
{
    this._vertexStrides = [];
    this._vertexData = [];
    this._indexData = undefined;
    this.vertexUsage = HX_GL.STATIC_DRAW;
    this.indexUsage = HX_GL.STATIC_DRAW;
    this._vertexAttributes = [];
    this._numStreams = 0;
    this._hasMorphIndices = false;
    this._morphBufferWidth = 0;
    this._morphBufferHeight = 0;
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

    get hasMorphIndices()
    {
        return this._hasMorphIndices;
    },

    getVertexData: function (streamIndex)
    {
        return this._vertexData[streamIndex];
    },

    /**
     * Sets data from Array
     */
    setVertexData: function (data, streamIndex)
    {
        this._vertexData[streamIndex || 0] = new Float32Array(data);
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
        if (name === "hx_morphIndices") this._hasMorphIndices = true;

        streamIndex = streamIndex || 0;
        this._numStreams = Math.max(this._numStreams, streamIndex + 1);
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
    },

    get morphBufferWidth()
    {
        return this._morphBufferWidth;
    },

    get morphBufferHeight()
    {
        return this._morphBufferHeight;
    },

    generateMorphIndices: function()
    {
        var num = this.numVertices;
        var w = this._morphBufferWidth = Math.ceil(Math.sqrt(num));
        var h = this._morphBufferHeight = Math.ceil(num / this._morphBufferWidth);
        var stream = this.numStreams;
        this.addVertexAttribute("hx_morphIndex", 2, stream);

        var data = [];
        for (var i = 0; i < num; ++i) {
            var u = (i % w) / w;
            var v = Math.floor(i / w) / h;
            data.push(u, v);
        }

        this.setVertexData(data, stream);
    }
};
