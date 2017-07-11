import {Model} from "../Model";
import {ModelData} from "../ModelData";
import {MeshData} from "../MeshData";
import {NormalTangentGenerator} from "../../utils/NormalTangentGenerator";

function Primitive(definition)
{
    definition = definition || {};
    var data = this._createMeshData(definition);
    var modelData = new ModelData();
    modelData.addMeshData(data);
    Model.call(this, modelData);
}

Primitive._ATTRIBS = function()
{
    this.positions = [];
    this.uvs = null;
    this.normals = null;
    this.vertexColors = null;
    this.indices = [];
};

Primitive.prototype = Object.create(Model.prototype);

Primitive.prototype._generate = function(target, definition)
{
    throw new Error("Abstract method called!");
};

Primitive.prototype._createMeshData = function(definition)
{
    var attribs = new Primitive._ATTRIBS();
    var uvs = definition.uvs === undefined? true : definition.uvs;
    var normals = definition.normals === undefined? true : definition.normals;
    var tangents = definition.tangents === undefined? true : definition.tangents;
    // depends on the primitive type

    var data = new MeshData();
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

    this._generate(attribs, definition);

    var vertexColors = attribs.vertexColors;
    if (vertexColors) {
        data.addVertexAttribute('hx_vertexColor', 3);
    }

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

        if (vertexColors) {
            vertices[v++] = attribs.vertexColors[v3];
            vertices[v++] = attribs.vertexColors[v3 + 1];
            vertices[v++] = attribs.vertexColors[v3 + 2];
        }

        v3 += 3;
    }

    data.setVertexData(vertices, 0);
    data.setIndexData(attribs.indices);

    var mode = 0;

    // if data isn't provided, generate it manually
    if (normals && attribs.normals.length === 0)
        mode |= NormalTangentGenerator.MODE_NORMALS;

    if (tangents)
        mode |= NormalTangentGenerator.MODE_TANGENTS;

    if (mode) {
        var generator = new NormalTangentGenerator();
        generator.generate(data, mode);
    }

    return data;
};

export {Primitive };