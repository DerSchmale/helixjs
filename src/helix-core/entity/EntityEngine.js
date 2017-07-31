import { onPreFrame } from '../Helix';
import {EntitySet} from "./EntitySet";
import {ArrayUtils} from "../utils/ArrayUtils";
import {Bitfield} from "../core/Bitfield";
import {Debug} from "../debug/Debug";

/**
 * @classdesc
 * Keeps track and updates entities
 *
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function EntityEngine()
{
    this._updateableEntities = [];
    this._entities = [];
    this._entitySets = {};
    this._systems = [];

    // TODO: This would update the entity engine even if the current scene is not actually used!
    onPreFrame.bind(this._update, this);
}

EntityEngine.prototype =
{
    startSystem: function(system)
    {
        if (this._systems.indexOf(system) >= 0)
            throw new Error("System already running!");

        this._systems.push(system);
        system._onStarted(this);
    },

    stopSystem: function(system)
    {
        var index = this._systems.push(system);

        if (index < 0)
            throw new Error("System not running!");

        this._systems.splice(index, 1);
        system.onStopped();
    },

    getEntitySet: function(componentTypes)
    {
        var hash = new Bitfield();
        var len = componentTypes.length;
        for (var i = 0; i < len; ++i)
            hash.setBit(componentTypes[i].COMPONENT_ID);

        var str = hash.toString();
        var set = this._entitySets[str];

        if (!set) {
            set = new EntitySet(hash);
            this._entitySets[str] = set;

            len = this._entities.length;
            for (var i = 0; i < len; ++i) {
                var entity = this._entities[i];
                if (entity._componentHash.contains(hash))
                    set._add(entity);
            }
        }

        set._increaseUsage();
        return set;
    },

    registerEntity: function(entity)
    {
        this._entities.push(entity);
        entity._onComponentsChange.bind(this._onEntityComponentsChange, this);
        if (entity._requiresUpdates)
            this._addUpdatableEntity(entity);

        ArrayUtils.forEach(this._entitySets, function(set) {
            if (entity._componentHash.contains(set._hash))
                set._add(entity);
        });
    },

    unregisterEntity: function(entity)
    {
        var index = this._entities.indexOf(entity);
        this._entities.splice(index);

        entity._onComponentsChange.unbind(this);
        if (entity._requiresUpdates)
            this._removeUpdatableEntity(entity);

        ArrayUtils.forEach(this._entitySets, function(set) {
            if (entity._componentHash.contains(set._hash))
                set._remove(entity);
        });
    },

    _onEntityComponentsChange: function(entity, oldHash)
    {
        if (entity._requiresUpdates)
            this._addUpdatableEntity(entity);
        else
            this._removeUpdatableEntity(entity);

        // careful, the component is still in the entity components list, so EntitySets can dispatch onRemoved while
        // it's still available (important to undo its state in a System).

        ArrayUtils.forEach(this._entitySets, function(set) {
            var containedOld = oldHash.contains(set._hash);
            var containedNew = entity._componentHash.contains(set._hash);

            if (!containedOld && containedNew)
                set._add(entity);
            else if (containedOld && !containedNew)
                set._remove(entity);
        });
    },

    _addUpdatableEntity: function(entity)
    {
        if (this._updateableEntities.indexOf(entity) < 0)
            this._updateableEntities.push(entity);
    },

    _removeUpdatableEntity: function(entity)
    {
        var index = this._updateableEntities.indexOf(entity);
        if (index >= 0)
            this._updateableEntities.splice(index, 1);
    },

    _update: function(dt)
    {
        var entities = this._updateableEntities;
        var len = entities.length;
        for (var i = 0; i < len; ++i)
            entities[i].update(dt);

        var systems = this._systems;
        len = systems.length;
        for (i = 0; i < len; ++i)
            systems[i].onUpdate(dt);
    }
};

export { EntityEngine };