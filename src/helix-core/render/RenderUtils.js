HX.RenderUtils =
{
    /**
     * @param renderer The actual renderer doing the rendering.
     * @param passType
     * @param renderItems
     * @param transparencyMode (optional) If provided, it will only render passes with the given transparency mode
     * @returns The index for the first unrendered renderItem in the list (depending on transparencyMode)
     * @private
     */
    renderPass: function (renderer, passType, renderItems)
    {
        var len = renderItems.length;
        var activePass = null;
        var lastMesh = null;

        for(var i = 0; i < len; ++i) {
            var renderItem = renderItems[i];

            var meshInstance = renderItem.meshInstance;
            var pass = renderItem.pass;
            var shader = pass._shader;

            // make sure renderstate is propagated
            shader.updateRenderState(renderItem.camera, renderItem);

            if (pass !== activePass) {
                pass.updateRenderState(renderer);
                activePass = pass;

                lastMesh = null;    // need to reset mesh data too
            }

            if (lastMesh != meshInstance._mesh) {
                meshInstance.updateRenderState(passType);
                lastMesh = meshInstance._mesh;
            }

            HX.drawElements(pass._elementType, meshInstance._mesh.numIndices, 0);
        }

        HX.setBlendState(null);
        return len;
    }
};