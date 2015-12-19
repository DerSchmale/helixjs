// Could also create an ASCII deserializer
HX.FBXGeometryConverter = function()
{
    this._perMaterialData = null;
    this._matrix = null;
    this._expandedMesh = null;
    this._vertexStride = 0;
    this._ctrlPointLookUp = null;
    this._model = null;
};

HX.FBXGeometryConverter.prototype =
{
    // to be called after convertToModel
    createModelInstance: function(materials)
    {
        var expandedMaterials = [];

        var len = this._modelMaterialIDs.length;
        for (var i = 0; i < len; ++i) {
            expandedMaterials[i] = materials[this._modelMaterialIDs[i]];
        }

        return new HX.ModelInstance(this._model, expandedMaterials);
    },

    convertToModel: function(fbxMesh, matrix)
    {
        this._matrix = matrix;

        this._perMaterialData = [];
        this._ctrlPointLookUp = [];
        this._modelMaterialIDs = [];

        this._generateExpandedMeshData(fbxMesh);

        this._vertexStride = HX.MeshData.DEFAULT_VERTEX_SIZE;
        //if (this._expandedMesh.hasColor)
        //    this._vertexStride += 3;

        this._splitPerMaterial();
        this._generateModel();
        this._model.name = fbxMesh.name;
    },

    _generateExpandedMeshData: function(fbxMesh)
    {
        this._expandedMesh = new HX.FBXGeometryConverter._ExpandedMesh();
        var indexData = fbxMesh.indices;
        var vertexData = fbxMesh.vertices;
        var normalData, uvData, materialData;
        var layerElements = fbxMesh.layerElements;
        if (layerElements) {
            normalData = layerElements["Normals"];
            //colorData = layerElements["Colors"];
            uvData = layerElements["UV"];
            materialData = layerElements["Materials"];
        }

        var vertices = [];
        var polyIndex = 0;
        var maxMaterialIndex = 0;

        if (normalData) this._expandedMesh.hasNormals = true;
        //if (colorData) this._expandedMesh.hasColor = true;
        if (uvData) this._expandedMesh.hasUVs = true;

        var len = indexData.length;

        for (var i = 0; i < len; ++i) {
            var index = indexData[i];
            var v = new HX.FBXGeometryConverter._Vertex();

            if (index < 0) {
                index = -index - 1;
                v.lastVertex = true;
            }

            // is index the control point, referred to by animations?
            v.pos.x = vertexData[index * 3];
            v.pos.y = vertexData[index * 3 + 1];
            v.pos.z = vertexData[index * 3 + 2];
            v.ctrlPointIndex = index;   // if these indices are different, they are probably triggered differerently in animations

            if (normalData) v.normal = this._extractLayerData(normalData, index, i, 3);
            //if (colorData) v.color = this._extractLayerData(colorData, index, i, 3);
            if (uvData) v.uv = this._extractLayerData(uvData, index, i, 2);

            if (materialData && materialData.mappingInformationType !== HX.FbxLayerElement.MAPPING_TYPE.ALL_SAME) {
                var matIndex = materialData.indexData[polyIndex];
                v.materialIndex = matIndex;
                if (matIndex > maxMaterialIndex)
                    maxMaterialIndex = matIndex;
            }

            if (v.lastVertex)
                ++polyIndex;

            vertices[i] = v;
        }

        this._expandedMesh.vertices = vertices;
        this._expandedMesh.numMaterials = maxMaterialIndex + 1;
    },

    _extractLayerData: function (layer, index, i, numComponents)
    {
        var target = numComponents > 2? new HX.Float4() : new HX.Float2();
        // direct
        if (layer.referenceInformationType === HX.FbxLayerElement.REFERENCE_TYPE.DIRECT) {
            var directIndex = layer.mappingInformationType === HX.FbxLayerElement.MAPPING_TYPE.BY_CONTROL_POINT? index : i;
            target.x = layer.directData[directIndex * numComponents];
            target.y = layer.directData[directIndex * numComponents + 1];
            if (numComponents > 2)
                target.z = layer.directData[directIndex * numComponents + 2];
        }
        // index to direct
        else {
            var directIndex = layer.mappingInformationType === HX.FbxLayerElement.MAPPING_TYPE.BY_CONTROL_POINT? layer.indexData[index] : layer.indexData[i];
            target.x = layer.directData[directIndex * numComponents];
            target.y = layer.directData[directIndex * numComponents + 1];
            if (numComponents > 2)
                target.z = layer.directData[directIndex * numComponents + 2];
        }
        return target;
    },

    _splitPerMaterial: function()
    {
        for (var i = 0; i < this._expandedMesh.numMaterials; ++i)
            this._perMaterialData[i] = new HX.FBXGeometryConverter._PerMaterialData();

        // todo: change this expansion
        var i = 0, j = 0;
        var vertexData = this._expandedMesh.vertices;
        var len = vertexData.length;
        var realIndex0, realIndex1, realIndex2;
        var startNewBatch = true;

        // triangulate
        while (i < len) {
            var data = this._perMaterialData[vertexData[i].materialIndex];
            if (!data.vertices) startNewBatch = true;
            // start as startNewBatch, so we push the current list on the stack
            if (startNewBatch) {
                startNewBatch = false;
                data.indexCounter = 0;
                data.indices = [];
                data.vertices = [];
                data.ctrlPointIndices = [];
                data.indexLookUp = {};
                data.indexStack.push(data.indices);
                data.vertexStack.push(data.vertices);
                data.ctrlPointStack.push(data.ctrlPointIndices);
            }

            // for everything: i = control point index

            realIndex0 = this._getOrAddIndex(vertexData[i]);
            if (realIndex0 < 0) {
                startNewBatch = true;
                continue;
            }
            realIndex1 = this._getOrAddIndex(vertexData[i + 1]);
            if (realIndex1 < 0) {
                startNewBatch = true;
                continue;
            }

            i += 2;

            var v2;

            do {
                v2 = vertexData[i];
                realIndex2 = this._getOrAddIndex(v2);

                if (realIndex2 < 0) {
                    startNewBatch = true;
                }
                else {
                    ++i;

                    var indices = this._perMaterialData[v2.materialIndex].indices;
                    indices[j] = realIndex0;
                    indices[j + 1] = realIndex1;
                    indices[j + 2] = realIndex2;

                    j += 3;
                    realIndex1 = realIndex2;
                }
            } while (!v2.lastVertex && !startNewBatch);
        }
    },

    // returns negative if overflow is detected
    _getOrAddIndex: function(v)
    {
        var hash = v.getHash();
        var data = this._perMaterialData[v.materialIndex];
        var indexLookUp = data.indexLookUp;

        if (indexLookUp.hasOwnProperty(hash))
            return indexLookUp[hash];

        if (data.indexCounter > 65535) return -1;

        var vertices = data.vertices;
        // new unique vertex!
        var k = data.indexCounter * this._vertexStride;
        var realIndex = data.indexCounter++;

        data.ctrlPointIndices[realIndex] = v.ctrlPointIndex;

        indexLookUp[hash] = realIndex;

        // position
        vertices[k] = v.pos.x;
        vertices[k + 1] = v.pos.y;
        vertices[k + 2] = v.pos.z;

        // normal
        if (this._expandedMesh.hasNormals) {
            vertices[k + 3] = v.normal.x;
            vertices[k + 4] = v.normal.y;
            vertices[k + 5] = v.normal.z;
        }
        else
            vertices[k + 3] = vertices[k + 4] = vertices[k + 5] = 0;

        // tangent & flipsign
        vertices[k + 6] = vertices[k + 7] = vertices[k + 8] = vertices[k + 9] = 0;

        if (this._expandedMesh.hasUVs) {
            vertices[k + 10] = v.uv.x;
            vertices[k + 11] = v.uv.y;
        }
        else
            vertices[k + 10] = vertices[k + 11] = 0;

        /*if (this._expandedMesh.hasColor) {
            vertices[k + 12] = v.color.x;
            vertices[k + 13] = v.color.y;
            vertices[k + 14] = v.color.z;
        }*/

        return realIndex;
    },

    _generateModel: function()
    {
        var modelData = new HX.ModelData();
        var meshIndex = 0;

        var numMaterials = this._expandedMesh.numMaterials;

        for (var i = 0; i < numMaterials; ++i) {
            var data = this._perMaterialData[i];

            var stackSize = data.indexStack.length;
            for (var j = 0; j < stackSize; ++j) {
                var meshData = HX.MeshData.createDefaultEmpty();
                //if (this._expandedMesh.hasColor) meshData.addVertexAttribute("hx_vertexColor", 3);
                meshData.setVertexData(data.vertexStack[j], 0);
                meshData.setIndexData(data.indexStack[j]);

                var ctrlPoints = data.ctrlPointStack[j];
                var numCtrlPoints = ctrlPoints.length;

                for (var k = 0; k < numCtrlPoints; ++k)
                    this._ctrlPointLookUp[ctrlPoints[k]] = {index: k, meshIndex: meshIndex};

                ++meshIndex;

                this._modelMaterialIDs.push(i);

                var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
                if (!this._expandedMesh.hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
                var generator = new HX.NormalTangentGenerator();
                generator.generate(meshData, mode);
                modelData.addMeshData(meshData);
            }
        }

        this._model = new HX.Model(modelData);
    }
};

HX.FBXGeometryConverter._ExpandedMesh = function()
{
    this.vertices = null;
    //this.hasColor = false;
    this.hasUVs = false;
    this.hasNormals = false;
    this.numMaterials = 0;
};

HX.FBXGeometryConverter._Vertex = function()
{
    this.pos = new HX.Float4();
    this.uv = null;
    this.normal = null;
    this.color = null;
    this.materialIndex = 0;
    this.ctrlPointIndex = -1;
    this._hash = null;

    this.lastVertex = false;
};

HX.FBXGeometryConverter._Vertex.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash) {
            var str = this.ctrlPointIndex + "/" + this.materialIndex + "/" + this.pos.x + "/" + this.pos.y + "/" + this.pos.z;

            if (this.normal)
                str = str + "/" + this.normal.x + "/" + this.normal.y + "/" + this.normal.z;

            if (this.uv)
                str = str + "/" + this.uv.x + "/" + this.uv.y;

            if (this.color)
                str = str + "/" + this.color.x + "/" + this.color.y + "/" + this.color.z;

            this._hash = str;
        }

        return this._hash;
    }
};

HX.FBXGeometryConverter._PerMaterialData = function()
{
    this.indexCounter = 0;
    this.vertexStack = [];
    this.indexStack = [];
    this.ctrlPointStack = [];
    this.vertices = null;
    this.indices = null;
    this.ctrlPointIndices = null;
    this.indexLookUp = {};
};