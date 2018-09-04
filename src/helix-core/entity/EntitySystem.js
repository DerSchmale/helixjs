/**
 * @classdesc
 *
 * EntitySystems allow for more complex component-based logic. Using getEntitySet, all entities with a certain component
 * can be retrieved. so they can update with knowledge of each-other, or of other components. (for example a
 * HunterComponent vs PreyComponent). Other uses are if an external engine (physics, or so) needs to be updated.
 * EntitySystems need to be started through {@linkcode Scene#startSystem}, where a strict order of updates is enforced.
 * Systems are always updated in the order they were added, and after regular components have been updated.
 *
 * @constructor
 *
 * @property scene The scene the EntitySystem is running on.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function EntitySystem()
{
    this._entityEngine = null;
    this._sets = [];
    this.scene = null;
}

EntitySystem.prototype =
{
    /**
     * Called when a system is started.
     */
    onStarted: function()
    {

    },

    /**
     * Called when a system is stopped. Anything changed by the system should be undone here.
     */
    onStopped: function()
    {

    },

    /**
     * Called when a system needs to update.
     * @param dt The time in milliseconds since last update.
     */
    onUpdate: function(dt)
    {

    },

    /**
     * Retrieves an {@linkcode EntitySet} containing entities matching the given components.
     * @param components An Array of component types.
     */
    getEntitySet: function(components)
    {
        var set = this._entityEngine.getEntitySet(components);
        this._sets.push(set);
        return set;
    },

    /**
     * @ignore
     */
    _onStarted: function(entityEngine)
    {
        this._entityEngine = entityEngine;
        this.onStarted();
    },

    /**
     * @ignore
     */
    _onStopped: function()
    {
        for (var i = 0; i < this._sets; ++i) {
            this._sets[i].free();
        }

        this._sets = [];
    }
};

export { EntitySystem };