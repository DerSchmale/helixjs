import {MeshInstance} from "./MeshInstance";
import {Matrix4x4} from "../math/Matrix4x4";
import {BoundingVolume} from "../scene/BoundingVolume";
import {VertexBuffer} from "../core/VertexBuffer";
import {BufferUsage} from "../Helix";
import {GL} from "../core/GL";
import {MaterialPass} from "../material/MaterialPass";
import {BoundingAABB} from "../scene/BoundingAABB";

// local module work objects
var m = new Matrix4x4();
var aabb = new BoundingAABB();

/**
 * @classdesc
 *
 * MeshBatch allows bundling a {@linkcode Mesh} with a {@linkcode Material} similar to {@linkcode MeshInstance}, but
 * allows rendering multiple instances in a single draw call. To save on memory usage, individual instances are referred
 * to by individual IDs instead of Transform objects. Despite being a subclass, MeshBatch is still considered a
 * MeshInstance component.
 *
 * @property {number} numInstances The amount of instances that will be drawn.
 *
 * @param {Mesh} mesh The {@linkcode Mesh} providing the geometry for this instance.
 * @param {Material} material The {@linkcode Material} to use to render the given Mesh.
 * @param {Boolean} dynamic Whether or not the generated geometry is dynamic. If so, updating the instance transforms
 * often can be faster, but it removes frustum culling for this batch unless bounds are explicitly assigned. Defaults to false.
 * @constructor
 *
 * @extends MeshInstance
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MeshBatch(mesh, material, dynamic)
{
	MeshInstance.call(this, mesh, material);
	material._setUseInstancing(true);
	this._dynamic = dynamic || false;

	this._idCounter = 0;
	this._instanceTransformData = new Float32Array([]);		// contains 3 vec4 objects forming an affine matrix
	this._numInstances = 0;

	// cannot update bounds constantly if dynamic, so always draw
	this._bounds.clear(dynamic? BoundingVolume.EXPANSE_INFINITE : BoundingVolume.EXPANSE_EMPTY);
	this._boundsInvalid = false;
	this._vertexBuffer = new VertexBuffer();
	this._vertexBufferInvalid = false;

	this._addQueue = [];
	this._deleteQueue = [];
	this._idToIndex = {};
	this._indexToID = [];

	this._MI_updateRenderState = MeshInstance.prototype.updateRenderState;
}

MeshBatch.prototype = Object.create(MeshInstance.prototype, {
	dynamic: {
		get: function()
		{
			return this._dynamic;
		}
	},

	numInstances: {
		get: function()
		{
			return this._numInstances;
		}
	}
});

/**
 * Adds an instance with a given transform. This method returns the ID for the instance, which is used when the instance
 * needs to be deleted or its transform updated.
 * @param transform A {@linkcode Matrix4x4} or a {@linkcode Transform} containing the transformation for the instance.
 * @returns {number} An ID representing the instance. Use this to set the transform in {@linkcode MeshBatch#setTransform}
 * and {@linkcode MeshBatch#destroyInstance].
 */
MeshBatch.prototype.createInstance = function(transform)
{
	var id = ++this._idCounter;

	var matrix;
	if (transform instanceof Matrix4x4)
		matrix = transform;
	else
		matrix  = transform.matrix;

	aabb.transformFrom(this._mesh.bounds, matrix);

	if (!this._dynamic)
		this.bounds.growToIncludeBound(aabb);

	this._addQueue.push({
		id: id,
		matrix: matrix.clone()	// need to clone so that we could use the same object multiple times
	});

	if (this.entity)
		this.entity.invalidateBounds();

	++this._numInstances;

	this._vertexBufferInvalid = true;

	return id;
};

/**
 * Retrieves the matrix based on the index in the list, not the instanceID
 * @ignore
 */
MeshBatch.prototype.getMatrixByIndex = function(index, target)
{
	target = target || new Matrix4x4();

	var m = target._m;
	var i = index * 12;
	var data = this._instanceTransformData;

	for (var r = 0; r < 3; ++r) {
		m[r] = data[i++];
		m[r + 4] = data[i++];
		m[r + 8] = data[i++];
		m[r + 12] = data[i++];
	}

	return target;
};

