HX.RenderUtils =
{
    /**
     * @param renderer The actual renderer doing the rendering.
     * @param passType
     * @param renderItems
     * @param transparencyMode (optional) If provided, it will only render passes with the given transparency mode
     * @param offsetIndex The index to start rendering.
     * @returns The index for the first unrendered renderItem in the list (depending on transparencyMode)
     * @private
     */
    renderPass: function (renderer, passType, renderItems, transparencyMode, offsetIndex)
    {
        var len = renderItems.length;
        var activePass = null;
        var lastMesh = null;
        var offsetIndex = offsetIndex || 0;

        for(var i = offsetIndex; i < len; ++i) {
            var renderItem = renderItems[i];
            var material = renderItem.material;

            if (transparencyMode !== undefined && material._transparencyMode !== transparencyMode)
                return i;

            // lighting model 0 means unlit
            var stencilValue = (material._lightingModelID << 1) | material._transparencyMode;
            HX.GL.stencilFunc(HX.GL.ALWAYS, stencilValue, 0xff);

            var meshInstance = renderItem.meshInstance;
            var pass = renderItem.pass;
            var shader = pass._shader;
            // make sure renderstate is propagated
            shader.updateRenderState(renderItem.worldMatrix, renderItem.camera);

            if (pass !== activePass) {
                HX.RenderUtils.switchPass(renderer, activePass, pass);
                activePass = pass;

                lastMesh = null;    // need to reset mesh data too
            }

            if (lastMesh != meshInstance._mesh) {
                meshInstance.updateRenderState(passType);
                lastMesh = meshInstance._mesh;
            }

            HX.GL.drawElements(pass._elementType, meshInstance._mesh.numIndices(), HX.GL.UNSIGNED_SHORT, 0);
        }

        if (activePass && activePass._blending) HX.GL.disable(HX.GL.BLEND);
        return len;
    },

    switchPass: function(renderer, oldPass, newPass)
    {
        // clean up old pass
        if (!oldPass || oldPass._cullMode !== oldPass._cullMode) {
            if (newPass._cullMode === HX.CullMode.NONE)
                HX.GL.disable(HX.GL.CULL_FACE);
            else {
                HX.GL.enable(HX.GL.CULL_FACE);
                HX.GL.cullFace(newPass._cullMode);
            }
        }

        if (!oldPass || oldPass._blending !== oldPass._blending) {
            if (newPass._blending) {
                HX.GL.enable(HX.GL.BLEND);
                HX.GL.blendFunc(newPass._blendSource, newPass._blendDest);
                HX.GL.blendEquation(newPass._blendOperator);
            }
            else
                HX.GL.disable(HX.GL.BLEND);
        }

        newPass.updateRenderState(renderer);
    }
};