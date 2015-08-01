HX.RectMesh = {};

HX.RectMesh.create = function()
{
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 2);
    data.addVertexAttribute('hx_texCoord', 2);
    data.setVertexData([-1, 1, 0, 1,
                        1, 1, 1, 1,
                        1, -1, 1, 0,
                        -1, -1, 0, 0]);
    data.setIndexData([0, 1, 2, 0, 2, 3]);
    return new HX.Mesh(data);
}