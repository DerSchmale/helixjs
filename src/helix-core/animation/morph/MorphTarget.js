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
    this.name = null;
    this._positionBuffer = null;
    this._normalBuffer = null;
    this._numVertices = 0;
}

MorphTarget.prototype =
{
    /**
     * Indicates whether or not vertex normals are provided in the morph target initialisation.
     * @returns {boolean|*}
     */
    get hasNormals()
    {
        return !!this._normalBuffer;
    },

    /**
     * @ignore
     */
    get numVertices()
    {
        return this._numVertices;
    },

    /**
     * @ignore
     */
    get positionBuffer()
    {
        return this._positionBuffer;
    },

    /**
     * @ignore
     */
    get normalBuffer()
    {
        return this._normalBuffer;
    },

	/**
	 * Initializes the current MorphTarget's position data
     */
    setPositionData: function(positions)
    {
		this._numVertices = positions.length / 3;

		this._positionBuffer = new VertexBuffer();
		this._positionBuffer.uploadData(new Float32Array(positions));
    },

	/**
	 * Initializes the current MorphTarget's normal data
	 */
    setNormalData: function(normals)
    {
		if (normals) {
			this._normalBuffer = new VertexBuffer();
			this._normalBuffer.uploadData(new Float32Array(normals));
		}
    }
};

export { MorphTarget };