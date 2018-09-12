import {BufferUsage, DataType, ElementType} from "../Helix";
import {IndexBuffer} from "../core/IndexBuffer";
import {VertexBuffer} from "../core/VertexBuffer";
import {Signal} from "../core/Signal";
import {Float4} from "../math/Float4";
import {BoundingAABB} from "../scene/BoundingAABB";
import {MorphTarget} from "../animation/morph/MorphTarget";


/**
 * @ignore
 */
var MESH_ID_COUNTER = 0;

/**
 * @classdesc
 *
 * <p>Mesh contains the geometry of a renderable object. A {@linkcode MeshInstance} component is used to combine a Mesh
 * with a Material for rendering.
 *
 * <p>A Mesh can have vertex attributes spread out over several "streams". Every stream means a separate vertex buffer will be used.</p>
 *
 * <p>A Mesh should have its layout defined using addVertexAttribute, and initial data supplied using setVertexData,
 * before passing it on to a Model. These values will be used to calculate its local bounding box.
 * After this, setVertexData can be called to change data, but it will not change the model</p>
 *
 * @param {BufferUsage} vertexUsage A usage hint for the vertex buffer.
 * @param {BufferUsage} indexUsage A usage hint for the index buffer.
 *
 * @property elementType An {@linkcode ElementType} to describe the type of elements to render.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Mesh()
{
    this.onBoundsChanged = new Signal();
    this.onLayoutChanged = new Signal();
    this.onMorphDataCreated = new Signal();
	this.name = "hx_mesh_" + MESH_ID_COUNTER;
	this.elementType = ElementType.TRIANGLES;
	this._bounds = new BoundingAABB();
	this._boundsInvalid = true;
	this._dynamicBounds = true;
	this._vertexBuffers = [];
	this._vertexStrides = [];
	this._vertexData = [];
	this._indexData = undefined;
	this._vertexUsage = BufferUsage.STATIC_DRAW;
	this._indexUsage = BufferUsage.STATIC_DRAW;
	this._numStreams = 0;
	this._numVertices = 0;

    this._vertexAttributes = [];
    this._vertexAttributesLookUp = {};
    this._indexBuffer = new IndexBuffer();

    this._morphTargets = {};
	this._hasMorphNormals = false;
	this._defaultMorphTarget = null;

	this._skeleton = null;

    this._renderOrderHint = ++MESH_ID_COUNTER;
}

/**
 * The vertex stride for meshes created with {@linkcode Mesh#createDefaultEmpty}
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
Mesh.createDefaultEmpty = function(target)
{
	target = target || new Mesh();
	target.addVertexAttribute("hx_position", 3);
	target.addVertexAttribute("hx_normal", 3);
	target.addVertexAttribute("hx_tangent", 4);
	target.addVertexAttribute("hx_texCoord", 2);
    return target;
};


Mesh.prototype = {
	/**
	 * The object-space bounding volume. Setting this value only changes the type of volume.
	 */
	get bounds()
	{
		if (this._boundsInvalid) this._updateBounds();
		return this._bounds;
	},

	set bounds(value)
	{
		this._bounds = value;
		this._invalidateBounds();
	},

	/**
	 * The object-space bounding volume. Setting this value only changes the type of volume.
	 */
	get dynamicBounds()
	{
		return this._dynamicBounds;
	},

	set dynamicBounds(value)
	{
		if (value === this._dynamicBounds)
			return;

		this._dynamicBounds = value;

		if (value)
			this._invalidateBounds();
		else
			this._boundsInvalid = false;
	},

    /**
     * Whether or not this Mesh supports morph target animations. This is the case if {@linkcode Mesh#generateMorphData}
     * was called.
     */
    get hasMorphData()
    {
        return !!this._defaultMorphTarget;
    },

    get hasMorphNormals()
    {
        return this._hasMorphNormals;
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
    setVertexData: function (data, streamIndex, usageHint)
    {
        streamIndex = streamIndex || 0;

        this._vertexUsage = usageHint || BufferUsage.STATIC_DRAW;

        this._vertexData[streamIndex] = data instanceof Float32Array? data : new Float32Array(data);
        this._vertexBuffers[streamIndex] = this._vertexBuffers[streamIndex] || new VertexBuffer();
        this._vertexBuffers[streamIndex].uploadData(this._vertexData[streamIndex], this._vertexUsage);

        if (streamIndex === 0)
            this._numVertices = data.length / this._vertexStrides[0];

		this._invalidateBounds();
    },

    /**
     * Returns the index data uploaded to the index buffer.
     */
    getIndexData: function()
    {
        return this._indexData;
    },

    /**
     * Uploads index data from an Array or a Uint16Array
     */
    setIndexData: function (data, usageHint)
    {
        this._indexUsage = usageHint || BufferUsage.STATIC_DRAW;

        if (data instanceof Uint16Array) {
            this._indexData = data;
            this._indexType = DataType.UNSIGNED_SHORT;
        }
        else if (data instanceof Uint32Array) {
            this._indexData = data;
            this._indexType = DataType.UNSIGNED_INT;
        }
        else {
            this._indexData = new Uint16Array(data);
            this._indexType = DataType.UNSIGNED_SHORT;
        }
        this._numIndices = this._indexData.length;
        this._indexBuffer.uploadData(this._indexData, this._indexUsage);
    },

    /**
     * Adds a named vertex attribute. All properties are given manually to make it easier to support multiple streams in the future.
     * @param name The name of the attribute, matching the attribute name used in the vertex shaders.
     * @param numComponents The amount of components used by the attribute value.
     * @param streamIndex [Optional] The stream index indicating which vertex buffer is used, defaults to 0
     * @param normalized [Optional] Whether or not the input of the attribute should be normalized to [-1, 1]
     */
    addVertexAttribute: function (name, numComponents, streamIndex, normalized)
    {
        streamIndex = streamIndex || 0;
        this._numStreams = Math.max(this._numStreams, streamIndex + 1);
        var offset = this._vertexStrides[streamIndex] || 0;
        var attrib = {
            name: name,
            offset: offset,
            numComponents: numComponents,
            streamIndex: streamIndex,
		    normalized: normalized || false
        };
        this._vertexAttributes.push(attrib);
        this._vertexAttributesLookUp[name] = attrib;

        this._vertexStrides[streamIndex] = offset + numComponents;

        this.onLayoutChanged.dispatch();
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
    generateMorphData: function(supportNormals)
    {
        var count;

        if (supportNormals) {
            this._hasMorphNormals = true;
            count = 4;
        }
        else {
            count = 8;
        }

        for (i = 0; i < count; ++i) {
            // these will never have data assigned to them!
            // append these each as a different stream
            this.addVertexAttribute("hx_morphPosition" + i, 3, this._numStreams);

            if (supportNormals)
                this.addVertexAttribute("hx_morphNormal" + i, 3, this._numStreams);
        }

        var data = [];

        for (var i = 0; i < this._numVertices; ++i) {
            data.push(0, 0, 0);
        }

        // this is used for both positions and normals (if needed)
        this._defaultMorphTarget = new VertexBuffer();
        this._defaultMorphTarget.uploadData(new Float32Array(data), BufferUsage.STATIC_DRAW);

		this.onMorphDataCreated.dispatch();
		this.onLayoutChanged.dispatch();
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
    },

	/**
	 * Adds a MorphTarget object for animators to work with.
	 */
    addMorphTarget: function(morphTarget)
	{
		this._morphTargets[morphTarget.name] = morphTarget;

		if (!this._defaultMorphTarget)
		    this.generateMorphData();
	},

	/**
	 * Adds a MorphTarget object for animators to work with.
	 */
    removeMorphTarget: function(morphTarget)
	{
		delete this._morphTargets[morphTarget.name];
	},

	/**
	 * Gets the morph target by name.
	 * @param {name} index The name of the {@linkcode MorphTarget}
	 * @returns {MorphTarget}
	 */
	getMorphTarget: function(name)
	{
		return this._morphTargets[name];
	},

    /**
     * Returns a duplicate of this Mesh.
     */
    clone: function()
    {
        var mesh = new Mesh();
        var numAttribs = this._vertexAttributes.length;

        for (var i = 0; i < numAttribs; ++i) {
            var attrib = this._vertexAttributes[i];
            mesh.addVertexAttribute(attrib.name, attrib.numComponents, attrib.streamIndex);
        }

        for (i = 0; i < this._numStreams; ++i) {
            if (this._vertexData[i])
                mesh.setVertexData(this._vertexData[i], i, this._vertexUsage);
        }

        if (this._indexData)
            mesh.setIndexData(this._indexData, this._indexUsage);

        mesh.elementType = this.elementType;

        return mesh;
    },

    translate: function(x, y, z)
    {
        if (x instanceof Float4) {
            y = x.y;
            z = x.z;
            x = x.x;
        }

        var attrib = this.getVertexAttributeByName("hx_position");
        if (!attrib) return;

        var stride = this.getVertexStride(attrib);
        var data = this.getVertexData(attrib.streamIndex);
        for (var i = attrib.offset; i < data.length; i += stride) {
            data[i] += x;
            data[i + 1] += x;
            data[i + 2] += x;
        }

        this._vertexBuffers[attrib.streamIndex].uploadData(this._vertexData[attrib.streamIndex], this._vertexUsage);
    },

	/**
	 * @ignore
	 * @private
	 */
	_updateBounds: function()
	{
		this._bounds.clear();
		this._bounds.growToIncludeMesh(this);
		this._boundsInvalid = false;
	},

	/**
     * @ignore
	 * @private
	 */
	_invalidateBounds: function()
    {
    	if (this._dynamicBounds) {
			this._boundsInvalid = true;
			this.onBoundsChanged.dispatch();
		}
    }
};

export { Mesh };