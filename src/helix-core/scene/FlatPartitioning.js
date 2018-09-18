/**
 * SpatialPartitioning forms a base class for spatial partitioning. Scene components such as MeshInstance, PointLightComponent, etc.
 * Are placed in here to accelerate collection.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FlatPartitioning()
{
	this._entities = [];
}

FlatPartitioning.prototype = {
	acceptVisitor: function(visitor)
	{
		var entities = this._entities;
		for (var i = 0, len = entities.length; i < len; ++i) {
			var entity = entities[i];
			if (visitor.qualifies(entity))
				entity.acceptVisitor(visitor);
		}
	},

	markEntityForUpdate: function(entity) {},

	registerEntity: function(entity)
	{
		this._entities.push(entity);
	},

	unregisterEntity: function(entity)
	{
		var index = this._entities.indexOf(entity);
		this._entities.splice(index, 1);
	}
};

export { FlatPartitioning };