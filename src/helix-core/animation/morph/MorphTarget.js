import {VertexBuffer} from "../../core/VertexBuffer";

function MorphTarget()
{
    // So basically, every morph pose is a list of vertex buffers, one for each Mesh in the Model
    // the Mesh objects will have their hx_morphPositionN overwritten depending on their weights
    this.name = null;
    this._vertexBuffers = [];
    this._numVertices = [];
};

MorphTarget.prototype =
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

        this._vertexBuffers[meshIndex] = new VertexBuffer();
        this._vertexBuffers[meshIndex].uploadData(new Float32Array(positions));
    }
};

export { MorphTarget };