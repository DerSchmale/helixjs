import * as HX from 'helix';

/**
 * The options property supports the following settings:
 * - groupsAsObjects
 * @constructor
 */
function OBJ()
{
    HX.Importer.call(this, HX.SceneNode);
    this._objects = [];
    this._vertices = [];
    this._normals = [];
    this._uvs = [];
    this._hasNormals = false;
    this._defaultMaterial = new HX.BasicMaterial();
    this._target = null;
    this._mtlLibFile = null;
}

OBJ.prototype = Object.create(HX.Importer.prototype);

OBJ.prototype.parse = function(data, target)
{
    this._groupsAsObjects = this.options.groupsAsObjects === undefined? true : this._groupsAsObjects;
    this._target = target;

    var lines = data.split("\n");
    var numLines = lines.length;

    this._pushNewObject("hx_default");

    for (var i = 0; i < numLines; ++i) {
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        this._parseLine(line);
    }

    if (this._mtlLibFile)
        this._loadMTLLib(this._mtlLibFile);
    else
        this._finish(null);
};

OBJ.prototype._finish = function(mtlLib)
{
    this._translate(mtlLib);
    this._notifyComplete(this._target);
};

OBJ.prototype._loadMTLLib = function(filename)
{
    var loader = new HX.AssetLoader(HX.MTL);
    var self = this;

    loader.onComplete = function (asset)
    {
        self._finish(asset);
    };

    loader.onFail = function (message)
    {
        self._notifyFailure(message);
    };

    loader.load(filename);
};

OBJ.prototype._parseLine = function(line)
{
    // skip line
    if (line.length === 0 || line.charAt(0) === "#") return;
    var tokens = line.split(/\s+/);

    switch (tokens[0].toLowerCase()) {
        case "mtllib":
            this._mtlLibFile = this._correctURL(tokens[1]);
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
            //console.log("OBJ tag ignored or unsupported: " + tokens[0]);
    }
};

OBJ.prototype._pushNewObject = function(name)
{
    this._activeObject = new OBJ._ObjectData();
    this._activeObject.name = name;
    this._objects.push(this._activeObject);
    this._pushNewGroup("hx_default");
};

OBJ.prototype._pushNewGroup = function(name)
{
    this._activeGroup = new OBJ._GroupData();
    this._activeGroup.name = name || "Group" + this._activeGroup.length;

    this._activeObject.groups.push(this._activeGroup);
    this._setActiveSubGroup("hx_default");
};

OBJ.prototype._setActiveSubGroup = function(name)
{
    this._activeGroup.subgroups[name] = this._activeGroup.subgroups[name] || new OBJ._SubGroupData();
    this._activeSubGroup = this._activeGroup.subgroups[name];
};

OBJ.prototype._parseFaceData = function(tokens)
{
    var face = new OBJ._FaceData();
    var numTokens = tokens.length;

    for (var i = 1; i < numTokens; ++i) {
        var faceVertexData = new OBJ._FaceVertexData();
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
};

OBJ.prototype._translate = function(mtlLib)
{
    var numObjects = this._objects.length;
    for (var i = 0; i < numObjects; ++i) {
        this._translateObject(this._objects[i], mtlLib);
    }
};

OBJ.prototype._translateObject = function(object, mtlLib)
{
    var numGroups = object.groups.length;
    if (numGroups === 0) return;
    var materials = [];
    var model = new HX.Model();

    for (var i = 0; i < numGroups; ++i) {
        var group = object.groups[i];

        for (var key in group.subgroups)
        {
            if (group.subgroups.hasOwnProperty(key)) {
                var subgroup = group.subgroups[key];
                if (subgroup.numIndices === 0) continue;
                model.addMesh(this._translateMesh(subgroup));

                var material = mtlLib? mtlLib[key] : null;
                material = material || this._defaultMaterial;
                materials.push(material);
            }
        }
    }

    var modelInstance = new HX.ModelInstance(model, materials);
    modelInstance.name = object.name;
    this._target.attach(modelInstance);
};

OBJ.prototype._translateMesh = function(group)
{
    var mesh = HX.Mesh.createDefaultEmpty();
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
            if (!realIndices.hasOwnProperty(hash))
                realIndices[hash] = {index: numVertices++, vertex: vert};
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

    var vertices = new Array(numVertices * HX.Mesh.DEFAULT_VERTEX_SIZE);

    for (var hash in realIndices) {
        if (!realIndices.hasOwnProperty(hash)) continue;
        var data = realIndices[hash];
        var vertex = data.vertex;
        var index = data.index * HX.Mesh.DEFAULT_VERTEX_SIZE;

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

    mesh.setVertexData(vertices, 0);
    mesh.setIndexData(indices);

    var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
    if (!this._hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
    var generator = new HX.NormalTangentGenerator();
    generator.generate(mesh, mode, true);
    return mesh;
};

OBJ._FaceVertexData = function()
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

OBJ._FaceVertexData.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash)
            this._hash = this.posX + "/" + this.posY + "/" + this.posZ + "/" + this.uvU + "/" + this.uvV + "/" + this.normalX + "/" + this.normalY + "/" + this.normalZ + "/";

        return this._hash;
    }
};

OBJ._FaceData = function()
{
    this.vertices = []; // <FaceVertexData>
};

OBJ._SubGroupData = function()
{
    this.numIndices = 0;
    this.faces = [];    // <FaceData>
};

OBJ._GroupData = function()
{
    this.subgroups = [];
    this.name = "";    // <FaceData>
    this._activeMaterial = null;
};

OBJ._ObjectData = function()
{
    this.name = "";
    this.groups = [];
    this._activeGroup = null;
};

export { OBJ };