import {Signal} from "../core/Signal";

/**
 * EntitySet provides a way to keep collections of entities based on their Components. Collections should always
 * be retrieved via {@linkcode EntitySystem}!
 *
 * @property {Signal} onEntityAdded Dispatched whenever an entity is added to the collection.
 * @property {Signal} onEntityRemoved Dispatched whenever an entity is removed from the collection.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function EntitySet(hash)
{
    this.onEntityAdded = new Signal();
    this.onEntityRemoved = new Signal();
    this.onDisposed = new Signal();

    this._hash = hash;
    this._entities = [];
    this._usageCount = 0;
}

EntitySet.prototype =
{
    /**
     * The number of entities currently in the set.
     */
    get numEntities()
    {
        return this._entities.length;
    },

    /**
     * Returns the entity at the given index.
     */
    getEntity: function(index)
    {
        return this._entities[index];
    },


    /**
     * @ignore
     */
    _containsComponentHash: function(bitfield)
    {
        this._hash.contains(bitfield);
    },

    /**
     * @ignore
     */
    _add: function(entity)
    {
        this._entities.push(entity);
        this.onEntityAdded.dispatch(entity);
    },

    /**
     * @ignore
     */
    _remove: function(entity)
    {
        this.onEntityRemoved.dispatch(entity);
        var index = this._entities.indexOf(entity);
        this._entities.splice(index, 1);
    },

    /**
     * @ignore
     */
    _increaseUsage: function()
    {
        ++this._usageCount;
    },

    /**
     * @ignore
     */
    free: function()
    {
        if (--this._usageCount === 0)
            this.onDisposed.dispatch(this);
    }
};

export { EntitySet };