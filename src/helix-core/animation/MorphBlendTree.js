HX.MorphBlendTree = function()
{
    // there's a root node per mesh instance
    this._rootNodes = [];
};

HX.MorphBlendTree.prototype =
{
    getPositionsTexture: function(meshIndex)
    {
        var node = this._rootNodes[meshIndex];
        return node? node.positionTexture : null;
    },

    setRootNode: function(meshIndex, rootNode)
    {
        this._rootNodes[meshIndex] = rootNode;

        if (rootNode) {
            var mesh = this.entity.getMeshInstance(meshIndex).mesh;

            if (!mesh.hasMorphData)
                throw new Error("Trying to add vertex morphing for a mesh without morph data!");

            rootNode.setMesh(mesh);
        }
        else {
            this._textures[meshIndex] = null;
        }
    },

    update: function(dt)
    {
        for (var i = 0; i < this._rootNodes.length; ++i) {
            if (this._rootNodes[i])
                this._rootNodes[i].update(dt);

            HX.setRenderTarget(this._textures[i].positionFBO);
            HX.clear();
        }
    }
};
