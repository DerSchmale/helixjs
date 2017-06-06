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
    this._indexBuffer = new HX.IndexBuffer();
    this._hasMorphData = false;
    this._baseMorphTexture = null;

    this._renderOrderHint = ++HX.Mesh.ID_COUNTER;

    this.updateMeshData(meshData);
};

HX.Mesh.ID_COUNTER = 0;


HX.Mesh.prototype = {
    constructor: HX.Mesh,

    get hasMorphData()
    {
        return this._hasMorphData;
    },

    updateMeshData: function(meshData)
    {
        var numStreams = meshData.numStreams;
        var numVertexBuffers = this._vertexBuffers.length;

        if (numStreams > numVertexBuffers) {
            for (var i = numVertexBuffers; i < numStreams; ++i) {
                this._vertexBuffers[i] = new HX.VertexBuffer();
            }
        }
        else if (numStreams < numVertexBuffers) {
            this._vertexBuffers.length = numStreams;
            this._vertexStrides.length = numStreams;
        }

        for (var i = 0; i < numStreams; ++i) {
            this._vertexBuffers[i].uploadData(meshData.getVertexData(i), meshData.vertexUsage);
            this._vertexStrides[i] = meshData.getVertexStride(i);
        }

        this._numIndices = meshData._indexData.length;

        this._indexBuffer.uploadData(meshData._indexData, meshData.indexUsage);
        this._vertexAttributes = meshData._vertexAttributes;
        this._hasMorphData = meshData.hasMorphIndices;
        if (this._hasMorphData)
            this._initBaseMorphTexture(meshData);
    },

    _initBaseMorphTexture: function(meshData)
    {
        var w = meshData.morphBufferWidth;
        var h = meshData.morphBufferHeight;
        var posData = meshData.getVertexAttribute("hx_position");
        var stride = meshData.getVertexStride(posData.streamIndex);
        var data = meshData.getVertexData(posData.streamIndex);
        var tex = [];

        var t = 0;
        for (var i = posData.offset; i < data.length; i += stride) {
            tex[t++] = posData[i];
            tex[t++] = posData[i + 1];
            tex[t++] = posData[i + 2];
            tex[t++] = 1.0;
        }

        // fill up texture
        var len = w * h * 4;
        while (t < len) {
            tex[t++] = 0.0;
            tex[t++] = 0.0;
            tex[t++] = 0.0;
            tex[t++] = 1.0;
        }


        this._baseMorphTexture = new HX.Texture2D();
        this._baseMorphTexture.filter = HX.TextureFilter.NEAREST_NOMIP;
        this._baseMorphTexture.uploadData(new Float32Array(data), w, h, false, HX_GL.RGBA, HX_GL.FLOAT);
    },

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