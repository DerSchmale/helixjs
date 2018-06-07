import * as HX from 'helix';

/**
 * Warning, MD5 as supported by Helix does not contain any materials nor scene graph information, so it only loads Models, not instances!
 * @constructor
 */
function MD5Mesh()
{
    HX.Importer.call(this, HX.Model);
    this._meshData = null;
    this._jointData = null;
    this._skeleton = null;
}

MD5Mesh.prototype = Object.create(HX.Importer.prototype);

MD5Mesh.prototype.parse = function(data, target)
{
    this._skeleton = new HX.Skeleton();
    this._model = target;
    this._jointData = [];

    // assuming a valid file, validation isn't our job
    var lines = data.split("\n");
    var len = lines.length;
    var lineFunction = null;

    for (var i = 0; i < len; ++i) {
        // remove leading & trailing whitespace
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        var tokens = line.split(/\s+/);

        if (tokens[0] === "//" || tokens[0] === "")
            continue;

        if (lineFunction) {
            lineFunction.call(this, tokens);
            if (tokens[0] === "}") lineFunction = null;
        }
        else switch (tokens[0]) {
            case "commandline":
            case "numMeshes":
            case "numJoints":
            case "MD5Version":
                break;
            case "joints":
                lineFunction = this._parseJoint;
                break;
            case "mesh":
                this._meshData = new MD5Mesh._MeshData();
                lineFunction = this._parseMesh;
                break;
        }
    }

    target.skeleton = this._skeleton;
    this._notifyComplete(target);
};

MD5Mesh.prototype._parseJoint = function(tokens)
{
    if (tokens[0] === "}") return;

    var jointData = new MD5Mesh._Joint();
    var pos = jointData.pos;
    var quat = jointData.quat;
    jointData.name = tokens[0].substring(1, tokens[0].length - 1);

    jointData.parentIndex = parseInt(tokens[1]);

    pos.x = parseFloat(tokens[3]);
    pos.y = parseFloat(tokens[4]);
    pos.z = parseFloat(tokens[5]);
    quat.x = parseFloat(tokens[8]);
    quat.y = parseFloat(tokens[9]);
    quat.z = parseFloat(tokens[10]);
    quat.w = 1.0 - quat.x*quat.x - quat.y*quat.y - quat.z*quat.z;
    if (quat.w < 0.0) quat.w = 0.0;
    else quat.w = -Math.sqrt(quat.w);

    this._jointData.push(jointData);

    var joint = new HX.SkeletonJoint();
    joint.inverseBindPose.fromQuaternion(quat);
    var pos = jointData.pos;
    joint.inverseBindPose.appendTranslation(pos);
    joint.inverseBindPose.invertAffine();
    joint.parentIndex = jointData.parentIndex;
    this._skeleton.addJoint(joint);
};

MD5Mesh.prototype._parseMesh = function(tokens)
{
    switch (tokens[0]) {
        case "shader":
        case "numVerts":
        case "numWeights":
            break;
        case "tri":
            this._meshData.indices.push(parseInt(tokens[2]), parseInt(tokens[4]), parseInt(tokens[3]));
            break;
        case "vert":
            this._parseVert(tokens);
            break;
        case "weight":
            this._parseWeight(tokens);
            break;
        case "}":
            this._translateMesh();
            break;
    }
};

MD5Mesh.prototype._parseVert = function(tokens)
{
    var vert = new MD5Mesh._VertexData();
    vert.u = parseFloat(tokens[3]);
    vert.v = parseFloat(tokens[4]);
    vert.startWeight = parseInt(tokens[6]);
    vert.countWeight = parseInt(tokens[7]);
    this._meshData.vertexData.push(vert);
};

MD5Mesh.prototype._parseWeight = function(tokens)
{
    var weight = new MD5Mesh._WeightData();
    weight.joint = parseInt(tokens[2]);
    weight.bias = parseFloat(tokens[3]);
    weight.pos.x = parseFloat(tokens[5]);
    weight.pos.y = parseFloat(tokens[6]);
    weight.pos.z = parseFloat(tokens[7]);
    this._meshData.weightData.push(weight);
};

MD5Mesh.prototype._translateMesh = function()
{
    var mesh = new HX.Mesh.createDefaultEmpty();
    mesh.addVertexAttribute("hx_jointIndices", 4, 1);
    mesh.addVertexAttribute("hx_jointWeights", 4, 1);
    var vertices = [];
    var anims = [];

    var vertexData = this._meshData.vertexData;
    var len = vertexData.length;
    var v = 0, a = 0;
    var x, y, z;

    for (var i = 0; i < len; ++i) {
        var vertData = vertexData[i];
        x = y = z = 0;

        if (vertData.countWeight > 4)
            console.warn("Warning: more than 4 weights assigned. Mesh will not animate correctly");

        for (var w = 0; w < vertData.countWeight; ++w) {
            var weightData = this._meshData.weightData[vertData.startWeight + w];
            var joint = this._jointData[weightData.joint];
            var vec = joint.quat.rotate(weightData.pos);
            var pos = joint.pos;
            var bias = weightData.bias;
            x += (vec.x + pos.x) * bias;
            y += (vec.y + pos.y) * bias;
            z += (vec.z + pos.z) * bias;
            // cap at 4 and hope nothing blows up
            if (w < 4) {
                anims[a + w] = weightData.joint;
                anims[a + 4 + w] = weightData.bias;
            }
        }

        vertices[v] = x;
        vertices[v + 1] = y;
        vertices[v + 2] = z;
        vertices[v + 3] = 0;
        vertices[v + 4] = 0;
        vertices[v + 5] = 1;
        vertices[v + 6] = 1;
        vertices[v + 7] = 0;
        vertices[v + 8] = 0;
        vertices[v + 9] = 1;
        vertices[v + 10] = vertData.u;
        vertices[v + 11] = 1.0 - vertData.v;

        for (var w = vertData.countWeight; w < 4; ++w) {
            anims[a + w] = 0;
            anims[a + 4 + w] = 0;
        }

        a += 8;
        v += 12;
    }

    mesh.setVertexData(vertices, 0);
    mesh.setVertexData(anims, 1);
    mesh.setIndexData(this._meshData.indices);

    var generator = new HX.NormalTangentGenerator();
    generator.generate(mesh, HX.NormalTangentGenerator.MODE_NORMALS | HX.NormalTangentGenerator.MODE_TANGENTS);
    this._model.addMesh(mesh);
};

MD5Mesh._Joint = function()
{
    this.name = null;
    this.parentIndex = -1;
    this.quat = new HX.Quaternion();
    this.pos = new HX.Float4();
};

MD5Mesh._MeshData = function()
{
    this.vertexData = [];
    this.weightData = [];
    this.indices = [];
};

MD5Mesh._VertexData = function()
{
    this.u = 0;
    this.v = 0;
    this.startWeight = 0;
    this.countWeight = 0;
};

MD5Mesh._WeightData = function()
{
    this.joint = 0;
    this.bias = 0;
    this.pos = new HX.Float4();
};

export {MD5Mesh};