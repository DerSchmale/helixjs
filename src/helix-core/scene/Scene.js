import {Entity} from "../entity/Entity";
import {EntityEngine} from "../entity/EntityEngine";
import {SceneNode} from "./SceneNode";
import {FlatPartitioning} from "./FlatPartitioning";

var nameCounter = 0;

/**
 * @classdesc
 * Scene forms the base to contain the entire scene graph. It contains a hierarchical structure including
 * {@linknode Entity}, lights, cameras, etc.
 *
 * @param {SceneNode} [rootNode] An optional scene node to use as a root. Useful if an entire scene hierarchy was already loaded.
 *
 * @constructor
 *
 * @property name The name of the scene.
 * @property skybox The {@linkcode Skybox} to use when rendering the scene.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Scene(rootNode)
{
	this.name = "hx_scene_" + (nameCounter++);
	this._entityEngine = new EntityEngine();
	this._partitioning = new FlatPartitioning();
	this._rootNode = rootNode || new Entity();
	this._rootNode.name = "Root";
	this.skybox = null;
	this._rootNode._setScene(this);
}

Scene.prototype = {
    /**
     * The rootnode of the scene.
     */
    get rootNode() { return this._rootNode; },

    /**
     * Finds a scene node with the given name somewhere in the Scene.
     */
    findNodeByName: function(name)
    {
        return this._rootNode.findNodeByName(name);
    },

    /**
     * Finds a material with the given name somewhere in the Scene.
     */
    findMaterialByName: function(name)
    {
        return this._rootNode.findMaterialByName(name);
    },

    /**
     * Attaches a child to the root node.
     */
    attach: function(child)
    {
        this._rootNode.attach(child);
    },

    /**
     * Removes a child from the root node.
     */
    detach: function(child)
    {
        this._rootNode.detach(child);
    },

	/**
     * Destroys the scene and all its children
	 */
	destroy: function()
    {
        this._rootNode.destroy();
    },

    /**
     * The amount of children in the scene root node.
     */
    get numChildren()
    {
        return this._rootNode.numChildren;
    },

    /**
     * Gets the child object at the given index.
     */
    getChild: function(index)
    {
        return this._rootNode.getChild(index);
    },

    /**
     * Returns whether or not the child object is attached to the root node.
     */
    contains: function(child)
    {
        this._rootNode.contains(child);
    },

    /**
     * @ignore
     */
    acceptVisitor: function(visitor)
    {
        visitor.visitScene(this);

        // assume root node will always qualify
        this._partitioning.acceptVisitor(visitor);
    },

	/**
     * Returns the set of all entities with the given components. All components must be present in an Entity to be in the set.
     *
     * @param components An Array of components.
	 */
	getEntitySet: function(components)
    {
        return this._entityEngine.getEntitySet(components);
    },

    /**
     * @ignore
     */
    get entityEngine()
    {
        return this._entityEngine;
    },

	/**
     * @ignore
	 */
	get partitioning()
    {
         return this._partitioning;
    },

    /**
     * Starts a {@linkcode EntitySystem}. These are systems that allow adding more complex behaviours using components.
     * The order of updates happen in the order they're added.
     */
    startSystem: function(system)
    {
        system.scene = this;
        this._entityEngine.startSystem(system);
    },

    /**
     * Stops a {@linkcode EntitySystem}.
     */
    stopSystem: function(system)
    {
        system.scene = null;
        this._entityEngine.stopSystem(system);
    },

    /**
     * The bounding volume for the entire scene in world coordinates.
     */
    get worldBounds()
    {
        return this._rootNode.worldBounds;
    },

    /**
     * Applies a function recursively to all child nodes.
     * @param func The function to call (using the traversed node as argument)
     */
    applyFunction: function(func)
    {
        this._rootNode.applyFunction(func);
    }
};

export { Scene };