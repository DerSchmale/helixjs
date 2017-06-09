HX.MorphBlendTree = function()
{
    // there's a root node per mesh instance
    this._rootNodes = [];
};

HX.MorphBlendTree.prototype =
{
    setModel: function(value)
    {
        this._model = value;
        for (var i = 0; i < this._rootNodes.length; ++i) {
            if (this._rootNodes[i])
                this._rootNodes[i].setMesh(value.getMesh(i));
        }
    },

    getValueIDs: function()
    {
        var target = [];
        for (var i = 0; i < this._rootNodes.length; ++i) {
            if (this._rootNodes[i])
                this._rootNodes[i].getValueIDs(target);
        }
        return target;
    },

    getPose: function(meshIndex)
    {
        var node = this._rootNodes[meshIndex];
        return node? node.pose : null;
    },

    getRootNode: function(meshIndex)
    {
        return this._rootNodes[meshIndex]
    },

    setRootNode: function(meshIndex, rootNode)
    {
        this._rootNodes[meshIndex] = rootNode;

        if (rootNode && this._model) {
            var mesh = this._model.getMeshInstance(meshIndex).mesh;
            rootNode.setMesh(mesh);
        }
    },

    setValue: function(id, value)
    {
        for (var i = 0; i < this._rootNodes.length; ++i)
        {
            if (this._rootNodes[i])
                this._rootNodes[i].setValue(id, value);
        }
    },

    update: function(dt)
    {
        // TODO: get an invalidation routine going, returning update() boolean like in the skeleton tree
        for (var i = 0; i < this._rootNodes.length; ++i) {
            if (this._rootNodes[i])
                this._rootNodes[i].update(dt);
        }
    }
};
