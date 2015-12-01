/**
 * Keeps track and updates entities
 * @constructor
 */
HX.EntityEngine = function()
{
    this._updateableEntities = [];
};

HX.EntityEngine.prototype =
{
    registerEntity: function(entity)
    {
        entity._onRequireUpdatesChange.bind(this, this._onEntityUpdateChange);
        if (entity._requiresUpdates)
            this._addUpdatableEntity(entity);
    },

    unregisterEntity: function(entity)
    {
        entity._onRequireUpdatesChange.unbind(this);
        if (entity._requiresUpdates)
            this._removeUpdatableEntity(entity);
    },

    updateEntities: function(dt)
    {
        var entities = this._updateableEntities;
        var len = entities.length;
        for (var i = 0; i < len; ++i)
            entities[i].update(dt);
    },

    _onEntityUpdateChange: function(entity)
    {
        if (entity._requiresUpdates)
            this._addUpdatableEntity(entity);
        else
            this._removeUpdatableEntity(entity);
    },

    _addUpdatableEntity: function(entity)
    {
        this._updateableEntities.push(entity);
    },

    _removeUpdatableEntity: function(entity)
    {
        var index = this._updateableEntities.indexOf(entity);
        this._updateableEntities.splice(index, 1);
    }
};