/**
 * Changes the transform for an instance.
 * @param instanceID The instance ID as returned by {@linkcode MeshBatch#createInstance}
 * @param transform A {@linkcode Matrix4x4} or {@linkcode Transform} object.
 */
MeshBatch.prototype.setTransform = function(instanceID, transform)
{
	var matrix;
	if (transform instanceof Matrix4x4)
		matrix = transform;
	else
		matrix  = transform.matrix;

	// not added yet, keep in
	var index = this._idToIndex[instanceID];
	if (index === undefined) {
		index = this._getAddQueueIndex(instanceID);
		this._addQueue[index].matrix.copyFrom(matrix);
	}
	else {
		this._writeMatrix(index, matrix);
		this._vertexBufferInvalid = true;
	}

	if (!this._dynamic)
		this.invalidateBounds();
};

/**
 * Destroys an instance.
 * @param instanceID The instance ID as returned by {@linkcode MeshBatch#createInstance}
 */
MeshBatch.prototype.destroyInstance = function(instanceID)
{
	// if no link to index is present it's still in the add queue, just need to remove it:
	if (this._idToIndex[instanceID] === undefined) {
		var index = this._getAddQueueIndex(instanceID);
		this._addQueue.splice(index, 1);
	}
	else {
		this._deleteQueue.push(instanceID);
		this._vertexBufferInvalid = true;
	}

	--this._numInstances;
};

/**
 * @ignore
 * @private
 */
MeshBatch.prototype._getAddQueueIndex = function(instanceID)
{
	for (var i = 0, len = this._addQueue.length; i < len; ++i) {
		var a = this._addQueue[i];
		if (a.id === instanceID)
			return i;
	}
	return -1;
};

/**
 * @ignore
 * @private
 */
MeshBatch.prototype._updateBounds = function()
{
	// this only happens when changing static MeshBatch, hence it's a bit slower but more precise.
	var meshBounds = this._mesh.bounds;
	var bounds = this._bounds;

	bounds.clear();

	for (var i = 0, len = this._numInstances; i < len; ++i) {
		this._readMatrix(i, m);
		aabb.transformFrom(meshBounds, m);
		bounds.growToIncludeBound(aabb);
	}

	for (i = 0, len = this._addQueue.length; i < len; ++i) {
		aabb.transformFrom(meshBounds, this._addQueue[i].matrix);
		bounds.growToIncludeBound(aabb);
	}
};

/**
 * @ignore
 */
MeshBatch.prototype.acceptVisitor = function(visitor)
{
	if (this._numInstances)
		visitor.visitMeshBatch(this);
};

/**
 * @inheritDoc
 */
MeshBatch.prototype.updateRenderState = function(passType)
{
	if (this._vertexBufferInvalid)
		this._updateVertexBuffer();

	this._MI_updateRenderState(passType);

	var gl = GL.gl;
	var attribLocs = this._attribLocations[passType];

	this._vertexBuffer.bind();

	var offs = 0;

	for (var r = 0; r < 3; ++r) {
		var loc = attribLocs[r];
		gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 48, offs);
		GL.vertexAttribDivisor(loc, 1);
		offs += 16;
	}
};

/**
 * @ignore
 * @private
 */
MeshBatch.prototype._updateVertexBuffer = function()
{
	if (this._deleteQueue.length || this._addQueue.length)
		this._recreateVertexBuffer();

	this._vertexBuffer.uploadData(this._instanceTransformData, this._dynamic? BufferUsage.DYNAMIC_DRAW : BufferUsage.STATIC_DRAW);
	this._vertexBufferInvalid = false;
};

/**
 * @ignore
 * @private
 */
