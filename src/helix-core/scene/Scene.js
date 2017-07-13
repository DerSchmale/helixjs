import {EntityEngine} from "../entity/EntityEngine";
import {SceneNode} from "./SceneNode";

/**
 * @classdesc
 * Scene forms the base to contain the entire scene graph. It contains a hierarchical structure including
 * {@linknode ModelInstance}, lights, cameras, etc.
 *
 * @param {SceneNode} [rootNode] An optional scene node to use as a root. Useful if an entire scene hierarchy was already loaded.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Scene(rootNode)
{
    // the default partition is a BVH node
    //  -> or this may need to become an infinite bound node?
    this._rootNode = rootNode || new SceneNode();
    this._rootNode._setScene(this);
    this._skybox = null;
    this._entityEngine = new EntityEngine();
}

Scene.prototype = {
    /**
     * The {@linkcode Skybox} to use when rendering the scene.
     */
    get skybox() { return this._skybox; },
    set skybox(value) { this._skybox = value; },

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
        this._rootNode.acceptVisitor(visitor);
    },

    /**
     * @ignore
     */
    get entityEngine()
    {
        return this._entityEngine;
    },

    /**
     * The bounding volume for the entire scene in world coordinates.
     */
    get worldBounds()
    {
        return this._rootNode.worldBounds;
    }
};

export { Scene };