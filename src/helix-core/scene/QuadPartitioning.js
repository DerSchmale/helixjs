import {BoundingAABB} from "./BoundingAABB";
import {BoundingVolume} from "./BoundingVolume";

function DummyNode()
{
	this._spatialNext = null;
}

// TODO: Should be able to create a custom QuadBounds object that avoids testing Z, so we can make that infinite?
var aabb = new BoundingAABB();
aabb.clear(BoundingVolume.EXPANSE_FINITE);

/**
 * @classdesc
 * QuadPartitioning forms a base class for spatial partitioning. Scene components such as MeshInstance, PointLightComponent, etc.
 * Are placed in here to accelerate collection.
 *
 * @property {number} minHeight The minimum height of the node, for culling purposes.
 * @property {number} maxHeight The maximum height of the node, for culling purposes.

 * @constructor
 *
 * @param {number} size The size of the QuadTree. This should be about as big as the scene bounds' XY extents.
 * @param {number} numLevels The node depth of the quad tree. Higher values allows more precise frustum culling, but can introduce more overhead if there aren't many entities per node.
 * @param {number} [maxHeight] The maximum height of the node, for culling purposes.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function QuadPartitioning(size, numLevels, minHeight, maxHeight)
{
	// parentID = floor((childID) / 4)
	// childID = 4 * parentID + 1
	// order of children: [ TL, TR, BL, BR ]
	// offset in binary:				  00  01  10  11
	// ie : bottom = 0b10, right = 0b01, so (4 * parentID + 1 + (bottom | right)) is the index for a specific child

	// nodes contain entities
	// node index = 1 + 4 * level
	this._nodes = [];
	this._size = size;
	this._numLevels = numLevels || 4;
	this._minHeight = minHeight === undefined? -10000 : minHeight;
	this._maxHeight = maxHeight === undefined? 10000 : maxHeight;
	this._updateQueue = [];

	var count = 1;
	for (var l = 0; l < this._numLevels; ++l) {
		for (var c = 0; c < count; ++c)
			// every linked list head is a dummy node, so we don't need any further testing or node index storing
			this._nodes.push(new DummyNode());

		count <<= 2;
	}
}

QuadPartitioning.prototype = {
	/**
	 * The minimum height of the node
	 */
	get minHeight()
	{
		return this._minHeight;
	},

	/**
	 * The maximum height of the node
	 */
	get maxHeight()
	{
		return this._maxHeight;
	},

	/**
	 * The size of the QuadTree. This should be about as big as the scene bounds' XY extents.
	 */
	get size()
	{
		return this._size;
	},

	/**
	 * The node depth of the quad tree.
	 */
	get numLevels()
	{
		return this._numLevels;
	},

	/**
	 * @ignore
	 */
	acceptVisitor: function(visitor, isMainCollector)
	{
		if (this._updateQueue)
			this._processUpdates();

		var extent = this._size * .5;
		aabb._minimumZ = this._minHeight;
		aabb._maximumZ = this._maxHeight;
		this._visitNode(visitor, 0, 0, 0, 0, extent, isMainCollector);
	},

	/**
	 * @ignore
	 * @private
	 */
	_visitNode: function(visitor, index, level, x, y, extent, isMainCollector)
	{
		// assume level 0 is always visible, it contains the whole world after all
		if (level > 0) {
			aabb._minimumX = x - extent;
			aabb._maximumX = x + extent;
			aabb._minimumY = y - extent;
			aabb._maximumY = y + extent;

			if (!visitor.qualifiesBounds(aabb))
				return;
		}

		var entity = this._nodes[index]._spatialNext;
		while (entity) {
			if (visitor.qualifies(entity))
				entity.acceptVisitor(visitor, isMainCollector);

			entity = entity._spatialNext;
		}

		if (++level === this._numLevels) return;

		extent *= .5;
		index = (index << 2) + 1;

		this._visitNode(visitor, index, level, x - extent, y - extent, extent, isMainCollector);
		this._visitNode(visitor, index + 1, level, x + extent, y - extent, extent, isMainCollector);
		this._visitNode(visitor, index + 2, level, x - extent, y + extent, extent, isMainCollector);
		this._visitNode(visitor, index + 3, level, x + extent, y + extent, extent, isMainCollector);
	},

	/**
	 * @ignore
	 */
	markEntityForUpdate: function(entity)
	{
		// if spatialPrev is null, it means it was already marked (unregisterEntity)
		if (entity.ignoreSpatialPartition || !entity._spatialPrev)
			return;

		this.unregisterEntity(entity);
		this._updateQueue.push(entity);
	},

	/**
	 * @ignore
	 */
	registerEntity: function(entity)
	{
		var nodeIndex = entity.ignoreSpatialPartition? 0 : this._getNodeIndex(entity.worldBounds);
		var node = this._nodes[nodeIndex];

		var next = node._spatialNext;
		node._spatialNext = entity;

		if (next)
			next._spatialPrev = entity;	// update 1st elements prev to new

		entity._spatialPrev = node;		// point to dummy head
		entity._spatialNext = next;		// point to next
	},

	/**
	 * @ignore
	 */
	unregisterEntity: function(entity)
	{
		// just update links
		var prev = entity._spatialPrev;
		var next = entity._spatialNext;

		if (prev) prev._spatialNext = next;
		if (next) next._spatialPrev = prev;

		entity._spatialNext = null;
		entity._spatialPrev = null;
	},

	/**
	 * @ignore
	 * @private
	 */
	_processUpdates: function()
	{
		for (var i = 0, len = this._updateQueue.length; i < len; ++i)
			this.registerEntity(this._updateQueue[i]);

		this._updateQueue = [];
	},

	/**
	 * @ignore
	 */
	migrateTo: function(other)
	{
		for (var i = 0, len = this._nodes.length; i < len; ++i) {
			var entity = this._nodes[i]._spatialNext;
			while (entity) {
				var next = entity._spatialNext;
				entity._spatialNext = null;
				entity._spatialPrev = null;
				other.registerEntity(entity);
				entity = next;
			}
			this._nodes[i]._spatialNext = null;
		}
	},

	/**
	 * @ignore
	 * @private
	 */
	_getNodeIndex: function(bounds)
	{
		if (bounds.expanse === BoundingVolume.EXPANSE_INFINITE)
			return 0;

		var minX = bounds._minimumX;
		var minY = bounds._minimumY;
		var maxX = bounds._maximumX;
		var maxY = bounds._maximumY;

		var extent = this._size * .25;
		var centerX = 0;
		var centerY = 0;
		var level = 0;
		var node = 0;

		while (true) {
			var child = 0;

			if (minX >= centerX) {
				child |= 0x01;
				centerX += extent;
			}
			// straddling the child nodes, so store it in here
			else if (maxX > centerX)
				return node;
			else
				centerX -= extent;

			if (minY >= centerY) {
				child |= 0x02;
				centerY += extent;
			}
			// straddling the child nodes, so store it in here
			else if (maxY > centerY)
				return node;
			else
				centerY -= extent;

			if (++level === this._numLevels)
				return node;

			// go to containing child
			node = (node << 2) + 1 + child;
			extent *= .5;
		}
	}
};

export {QuadPartitioning};