MeshBatch.prototype._recreateVertexBuffer = function()
{
	var numInstances = this._numInstances;
	var oldData = this._instanceTransformData;
	var newLen = numInstances * 12;

	// if length didn't change, no need to create new instance
	// the update algorithm works in place, since it only writes to elements that it no longer needs to read (newIndex <= oldIndex)
	var newData = newLen === oldData.length? oldData : new Float32Array(newLen);

	var deleteCount = this._deleteQueue.length;

	if (deleteCount)
		this._processDeletes(oldData, newData);
	else if (oldData !== newData)
		// simply copy of nothing was deleted
		newData.set(oldData);

	this._instanceTransformData = newData;

	var addCount = this._addQueue.length;
	var offset = numInstances - addCount;
	for (var i = 0; i < addCount; ++i) {
		var elm = this._addQueue[i];
		var index = i + offset;
		this._writeMatrix(index, elm.matrix);
		this._indexToID[index] = elm.id;
		this._idToIndex[elm.id] = index;
	}

	this._indexToID.length = numInstances;
	this._addQueue.length = 0;
};

/**
 * @ignore
 * @private
 */
MeshBatch.prototype._processDeletes = function(oldData, newData)
{
	// sort so we can keep grabbing the top of the stack to find the first deleted instance
	// this works because: id(a) > id(b) <=> index(a) > index(b)
	this._deleteQueue.sort(sortDeletes);

	var deletedID = this._deleteQueue.pop();
	var oldLen = oldData.length;
	var oldInstances = oldLen / 12;

	// copy the old data while removing the deleted objects (must ignore the added amount)
	for (var newI = 0, oldI = 0; oldI < oldInstances; ++newI, ++oldI) {
		var id = this._indexToID[oldI];

		// this is better than splicing on delete
		this._indexToID[newI] = id;

		if (id === deletedID) {
			delete this._idToIndex[id];
			// do not update new index
			--newI;
			deletedID = this._deleteQueue.pop();
		}
		else {
			// store new index
			this._idToIndex[id] = newI;

			// copy the data
			var start = newI * 12;
			var end = start + 12;
			for (var i = start, o = oldI * 12; i < end; ++i, ++o)
				newData[i] = oldData[o];
		}
	}

	// test to see algo behaves as expected
	console.assert(this._deleteQueue.length === 0, "Delete queue not empty.");
};

/**
 * @inheritDoc
 * @private
 */
MeshBatch.prototype._initVertexLayouts = function()
{
	MeshInstance.prototype._initVertexLayouts.call(this);

	this._attribLocations = [];
	for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
		var pass = this._material.getPass(i);
		if (!pass) continue;
		var arr = [
			pass.getAttributeLocation("hx_instanceMatrix0"),
			pass.getAttributeLocation("hx_instanceMatrix1"),
			pass.getAttributeLocation("hx_instanceMatrix2")
		];

		if (arr[0] < 0 || arr[1] < 0 || arr[2] < 0)
			throw new Error("Trying to draw MeshBatch with an incompatible shader. Make sure hx_instanceMatrix0, hx_instanceMatrix1 and hx_instanceMatrix2 are available in the shader.");

		this._attribLocations[i] = arr;
	}
};

/**
 * @private
 * @ignore
 */
MeshBatch.prototype._readMatrix = function (index, matrix)
{
	var m = matrix._m;
	var i = index * 12;
	var data = this._instanceTransformData;

	for (var r = 0; r < 3; ++r) {
		// so we can store 3 vec4 objects, we transpose the matrix. This is handled in the shader by post-multiplying
		// the matrix to the position vector.
		m[r] = data[i++];
		m[r + 4] = data[i++];
		m[r + 8] = data[i++];
		m[r + 12] = data[i++];
	}
};

/**
 * @private
 * @ignore
 */
MeshBatch.prototype._writeMatrix = function (index, matrix)
{
	var m = matrix._m;
	var i = index * 12;
	var data = this._instanceTransformData;

	for (var r = 0; r < 3; ++r) {
		// so we can store 3 vec4 objects, we transpose the matrix. This is handled in the shader by post-multiplying
		// the matrix to the position vector.
		data[i++] = m[r];
		data[i++] = m[r + 4];
		data[i++] = m[r + 8];
		data[i++] = m[r + 12];
	}
};

function sortDeletes(a, b)
{
	return b - a;
}

export {MeshBatch};