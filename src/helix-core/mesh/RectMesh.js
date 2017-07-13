import {Mesh} from "./Mesh";

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