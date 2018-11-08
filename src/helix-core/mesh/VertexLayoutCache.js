import {VertexLayout} from "./VertexLayout";
import {MaterialPass} from "../material/MaterialPass";

/**
 * VertexLayoutCache manages vertex layout objects for MeshInstances so many duplicate objects do not require a lot of
 * data, and whether or not vertex attributes need to be updated on the GPU can be limited to when the vertex layout
 * changes.
 * @ignore
 */
function VertexLayoutCache()
{
	this._cache = {};
}

VertexLayoutCache.prototype = {
	getLayouts: function(meshInstance)
	{
		// TODO: Could also have double layered cache for the whole vertexLayouts array
		var material = meshInstance._material;
		var mesh = meshInstance._mesh;

		if (!material || !mesh) return null;

		var vertexLayouts = new Array(MaterialPass.NUM_PASS_TYPES);

		for (var type = 0; type < MaterialPass.NUM_PASS_TYPES; ++type) {
			var pass = material.getPass(type);
			if (pass)
				vertexLayouts[type] = this._getLayout(mesh, pass.shader);
		}

		return vertexLayouts;
	},

	_getLayout: function(mesh, shader)
	{
		var idx = mesh._idx + "" + shader._idx;

		var layout = this._cache[idx];
		if (layout) {
			++layout.usages;
			return layout;
		}

		this._cache[idx] = layout = {
			usages: 1,
			layout: new VertexLayout(mesh, shader),
			idx: idx
		};

		return layout;
	},

	free: function(meshInstance)
	{
		var layouts = meshInstance._vertexLayouts;
		for (var type = 0; type < MaterialPass.NUM_PASS_TYPES; ++type) {
			var layout = layouts[type];
			if (layout) {
				if (--layout.usages === 0)
					delete this._cache[layout.idx];
			}
		}
	}

};

export {VertexLayoutCache}