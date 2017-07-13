import {Mesh} from "./Mesh";

/**
 * RectMesh is a util that allows creating Mesh objects for rendering 2D quads. Generally, use RectMesh.DEFAULT for
 * full-screen quads.
 *
 * @author derschmale <http://www.derschmale.com>
 */
export var RectMesh = {
    create: function()
    {
        var mesh = new Mesh();
        mesh.addVertexAttribute("hx_position", 2);
        mesh.addVertexAttribute("hx_texCoord", 2);
        mesh.setVertexData([-1, 1, 0, 1,
            1, 1, 1, 1,
            1, -1, 1, 0,
            -1, -1, 0, 0], 0);
        mesh.setIndexData([0, 1, 2, 0, 2, 3]);
        return mesh;
    },

    _initDefault: function()
    {
        RectMesh.DEFAULT = RectMesh.create();
    }
};