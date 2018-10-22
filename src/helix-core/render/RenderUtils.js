import {GL} from "../core/GL";

// @author derschmale <http://www.derschmale.com>

/**
 * @param renderer The actual renderer doing the rendering.
 * @param passType
 * @param renderItems
 * @param data (optional) depending on the type of pass being rendered, data could contain extra stuff to be injected
 * For example. Dynamic dir lights will use this
 * @returns The index for the first unrendered renderItem in the list
 * @ignore
 */
export function renderPass(renderer, camera, passType, renderItems, data)
{
    var len = renderItems.length;
    var activePass = null;

    for(var i = 0; i < len; ++i) {
        var renderItem = renderItems[i];
        var material = renderItem.material;
        var pass = material.getPass(passType);
        if (!pass) continue;
        var meshInstance = renderItem.meshInstance;

        if (pass !== activePass) {
            pass.updatePassRenderState(camera, renderer, data);
            activePass = pass;
        }

		pass.updateInstanceRenderState(camera, renderItem, data);
		meshInstance.updateRenderState(passType);

        var mesh = meshInstance._mesh;
        var numInstances = meshInstance.numInstances;

        if (numInstances === undefined)
            GL.drawElements(mesh.elementType, mesh._numIndices, mesh._indexType, 0);
        else
			GL.drawElementsInstanced(mesh.elementType, mesh._numIndices, mesh._indexType, 0, numInstances);
    }

    GL.setBlendState(null);
    return len;
}