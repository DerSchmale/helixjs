HX.Primitive =
{
    _ATTRIBS: function()
    {
        this.positions = [];
        this.uvs = null;
        this.normals = null;
        this.indices = [];
    },

    define: function()
    {
        var type = function(definition) {
            definition = definition || {};

            var data = type.createMeshData(definition);

            var modelData = new HX.ModelData();
            modelData.addMeshData(data);
            HX.Model.call(this, modelData);
        };

        type.prototype = Object.create(HX.Model.prototype);

        type.createMeshData = function(definition)
        {
            var attribs = new HX.Primitive._ATTRIBS();
            var uvs = definition.uvs === undefined? true : definition.uvs;
            var normals = definition.normals === undefined? true : definition.normals;
            var tangents = definition.tangents === undefined? true : definition.tangents;

            var data = new HX.MeshData();
            data.addVertexAttribute('hx_position', 3);

            if (normals) {
                data.addVertexAttribute('hx_normal', 3);
                attribs.normals = [];
            }

            if (tangents)
                data.addVertexAttribute('hx_tangent', 4);

            if (uvs) {
                data.addVertexAttribute('hx_texCoord', 2);
                attribs.uvs = [];
            }

            type._generate(attribs, definition);

            var scaleU = definition.scaleU || 1;
            var scaleV = definition.scaleV || 1;

            var len = attribs.positions.length / 3;
            var v = 0, v2 = 0, v3 = 0;
            var vertices = [];

            for (var i = 0; i < len; ++i) {
                vertices[v++] = attribs.positions[v3];
                vertices[v++] = attribs.positions[v3 + 1];
                vertices[v++] = attribs.positions[v3 + 2];

                if (normals) {
                    vertices[v++] = attribs.normals[v3];
                    vertices[v++] = attribs.normals[v3 + 1];
                    vertices[v++] = attribs.normals[v3 + 2];
                }

                if (tangents)
                    v += 4;

                if (uvs) {
                    vertices[v++] = attribs.uvs[v2++] * scaleU;
                    vertices[v++] = attribs.uvs[v2++] * scaleV;
                }

                v3 += 3;
            }

            data.setVertexData(vertices, 0);
            data.setIndexData(attribs.indices);

            var mode = 0;

            // if data isn't provided, generate it manually
            if (normals && attribs.normals.length === 0)
                mode |= HX.NormalTangentGenerator.MODE_NORMALS;

            if (tangents)
                mode |= HX.NormalTangentGenerator.MODE_TANGENTS;

            if (mode) {
                var generator = new HX.NormalTangentGenerator();
                generator.generate(data, mode);
            }

            return data;
        };

        type.createMesh = function definition(definition) {
            var data = type.createMeshData(definition);
            return new HX.Mesh(data);
        };

        return type;
    }
};