/**
 * Creates a new Scene object
 * @param rootNode (optional) A rootnode to be used, allowing different partition types to be used as the root.
 * @constructor
 */
HX.Scene = function(rootNode)
{
    // the default partition is a BVH node
    //  -> or this may need to become an infinite bound node?
    this._rootNode = rootNode || new HX.GroupNode();
    this._rootNode._setScene(this);
    this._skybox = null;
    this._entityEngine = new HX.EntityEngine();
};

HX.Scene.prototype = {
    constructor: HX.Scene,

    get skybox() { return this._skybox; },
    set skybox(value) { this._skybox = value; },

    // TODO: support regex for partial matches
    findNodeByName: function(name)
    {
        return this._rootNode.findNodeByName(name);
    },

    // TODO: support regex for partial matches
    findMaterialByName: function(name)
    {
        return this._rootNode.findMaterialByName(name);
    },

    attach: function(child)
    {
        this._rootNode.attach(child);
    },

    detach: function(child)
    {
        this._rootNode.detach(child);
    },

    get numChildren()
    {
        return this._rootNode.numChildren;
    },

    getChild: function(index)
    {
        return this._rootNode.getChild(index);
    },

    contains: function(child)
    {
        this._rootNode.contains(child);
    },

    acceptVisitor: function(visitor)
    {
        visitor.visitScene(this);
        // assume root node will always qualify
        this._rootNode.acceptVisitor(visitor);
    },

    get entityEngine()
    {
        return this._entityEngine;
    },

    get worldBounds()
    {
        return this._rootNode.worldBounds;
    }
};