HX.NormalTangentGenerator = function()
{
    this._meshData = null;
    this._mode = 0;
    this._positionOffset = 0;
    this._normalOffset = 0;
    this._tangentOffset = 0;
    this._faceNormals = null;
    this._faceTangents = null;
};

HX.NormalTangentGenerator.MODE_NORMALS = 1;
HX.NormalTangentGenerator.MODE_TANGENTS = 2;

HX.NormalTangentGenerator.prototype =
{
    generate: function(meshData, mode, useFaceWeights)
    {
        if (useFaceWeights === undefined) useFaceWeights = true;
        this._mode = mode === undefined? HX.NormalTangentGenerator.MODE_NORMALS | HX.NormalTangentGenerator.MODE_TANGENTS : mode;

        this._meshData = meshData;

        // strides are currently all the same, but it's to make future transitions to multiple vertex buffers easier
        this._positionOffset = meshData.getVertexAttribute("hx_position").offset;
        this._normalOffset = meshData.getVertexAttribute("hx_normal").offset;
        this._tangentOffset = meshData.getVertexAttribute("hx_tangent").offset;
        this._uvOffset = meshData.getVertexAttribute("hx_texCoord").offset;
        this._positionStride = meshData.getVertexAttribute("hx_position").stride;
        this._normalStride = meshData.getVertexAttribute("hx_normal").stride;
        this._tangentStride = meshData.getVertexAttribute("hx_tangent").stride;
        this._uvStride = meshData.getVertexAttribute("hx_texCoord").stride;

        this._calculateFaceVectors(useFaceWeights);
        this._calculateVertexVectors();
    },

    _calculateFaceVectors: function(useFaceWeights)
    {
        var numIndices = this._meshData._indexData.length;

        if ((this._mode & HX.NormalTangentGenerator.MODE_NORMALS) != 0) this._faceNormals = new Array(numIndices);
        if ((this._mode & HX.NormalTangentGenerator.MODE_TANGENTS) != 0) this._faceTangents = new Array(numIndices);

        var temp = new HX.Float4();
        var v0 = new HX.Float4();
        var v1 = new HX.Float4();
        var v2 = new HX.Float4();
        var uv0 = new HX.Float2();
        var uv1 = new HX.Float2();
        var uv2 = new HX.Float2();

        for (var i = 0; i < numIndices; i += 3) {
            this._getFloat3At(i, this._positionOffset, this._positionStride, v0);
            this._getFloat3At(i + 1, this._positionOffset, this._positionStride, v1);
            this._getFloat3At(i + 2, this._positionOffset, this._positionStride, v2);
            this._getFloat2At(i, this._uvOffset, this._uvStride, uv0);
            this._getFloat2At(i + 1, this._uvOffset, this._uvStride, uv1);
            this._getFloat2At(i + 2, this._uvOffset, this._uvStride, uv2);

            if (this._faceNormals) {
                v1.subtract(v0);
                v2.subtract(v0);
                temp.cross(v1, v2);

                if (!useFaceWeights) temp.normalize();

                this._faceNormals[i] = temp.x;
                this._faceNormals[i + 1] = temp.y;
                this._faceNormals[i + 2] = temp.z;
            }

            if (this._faceTangents) {
                //var div = ((uv1.x - uv0.x)*(uv2.y - uv0.y) - (uv1.y - uv0.y)*(uv2.x - uv0.x));
                v1.scale(uv2.y - uv0.y);
                v2.scale(uv1.y - uv0.y);
                temp.difference(v1, v2);
                temp.normalize();
                //temp.scale(1.0 / div);

                this._faceTangents[i] = temp.x;
                this._faceTangents[i + 1] = temp.y;
                this._faceTangents[i + 2] = temp.z;
            }
        }
    },

    _calculateVertexVectors: function()
    {
        this._zeroVectors();

        var indexData = this._meshData._indexData;
        var vertexData = this._meshData._vertexData;
        var numIndices = indexData.length;

        for (var i = 0; i < numIndices; ++i) {
            var index = indexData[i];
            var normalIndex = this._normalOffset + index * this._normalStride;
            var tangentIndex = this._tangentOffset + index * this._tangentStride;
            var faceIndex = Math.floor(i / 3) * 3;

            if (this._faceNormals) {
                vertexData[normalIndex] += this._faceNormals[faceIndex];
                vertexData[normalIndex + 1] += this._faceNormals[faceIndex + 1];
                vertexData[normalIndex + 2] += this._faceNormals[faceIndex + 2];
            }

            if (this._faceTangents) {
                vertexData[tangentIndex] += this._faceTangents[faceIndex];
                vertexData[tangentIndex + 1] += this._faceTangents[faceIndex + 1];
                vertexData[tangentIndex + 2] += this._faceTangents[faceIndex + 2];
            }
            tangentIndex += this._tangentStride;
        }

        this._normalize();
    },

    _zeroVectors: function()
    {
        var vertexData = this._meshData._vertexData;
        var numVertices = vertexData.length / this._positionStride;
        var normalIndex = this._normalOffset;
        var tangentIndex = this._tangentOffset;

        for (var i = 0; i < numVertices; ++i) {
            if (this._mode & HX.NormalTangentGenerator.MODE_NORMALS) {
                vertexData[normalIndex] = 0.0;
                vertexData[normalIndex + 1] = 0.0;
                vertexData[normalIndex + 2] = 0.0;
            }
            if (this._mode & HX.NormalTangentGenerator.MODE_TANGENTS) {
                vertexData[tangentIndex] = 0.0;
                vertexData[tangentIndex + 1] = 0.0;
                vertexData[tangentIndex + 2] = 0.0;
            }
            normalIndex += this._normalStride;
            tangentIndex += this._tangentStride;
        }
    },

    _normalize: function()
    {
        var vertexData = this._meshData._vertexData;
        var numVertices = vertexData.length / this._positionStride;
        var normalIndex  = this._normalOffset;
        var tangentIndex  = this._tangentOffset;
        var normal = new HX.Float4();
        var tangent = new HX.Float4();

        for (var i = 0; i < numVertices; ++i) {
            normal.x = vertexData[normalIndex];
            normal.y = vertexData[normalIndex + 1];
            normal.z = vertexData[normalIndex + 2];
            tangent.x = vertexData[tangentIndex];
            tangent.y = vertexData[tangentIndex + 1];
            tangent.z = vertexData[tangentIndex + 2];

            if (this._mode & HX.NormalTangentGenerator.MODE_NORMALS) {
                normal.normalize();
                vertexData[normalIndex] = normal.x;
                vertexData[normalIndex + 1] = normal.y;
                vertexData[normalIndex + 2] = normal.z;
            }
            if (this._mode & HX.NormalTangentGenerator.MODE_TANGENTS) {
                tangent.normalize();
                vertexData[tangentIndex] = tangent.x;
                vertexData[tangentIndex + 1] = tangent.y;
                vertexData[tangentIndex + 2] = tangent.z;
            }

            normalIndex += this._normalStride;
            tangentIndex += this._tangentStride;
        }
    },

    _getFloat3At: function(i, offset, stride, target)
    {
        var indices = this._meshData._indexData;
        var posIndex = offset + indices[i] * stride;
        target.x = this._meshData._vertexData[posIndex];
        target.y = this._meshData._vertexData[posIndex + 1];
        target.z = this._meshData._vertexData[posIndex + 2];
    },

    _getFloat2At: function(i, offset, stride, target)
    {
        var indices = this._meshData._indexData;
        var posIndex = offset + indices[i] * stride;
        target.x = this._meshData._vertexData[posIndex];
        target.y = this._meshData._vertexData[posIndex + 1];
    }
};