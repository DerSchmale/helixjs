HX.MorphData = function()
{
    this.positions = [];
    // TODO:
    // this.normals = null;
};

HX.MorphTarget = function()
{
    // So basically, every morph pose is a list of vertex buffers, one for each Mesh in the Model
    // the Mesh objects will have their hx_morphPositionN overwritten depending on their weights
    this.name = null;
    this._vertexBuffers = [];
    this._numVertices = [];
};

HX.MorphTarget.prototype =
{
    get numVertices()
    {
        return this._numVertices;
    },

    getNumVertices: function(meshIndex)
    {
        return this._numVertices[meshIndex];
    },

    getVertexBuffer: function(meshIndex)
    {
        return this._vertexBuffers[meshIndex];
    },

    /**
     * @param positions An Array of 3 floats per vertex
     */
    initFromMorphData: function(data, meshIndex)
    {
        var positions = data.positions;
        this._numVertices[meshIndex] = positions.length / 3;

        this._vertexBuffers[meshIndex] = new HX.VertexBuffer();
        this._vertexBuffers[meshIndex].uploadData(new Float32Array(positions));
    }
};