import {MeshBatch} from "../mesh/MeshBatch";
import {Entity} from "../entity/Entity";
import {BoundingAABB} from "./BoundingAABB";
import {BoundingVolume} from "./BoundingVolume";
import {Float4} from "../math/Float4";

/**
 * QuadLODContainer is a scene node that allows adding mesh batches for different LODs to each quad tree level. At the
 * root, it's a regular NxN grid.
 * @param size The world size for the entire world.
 * @param numLevels The depth of the quad tree. Defaults to 5
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function QuadLODContainer(size, numLevels)
{
	Entity.call(this);
	this._size = size;
	this._levels = numLevels || 3;

	// quadID
	// parentID = floor((childID) / 4)
	// childID = 4 * parentID + 1
	// order of children is clockwise: [ TL, TR, BL, BR ]
	// offset in binary:				  00  01  10  11
	// ie : bottom = 0b10, right = 0b01, so (4 * parentID + 1 + (bottom | right)) is the index for a specific child

	this._meshBatches = {};
	this._visibleBatches = [];
	// the height ranges for each node
	this._heightRanges = [];

	this._allUsedMask = 0;
}

QuadLODContainer.prototype = Object.create(Entity.prototype);

/**
 * Registers a MeshInstance to use as the given LOD level for a Mesh class of given name.
 * @param name The mesh class for which to register an LOD level.
 * @param lodLevel The lod index. 0 represents the highest detail.
 * @param meshInstance The mesh instance defining the LOD content.
 */
QuadLODContainer.prototype.registerLODs = function(name, lodLevel, meshInstance)
{
	var offset = 0;
	var levelIndex = this._levels - lodLevel - 1;

	for (var l = 0; l < levelIndex; ++l) {
		offset += Math.pow(4, l);
	}

	var numNodes = Math.pow(4, levelIndex);

	var collection = this._meshBatches[name] || [];
	this._meshBatches[name] = collection;

	for (var i = 0; i < numNodes; ++i) {
		var batch = new MeshBatch(meshInstance.mesh, meshInstance.material, false);
		batch.lodRangeStart = meshInstance.lodRangeStart;
		batch.lodRangeEnd = meshInstance.lodRangeEnd;
		collection[offset + i] = batch;
		// do not really add it as component, but make it appear as such
		batch.entity = this;
	}

	// update the "used mesh batch"
	this._allUsedMask = 0;
	i = 1;
	for (var key in this._meshBatches) {
		this._allUsedMask |= i;
		i <<= 1;
	}
};

QuadLODContainer.prototype.acceptVisitor = function(visitor, isMainCollector)
{
	// only do this in the main collector, so shadows etc are rendered using the same meshes as the view
	if (isMainCollector) {
		this._visibleBatches = [];
		// how to do this...
		// option 1: Pick LOD based on closest distance
		// option 2: Pick LOD only if it fits entirely in the camera view
		this._visitNode(0, 0, 0, 0, this._worldSize * .5, false, 0);
	}

	var vis = this._visibleBatches;
	for (var i = 0, len = vis.length; i < len; ++i)
		visitor.visitMeshBatch(vis[i]);
};

QuadLODContainer.prototype.createInstance = function(name, transform)
{
	var batches = this._meshBatches[name];
	var matrix = transform.matrix || transform;
	var m = matrix._m;
	var hs = this._size * .5;
	// remap to [0, 1] to make things easier
	var x = (m[12] + hs) / this._size;
	var y = (m[13] + hs) / this._size;

	if (x < 0 || x >= 1 || y < 0 || y >= 1) {
		console.log("Instance is out of quadtree bounds, not adding!");
		return;
	}

	var nodeID = 0;
	var l = 0;

	do {
		var batch = batches[nodeID];

		if (batch) {
			batch.createInstance(transform);
			var bounds = batch.bounds;
			var minZ = bounds.minimum.z;
			var maxZ = bounds.maximum.z;
			var range = this._heightRanges[nodeID];

			if (minZ < range[0])
				range[0] = minZ;

			if (maxZ > range[1])
				range[1] = maxZ;
		}

		// test in which child it would be
		// offset bit mask for right and bottom
		var offset = 0;
		if (x > .5) {
			// remap to [0, .5]
			x -= .5;
			offset |= 0x01;
		}
		if (y > .5) {
			// remap to [0, .5]
			y -= .5;
			offset |= 0x02;
		}

		// remap to [0, 1]
		x *= 2.0;
		y *= 2.0;

		// descend to child
		nodeID = 4 * nodeID + 1 + offset;
	} while(++l < this._levels);
};

var aabb = new BoundingAABB();
var min = new Float4();
var max = new Float4();

/**
 * x, y is the CENTER of the box
 * isInside means that the whole parent was completely inside, so no more culling is required
 * usedMask contains a bitmask to define which mesh classes have been used already. (not all mesh classes have the same
 * LOD levels set up)
 * @ignore
 * @private
 */
QuadLODContainer.prototype._visitNode = function(frustum, x, y, nodeIndex, level, halfExtent, usedMask)
{
	// TODO: We can probably inline and optimize this easily
	var range = this._heightRanges[nodeIndex];
	min.x = x - halfExtent;
	min.y = y - halfExtent;
	min.z = range[0];
	max.x = x + halfExtent;
	max.y = y + halfExtent;
	max.z = range[1];
	aabb.setExplicit(min, max);

	if (!aabb.intersectsConvexSolid(frustum, 6))
		return;

	var useThis = level === this._levels - 1;
	if (!useThis) {
		// TODO: Calculate whether or not to use this depending on distance or containment?
	}

	if (useThis) {
		var i = 0;
		var batches = this._meshBatches;
		for (var key in batches) {
			var list = batches[key];

			// if not used yet (& i) and it exists
			if (!(usedMask & i) && list[nodeIndex]) {
				usedMask |= i;
				this._visibleBatches.push(list[nodeIndex]);
			}

			i <<= 1;
			if (i === 0)
				throw new Error("Cannot contain more than 32 LOD classes");
		}

		// all the required LODs have been used, so we can return
		if (usedMask === this._allUsedMask) return;
	}

	if (++level === this._levels)
		return;

	nodeIndex = 4 * nodeIndex + 1;
	halfExtent *= .5;

	this._visitNode(x - halfExtent, y - halfExtent, nodeIndex, level, halfExtent, usedMask);
	this._visitNode(x + halfExtent, y - halfExtent, nodeIndex + 1, level, halfExtent, usedMask);
	this._visitNode(x - halfExtent, y + halfExtent, nodeIndex + 2, level, halfExtent, usedMask);
	this._visitNode(x + halfExtent, y + halfExtent, nodeIndex + 3, level, halfExtent, usedMask);
};

/**
 * For reference
 * @ignore
 * @private
 */
QuadLODContainer.prototype._getNodeIndex = function(cellX, cellY, quadIndex)
{
	var cellIndex = cellX * cellY * this._subdivision;
	return cellIndex * this._cellStride + quadIndex;
};