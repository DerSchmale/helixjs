/**
 * @classdesc
 * FlatPartitioning is a spatial partitioning system for simple scenes that do not require hierarchical testing.
 *
 * @extends
 *
 * @constructor
 *
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FlatPartitioning()
{
	this._entities = [];
}

FlatPartitioning.prototype = {
	acceptVisitor: function(visitor, isMainCollector)
	{
		var entities = this._entities;
		for (var i = 0, len = entities.length; i < len; ++i) {
			var entity = entities[i];
			if (visitor.qualifies(entity))
				entity.acceptVisitor(visitor, isMainCollector);
		}
	},

	migrateTo: function(other)
	{
		this._entities.forEach(function(entity) {
			other.registerEntity(entity);
		});

		this._entities = [];
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