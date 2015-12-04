HX.OBJLoader =
{
    load: function (filename, onComplete, onFail, groupsAsObjects)
    {
        var objParser = new HX.OBJParser();
        var groupNode = new HX.GroupNode();

        var path = HX.FileUtils.extractPath(filename);

        var urlLoader = new HX.URLLoader();

        urlLoader.onComplete = function (data)
        {
            objParser.parse(data, groupNode, path, onComplete, onFail, groupsAsObjects);
        };

        urlLoader.onError = function (code)
        {
            console.warn("Failed loading " + filename + ". Error code: " + code);
            if (onFail) onFail(code);
        };

        urlLoader.load(filename);

        return groupNode;
    }
};

/**
 *
 * @constructor
 */
HX.OBJParser = function()
{
    this._objects = [];
    this._vertices = [];
    this._normals = [];
    this._uvs = [];
    this._hasNormals = false;
    this._materialLib = null;
    this._defaultMaterial = new HX.PBRMaterial();
    this._onComplete = null;
    this._target = null;
    this._mtlLibFile = null;
};

HX.OBJParser.prototype =
{
    parse: function(data, target, path, onComplete, onFail, groupsAsObjects)
    {
        this._groupsAsObjects = groupsAsObjects === undefined? true : this._groupsAsObjects;
        this._onComplete = onComplete;
        this._target = target;

        var lines = data.split("\n");
        var numLines = lines.length;

        this._pushNewObject("hx_default");

        for (var i = 0; i < numLines; ++i) {
            var line = lines[i].replace(/^\s+|\s+$/g, "");
            this._parseLine(line, path);
        }

        if (this._mtlLibFile)
            this._loadMTLLib(path + this._mtlLibFile, onFail);
        else
            this._finish();
    },

    _finish: function()
    {
        this._translate();

        if (this._onComplete) this._onComplete();
    },

    _loadMTLLib: function(filename, onFail)
    {
        var urlLoader = new HX.URLLoader();
        var mtlParser = new HX.MTLParser();
        var self = this;

        urlLoader.onComplete = function (data)
        {
            self._materialLib = mtlParser.parse(data, HX.FileUtils.extractPath(filename));
            self._finish();
        };

        urlLoader.onError = function (code)
        {
            console.warn("Failed loading " + filename + ". Error code: " + code);
            if (onFail) onFail(code);
        };

        urlLoader.load(filename);
    },

    _parseLine: function(line)
    {
        // skip line
        if (line.length === 0 || line.charAt(0) === "#") return;
        var tokens = line.split(/\s+/);

        switch (tokens[0].toLowerCase()) {
            case "mtllib":
                this._mtlLibFile = tokens[1];
                break;
            case "usemtl":
                this._setActiveSubGroup(tokens[1]);
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
                this._pushNewObject(tokens[1]);
                break;
            case "g":
                if (this._groupsAsObjects)
                    this._pushNewObject(tokens[1]);
                else
                    this._pushNewGroup(tokens[1]);

                break;
            case "f":
                this._parseFaceData(tokens);
                break;
            default:
                // ignore following tags:
                // s
                console.log("OBJ tag ignored or unsupported: " + tokens[0]);
        }
    },

    _pushNewObject: function(name)
    {
        this._activeObject = new HX.OBJParser.ObjectData();
        this._objects.push(this._activeObject);
        this._pushNewGroup("hx_default");
    },

    _pushNewGroup: function(name)
    {
        this._activeGroup = new HX.OBJParser.GroupData();
        this._activeGroup.name = name || "Group" + this._activeGroup.length;

        this._activeObject.groups.push(this._activeGroup);
        this._setActiveSubGroup("hx_default");
    },

    _setActiveSubGroup: function(name)
    {
        this._activeGroup.subgroups[name] = this._activeGroup.subgroups[name] || new HX.OBJParser.SubGroupData();
        this._activeSubGroup = this._activeGroup.subgroups[name];
    },

    _parseFaceData: function(tokens)
    {
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

        this._activeSubGroup.faces.push(face);
        this._activeSubGroup.numIndices += tokens.length === 4 ? 3 : 6;
    },

    _translate: function()
    {
        var numObjects = this._objects.length;
        for (var i = 0; i < numObjects; ++i) {
            this._translateObject(this._objects[i]);
        }
    },

    _translateObject: function(object)
    {
        var numGroups = object.groups.length;
        if (numGroups === 0) return;
        var modelData = new HX.ModelData();
        var materials = [];
        var model = new HX.Model();

        for (var i = 0; i < numGroups; ++i) {
            var group = object.groups[i];

            for (var key in group.subgroups)
            {
                if (group.subgroups.hasOwnProperty(key)) {
                    var subgroup = group.subgroups[key];
                    if (subgroup.numIndices === 0) continue;
                    modelData.addMeshData(this._translateMeshData(subgroup));

                    var material = this._materialLib? this._materialLib[key] : null;
                    material = material || this._defaultMaterial;
                    materials.push(material);
                }
            }
        }

        model._setModelData(modelData);

        var modelInstance = new HX.ModelInstance(model, materials);
        modelInstance.name = object.name;
        this._target.attach(modelInstance);
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

            if (numVerts === 4) {
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

HX.OBJParser.SubGroupData = function()
{
    this.numIndices = 0;
    this.faces = [];    // <FaceData>
};

HX.OBJParser.GroupData = function()
{
    this.subgroups = [];
    this.name = "";    // <FaceData>
    this._activeMaterial = null;
};

HX.OBJParser.ObjectData = function()
{
    this.name = "";
    this.groups = [];
    this._activeGroup = null;
}

/**
 *
 * @constructor
 */
HX.MTLParser = function()
{
    this._materials = [];
    this._textures = [];
};

HX.MTLParser.prototype =
{
    parse: function(data, path)
    {
        var lines = data.split("\n");
        var numLines = lines.length;

        for (var i = 0; i < numLines; ++i) {
            var line = lines[i].replace(/^\s+|\s+$/g, "");
            this._parseLine(line, path);
        }

        return this._materials;
    },

    _parseLine: function(line, path)
    {
        // skip line
        if (line.length === 0 || line.charAt(0) === "#") return;
        var tokens = line.split(/\s+/);

        switch (tokens[0].toLowerCase()) {
            case "newmtl":
                this._activeMaterial = new HX.PBRMaterial();
                this._materials[tokens[1]] = this._activeMaterial;
                break;
            case "ns":
                var specularPower = parseFloat(tokens[1]);
                this._activeMaterial.roughness = Math.sqrt(2.0/(specularPower + 2.0));
                break;
            case "kd":
                this._activeMaterial.color = new HX.Color(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
                break;
            case "map_kd":
                this._activeMaterial.colorMap = this._getTexture(path + tokens[1]);
                break;
            case "map_d":
                this._activeMaterial.maskMap = this._getTexture(path + tokens[1]);
                this._activeMaterial.alphaThreshold = .5;
                break;
            case "map_ns":
                this._activeMaterial.specularMap = this._getTexture(path + tokens[1]);
                break;
            case "map_bump":
            case "bump":
                this._activeMaterial.normalMap = this._getTexture(path + tokens[1]);
                break;
            default:
                console.log("MTL tag ignored or unsupported: " + tokens[0]);
        }
    },

    _getTexture: function(url)
    {
        this._textures[url] = this._textures[url] || HX.Texture2DLoader.load(url);
        return this._textures[url];
    }
};