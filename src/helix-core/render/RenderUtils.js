import {GL} from "../core/GL";

export var RenderUtils =
{
    /**
     * @param renderer The actual renderer doing the rendering.
     * @param passType
     * @param renderItems
     * @param data (optional) depending on the type of pass being rendered, data could contain extra stuff to be injected
     * For example. Dynamic dir lights will use this
     * @returns The index for the first unrendered renderItem in the list
     * @private
     */
    renderPass: function (renderer, passType, renderItems, data)
    {
        var len = renderItems.length;
        var activePass = null;
        var lastMesh = null;

        for(var i = 0; i < len; ++i) {
            var renderItem = renderItems[i];
            var material = renderItem.material;
            var pass = material.getPass(passType);
            if (!pass) continue;
            var meshInstance = renderItem.meshInstance;

            if (pass !== activePass) {
                material._firstPass = false;
                pass.updatePassRenderState(renderer, data);
                activePass = pass;
                lastMesh = null;    // need to reset mesh data too
            }

            // make sure renderstate is propagated
            pass.updateInstanceRenderState(renderItem.camera, renderItem, data);

            if (lastMesh !== meshInstance._mesh) {
                meshInstance.updateRenderState(passType);
                lastMesh = meshInstance._mesh;
            }

            GL.drawElements(pass._elementType, meshInstance._mesh.numIndices, 0);
        }

        if (material)
            material._firstPass = false;

        GL.setBlendState(null);
        return len;
    }
};