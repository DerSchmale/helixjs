import {Mesh} from "./Mesh";
import {MeshData} from "./MeshData";

var ScanlineMesh = {
    create: function(screenHeight)
    {
        var data = new MeshData();
        data.addVertexAttribute('hx_position', 2);

        var pixelHeight = 2.0 / screenHeight;
        var vertices = [];
        var indices = [];
        var indexBase = 0;

        // only draw on odd rows
        for (var y = 0; y < screenHeight; y += 2) {
            var base = y / screenHeight * 2.0 - 1.0;
            var top = base + pixelHeight;

            vertices.push(
                -1, top,
                1, top,
                1, base,
                -1, base
            );

            indices.push(indexBase, indexBase + 1, indexBase + 2, indexBase, indexBase + 2, indexBase + 3);

            indexBase += 4;
        }

        data.setVertexData(vertices, 0);
        data.setIndexData(indices);

        return new Mesh(data);
    }
};

export { ScanlineMesh };