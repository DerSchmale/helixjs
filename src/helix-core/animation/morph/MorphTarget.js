import {VertexBuffer} from "../../core/VertexBuffer";

/**
 * @classdesc
 * MorphTarget defines the displacements per vertex that can be used to displace a Mesh. This can be used to animate
 * vertices between different poses. Several MorphTargets can be used in a {@linkcode MorphPose} or through a component
 * such as {@linkcode MorphAnimation}
 * A MorphTarget describes the offsets for a whole {@linkcode Model}, so several sets might be present (one for each {@linkcode Mesh}).
 *
 * @constructor
 *
 * @see {@linkcode MorphAnimation}
 * @see {@linkcode MorphPose}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MorphTarget()
{
    // So basically, every morph pose is a list of vertex buffers, one for each Mesh in the Model
    // the Mesh objects will have their hx_morphPositionN overwritten depending on their weights
    this.name = null;
    this._vertexBuffers = [];
    this._numVertices = [];
}

MorphTarget.prototype =
{
    /**
     * @ignore
     */
    getNumVertices: function(meshIndex)
    {
        return this._numVertices[meshIndex];
    },

    /**
     * @ignore
     */
    getVertexBuffer: function(meshIndex)
    {
        return this._vertexBuffers[meshIndex];
    },

    /**
     * Initializes the current MorphTarget object.
     * @param {Array} positions An Array of 3 floats per vertex (x, y, z), containing the displacement vectors. The size must match the vertex count of the target Mesh.
     * @param {number} meshIndex The meshIndex for which to assign the vertices.
     */
    init: function(positions, meshIndex)
    {
        this._numVertices[meshIndex] = positions.length / 3;

        this._vertexBuffers[meshIndex] = new VertexBuffer();
        this._vertexBuffers[meshIndex].uploadData(new Float32Array(positions));
    }
};

export { MorphTarget };