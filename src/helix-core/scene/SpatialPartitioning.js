import {SceneNode} from "./SceneNode";
import {BoundingAABB} from "./BoundingAABB";

/**
 * SpatialPartitioning forms a base class or template for spatial partitioning. Scene components such as MeshInstance,
 * PointLightComponent, etc. Are placed in here to accelerate collection.
 *
 * Octrees etc can be made with this.
 *
 * @constructor
 */
function SpatialPartitioning()
{
}

SpatialPartitioning.prototype = {
	acceptVisitor: function(visitor)
	{
		// Update entities here if they're marked invalid
		throw new Error("abstract method called!");
	},

	markEntityForUpdate: function(entity)
	{
		throw new Error("abstract method called!");
	},

	registerEntity: function(entity)
	{
		throw new Error("abstract method called!");
	},

	unregisterEntity: function(entity)
	{
		throw new Error("abstract method called!");
	}
};

// this can be used by hierarchical partitioning systems
function SpatialNode()
{
	this._worldBounds = new BoundingAABB();
	this._children = [];
}

SpatialNode.prototype =
{
	get worldBounds()
	{
		return this._worldBounds;
	},

	/**
	 * @ignore
	 */
	acceptVisitor: function(visitor)
	{
		var len = this._children.length;
		for (var i = 0; i < len; ++i) {
			var child = this._children[i];

			if (visitor.qualifies(child))
				child.acceptVisitor(visitor);
		}
	}
};

export { SpatialPartitioning, SpatialNode };