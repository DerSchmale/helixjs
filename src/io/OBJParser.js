/**
 *
 * @constructor
 */
HX.OBJParser = function()
{
    this._groupData = [];
    this._vertices = [];
    this._normals = [];
    this._uvs = [];
    this._modelData = null;
    this._hasNormals = false;
};

HX.OBJParser.prototype =
{
    // must yield ModelData after load
    dataType: function() { return HX.URLLoader.DATA_TEXT; },

    parse: function(data, onComplete)
    {
        var lines = data.split("\n");
        var numLines = lines.length;

        this._pushNewGroup("default");

        for (var line = 0; line < numLines; ++line) {
            this._parseLine(lines[line]);
        }

        this._translateModelData();
        onComplete(this._modelData);
    },

    _parseLine: function(line)
    {
        // skip line
        if (line.length == 0 || line.charAt(0) == "#") return;
        var tokens = line.split(" ");

        switch (tokens[0]) {
            // ignore mtllib for now
            case "usemtl":
                this._pushNewGroup();
                break;
            case "v":
                this._vertices.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
                break;
            case "vt":
                this._uvs.push(parseFloat(tokens[1]), parseFloat(tokens[2]));
                break;
            case "vn":
                this._normals.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
                break;
            case "o":
                this._pushNewGroup(tokens[1]);
                break;
            case "g":
                this._pushNewGroup(tokens[1]);
                break;
            case "f":
                this._parseFaceData(tokens);
                break;
            default:
                // ignore following tags:
                // mtllib, g, s
                console.log("OBJ tag ignored or unsupported: " + tokens[0]);
                break;
        }
    },

    _pushNewGroup: function(name)
    {
        this._activeGroup = new HX.OBJParser.GroupData();
        this._activeGroup.name = name || "Group"+this._groupData.length;
        this._groupData.push(this._activeGroup);
    },

    _parseFaceData: function(tokens)
    {
        // TODO: if numVertices > limit, start new group with same name
        var face = new HX.OBJParser.FaceData();
        var numTokens = tokens.length;

        for (var i = 1; i < numTokens; ++i) {
            var faceVertexData = new HX.OBJParser.FaceVertexData();
            face.vertices.push(faceVertexData);

            var indices = tokens[i].split("/");
            var index = (indices[0] - 1) * 3;

            faceVertexData.posX = this._vertices[index];
            faceVertexData.posY = this._vertices[index + 1];
            faceVertexData.posZ = this._vertices[index + 2];

            if(indices.length > 1) {
                index = (indices[1] - 1) * 2;

                faceVertexData.uvU = this._uvs[index];
                faceVertexData.uvV = this._uvs[index + 1];

                if (indices.length > 2) {
                    index = (indices[2] - 1) * 3;
                    this._hasNormals = true;
                    faceVertexData.normalX = this._normals[index];
                    faceVertexData.normalY = this._normals[index + 1];
                    faceVertexData.normalZ = this._normals[index + 2];
                }
            }
        }

        this._activeGroup.faces.push(face);
        this._activeGroup.numIndices += tokens.length == 4 ? 3 : 6;
    },

    _translateModelData: function()
    {
        this._modelData = new HX.ModelData();
        var numGroups = this._groupData.length;

        for (var i = 0; i < numGroups; ++i) {
            var group = this._groupData[i];
            if (group.numIndices == 0) continue;

            this._modelData.addMeshData(this._translateMeshData(group));
        }
    },

    _translateMeshData: function(group)
    {
        var meshData = HX.MeshData.createDefaultEmpty();
        var realIndices = [];
        var indices = new Array(group.numIndices);
        var numVertices = 0;
        var currentIndex = 0;

        var faces = group.faces;
        var numFaces = faces.length;
        for (var i = 0; i < numFaces; ++i) {
            var face = faces[i];

            var faceVerts = face.vertices;
            var numVerts = faceVerts.length;

            for (var j = 0; j < numVerts; ++j) {
                var vert = faceVerts[j];
                var hash = vert.getHash();
                if (!realIndices.hasOwnProperty(hash)) {
                    realIndices[hash] = {index: numVertices++, vertex: vert};
                }

            }

            indices[currentIndex] = realIndices[faceVerts[0].getHash()].index;
            indices[currentIndex+1] = realIndices[faceVerts[1].getHash()].index;
            indices[currentIndex+2] = realIndices[faceVerts[2].getHash()].index;
            currentIndex += 3;

            if (numVerts == 4) {
                indices[currentIndex] = realIndices[faceVerts[0].getHash()].index;
                indices[currentIndex+1] = realIndices[faceVerts[2].getHash()].index;
                indices[currentIndex+2] = realIndices[faceVerts[3].getHash()].index;
                currentIndex += 3;
            }
        }

        var vertices = new Array(numVertices * HX.MeshData.DEFAULT_VERTEX_SIZE);

        for (var hash in realIndices) {
            if (!realIndices.hasOwnProperty(hash)) continue;
            var data = realIndices[hash];
            var vertex = data.vertex;
            var index = data.index * HX.MeshData.DEFAULT_VERTEX_SIZE;

            vertices[index] = vertex.posX;
            vertices[index+1] = vertex.posY;
            vertices[index+2] = vertex.posZ;
            vertices[index+3] = vertex.normalX;
            vertices[index+4] = vertex.normalY;
            vertices[index+5] = vertex.normalZ;
            vertices[index+6] = 0;
            vertices[index+7] = 0;
            vertices[index+8] = 0;
            vertices[index+9] = 1;
            vertices[index+10] = vertex.uvU;
            vertices[index+11] = vertex.uvV;
        }

        meshData.setVertexData(vertices);
        meshData.setIndexData(indices);

        var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
        if (!this._hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
        var generator = new HX.NormalTangentGenerator();
        generator.generate(meshData, mode, true);
        return meshData;
    }
};

HX.ModelParser.registerParser("obj", HX.OBJParser);

HX.OBJParser.FaceVertexData = function()
{
    this.posX = 0;
    this.posY = 0;
    this.posZ = 0;
    this.uvU = 0;
    this.uvV = 0;
    this.normalX = 0;
    this.normalY = 0;
    this.normalZ = 0;
    this._hash = "";
};

HX.OBJParser.FaceVertexData.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash)
            this._hash = this.posX + "/" + this.posY + "/" + this.posZ + "/" + this.uvU + "/" + this.uvV + "/" + this.normalX + "/" + this.normalY + "/" + this.normalZ + "/";

        return this._hash;
    }
};

HX.OBJParser.FaceData = function()
{
    this.vertices = []; // <FaceVertexData>
};

HX.OBJParser.GroupData = function()
{
    this.numIndices = 0;
    this.faces = [];    // <FaceData>
    this.name = "";    // <FaceData>
};