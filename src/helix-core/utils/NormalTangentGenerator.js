import {Float2} from "../math/Float2";
import {Float4} from "../math/Float4";


/**
 * @classdesc
 * NormalTangentGenerator generates normal and/or tangent vectors for a {@codelink Mesh}.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function NormalTangentGenerator()
{
    this._mesh = null;
    this._mode = 0;
    this._faceNormals = null;
    this._faceTangents = null;
    this._faceBitangents = null;
}

/**
 * A bit flag to generate normal vectors
 */
NormalTangentGenerator.MODE_NORMALS = 1;

/**
 * A bit flag to generate tangent vectors
 */
NormalTangentGenerator.MODE_TANGENTS = 2;

NormalTangentGenerator.prototype =
{
    /**
     * Generates normal and/or tangent vectors for a {@codelink Mesh}.
     * @param mesh The target {@codelink Mesh}
     * @param mode Defines which vectors to use. Use {@linkcode NormalTangentGenerator.MODE_NORMALS} | {@linkcode NormalTangentGenerator.MODE_TANGENTS}
     * @param [useFaceWeights] Defines whether or not the face sizes should play a role in how much weight their contribute to the vertex normal.
     */
    generate: function(mesh, mode, useFaceWeights)
    {
        if (useFaceWeights === undefined) useFaceWeights = true;
        this._mode = mode === undefined? NormalTangentGenerator.MODE_NORMALS | NormalTangentGenerator.MODE_TANGENTS : mode;

        this._mesh = mesh;

        this._positionAttrib = mesh.getVertexAttributeByName("hx_position");
        this._normalAttrib = mesh.getVertexAttributeByName("hx_normal");
        this._tangentAttrib = mesh.getVertexAttributeByName("hx_tangent");
        this._uvAttrib = mesh.getVertexAttributeByName("hx_texCoord");
        this._positionStride = mesh.getVertexStride(this._positionAttrib.streamIndex);
        this._normalStride = mesh.getVertexStride(this._normalAttrib.streamIndex);
        this._tangentStride = mesh.getVertexStride(this._tangentAttrib.streamIndex);
        this._uvStride = mesh.getVertexStride(this._uvAttrib.streamIndex);

        this._calculateFaceVectors(useFaceWeights);
        this._calculateVertexVectors();
    },

    _calculateFaceVectors: function(useFaceWeights)
    {
        var numIndices = this._mesh._indexData.length;

        if ((this._mode & NormalTangentGenerator.MODE_NORMALS) !== 0) this._faceNormals = new Array(numIndices);
        if ((this._mode & NormalTangentGenerator.MODE_TANGENTS) !== 0) {
            this._faceTangents = new Array(numIndices);
            this._faceBitangents = new Array(numIndices);
        }

        var temp = new Float4();
        var temp1 = new Float4();
        var temp2 = new Float4();
        var v0 = new Float4();
        var v1 = new Float4();
        var v2 = new Float4();
        var uv0 = new Float2();
        var uv1 = new Float2();
        var uv2 = new Float2();
        var st1 = new Float2();
        var st2 = new Float2();

        var posOffset = this._positionAttrib.offset;
        var uvOffset = this._uvAttrib.offset;
        var posData = this._mesh.getVertexData(this._positionAttrib.streamIndex);
        var uvData = this._mesh.getVertexData(this._uvAttrib.streamIndex);

        for (var i = 0; i < numIndices; i += 3) {
            this._getFloat3At(i, posOffset, this._positionStride, v0, posData);
            this._getFloat3At(i + 1, posOffset, this._positionStride, v1, posData);
            this._getFloat3At(i + 2, posOffset, this._positionStride, v2, posData);
            this._getFloat2At(i, uvOffset, this._uvStride, uv0, uvData);
            this._getFloat2At(i + 1, uvOffset, this._uvStride, uv1, uvData);
            this._getFloat2At(i + 2, uvOffset, this._uvStride, uv2, uvData);

            v1.subtract(v0);
            v2.subtract(v0);

            if (this._faceNormals) {
                Float4.cross(v1, v2, temp);

                if (!useFaceWeights) temp.normalize();

                this._faceNormals[i] = temp.x;
                this._faceNormals[i + 1] = temp.y;
                this._faceNormals[i + 2] = temp.z;
            }

            if (this._faceTangents) {
                //var div = ((uv1.x - uv0.x)*(uv2.y - uv0.y) - (uv1.y - uv0.y)*(uv2.x - uv0.x));
                Float2.subtract(uv1, uv0, st1);
                Float2.subtract(uv2, uv0, st2);

                Float4.scale(v1, st2.y, temp1);
                Float4.scale(v2, st1.y, temp2);
                Float4.subtract(temp1, temp2, temp);

                if (temp.lengthSqr > .001)
                    temp.normalize();

                this._faceTangents[i] = temp.x;
                this._faceTangents[i + 1] = temp.y;
                this._faceTangents[i + 2] = temp.z;

                Float4.scale(v1, st2.x, temp1);
                Float4.scale(v2, st1.x, temp1);
                Float4.subtract(temp2, temp1, temp);
                // no need to normalize bitangent, just need it for orientation

                this._faceBitangents[i] = temp.x;
                this._faceBitangents[i + 1] = temp.y;
                this._faceBitangents[i + 2] = temp.z;
            }
        }
    },

    _calculateVertexVectors: function()
    {
        this._zeroVectors();

        var bitangents = this._faceTangents ? [] : null;
        var indexData = this._mesh._indexData;
        var normalOffset = this._normalAttrib.offset;
        var tangentOffset = this._tangentAttrib.offset;
        var normalData = this._mesh.getVertexData(this._normalAttrib.streamIndex);
        var tangentData = this._mesh.getVertexData(this._tangentAttrib.streamIndex);
        var numIndices = indexData.length;

        for (var i = 0; i < numIndices; ++i) {
            var index = indexData[i];
            var normalIndex = normalOffset + index * this._normalStride;
            var tangentIndex = tangentOffset + index * this._tangentStride;
            var bitangentIndex = index * 3;
            var faceIndex = Math.floor(i / 3) * 3;

            if (this._faceNormals) {
                normalData[normalIndex] += this._faceNormals[faceIndex];
                normalData[normalIndex + 1] += this._faceNormals[faceIndex + 1];
                normalData[normalIndex + 2] += this._faceNormals[faceIndex + 2];
            }

            if (this._faceTangents) {
                tangentData[tangentIndex] += this._faceTangents[faceIndex];
                tangentData[tangentIndex + 1] += this._faceTangents[faceIndex + 1];
                tangentData[tangentIndex + 2] += this._faceTangents[faceIndex + 2];

                bitangents[bitangentIndex] += this._faceBitangents[faceIndex];
                bitangents[bitangentIndex + 1] += this._faceBitangents[faceIndex + 1];
                bitangents[bitangentIndex + 2] += this._faceBitangents[faceIndex + 2];
            }
        }

        this._normalize(bitangents);
    },

    _zeroVectors: function()
    {
        var normalData = this._mesh.getVertexData(this._normalAttrib.streamIndex);
        var tangentData = this._mesh.getVertexData(this._tangentAttrib.streamIndex);
        var normalStride = this._mesh.getVertexStride(this._normalAttrib.streamIndex);
        var tangentStride = this._mesh.getVertexStride(this._tangentAttrib.streamIndex);
        var numVertices = normalData.length / normalStride;
        var normalIndex = this._normalAttrib.offset;
        var tangentIndex = this._tangentAttrib.offset;

        for (var i = 0; i < numVertices; ++i) {
            if (this._mode & NormalTangentGenerator.MODE_NORMALS) {
                normalData[normalIndex] = 0.0;
                normalData[normalIndex + 1] = 0.0;
                normalData[normalIndex + 2] = 0.0;
            }
            if (this._mode & NormalTangentGenerator.MODE_TANGENTS) {
                tangentData[tangentIndex] = 0.0;
                tangentData[tangentIndex + 1] = 0.0;
                tangentData[tangentIndex + 2] = 0.0;
            }
            normalIndex += normalStride;
            tangentIndex += tangentStride;
        }
    },

    _normalize: function(bitangents)
    {
        var normalData = this._mesh.getVertexData(this._normalAttrib.streamIndex);
        var tangentData = this._mesh.getVertexData(this._tangentAttrib.streamIndex);
        var numVertices = normalData.length / this._normalStride;
        var normalIndex = this._normalAttrib.offset;
        var tangentIndex = this._tangentAttrib.offset;
        var bitangentIndex = 0;
        var normal = new Float4();
        var tangent = new Float4();
        var bitangent = new Float4();
        var cross = new Float4();

        for (var i = 0; i < numVertices; ++i) {
            normal.x = normalData[normalIndex];
            normal.y = normalData[normalIndex + 1];
            normal.z = normalData[normalIndex + 2];

            if (this._mode & NormalTangentGenerator.MODE_NORMALS) {
                normal.normalize();
                normalData[normalIndex] = normal.x;
                normalData[normalIndex + 1] = normal.y;
                normalData[normalIndex + 2] = normal.z;
            }
            if (this._mode & NormalTangentGenerator.MODE_TANGENTS) {
                tangent.x = tangentData[tangentIndex];
                tangent.y = tangentData[tangentIndex + 1];
                tangent.z = tangentData[tangentIndex + 2];

                // can happen in singularities
                if (tangent.lengthSqr < 0.0001)
                    tangent.set(1.0, 1.0, 1.0, 1.0);
                else
                    tangent.normalize();

                bitangent.x = bitangents[bitangentIndex];
                bitangent.y = bitangents[bitangentIndex + 1];
                bitangent.z = bitangents[bitangentIndex + 2];
                Float4.cross(tangent, normal, cross);

                tangentData[tangentIndex] = tangent.x;
                tangentData[tangentIndex + 1] = tangent.y;
                tangentData[tangentIndex + 2] = tangent.z;
                tangentData[tangentIndex + 3] = Float4.dot3(bitangent, cross) > 0.0? 1.0 : -1.0;
            }

            normalIndex += this._normalStride;
            tangentIndex += this._tangentStride;
        }

        this._mesh.setVertexData(normalData, this._normalAttrib.streamIndex);
        if (this._normalAttrib.streamIndex !== this._tangentAttrib.streamIndex)
            this._mesh.setVertexData(tangentData, this._tangentAttrib.streamIndex);
    },

    _getFloat3At: function(i, offset, stride, target, data)
    {
        var indices = this._mesh._indexData;
        var posIndex = offset + indices[i] * stride;
        target.x = data[posIndex];
        target.y = data[posIndex + 1];
        target.z = data[posIndex + 2];
    },

    _getFloat2At: function(i, offset, stride, target, data)
    {
        var indices = this._mesh._indexData;
        var posIndex = offset + indices[i] * stride;
        target.x = data[posIndex];
        target.y = data[posIndex + 1];
    }
};

export { NormalTangentGenerator };