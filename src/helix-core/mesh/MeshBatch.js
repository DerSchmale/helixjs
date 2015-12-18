HX.MeshBatch = {
    create: function(sourceMeshData, numInstances)
    {
        var target = new HX.MeshData();
        var sourceIndices = sourceMeshData._indexData;

        target.vertexUsage = sourceMeshData.vertexUsage;
        target.indexUsage = sourceMeshData.vertexUsage;

        var attribs = sourceMeshData._vertexAttributes;
        for (var i = 0; i < attribs.length; ++i) {
            var attribute = attribs[i];
            target.addVertexAttribute(attribute.name, attribute.numComponents, sourceMeshData.streamIndex);
        }

        target.addVertexAttribute("hx_instanceID", 1, sourceMeshData.numStreams);

        var instanceData = [];
        var index = 0;
        var indexOffset = 0;
        var targetIndices = [];
        var numVertices = sourceMeshData.getVertexData(0) / sourceMeshData.getVertexStride(0);
        for (var i = 0; i < numInstances; ++i) {
            len = sourceIndices.length;
            for (j = 0; j < len; ++j)
                targetIndices[index++] = sourceIndices[j] + numVertices * i;
            indexOffset = sourceIndices[j] + 1;
        }
        target.setIndexData(targetIndices);

        for (var i = 0; i < sourceMeshData.numStreams; ++i) {
            var targetVertices = [];
            var sourceVertices = sourceMeshData.getVertexData(i);
            var len = sourceVertices.length;

            index = 0;
            len = sourceVertices.length;

            for (var i = 0; i < numInstances; ++i) {
                for (var j = 0; j < len; ++j) {
                    targetVertices[index++] = sourceVertices[i];
                }
            }

            target.setVertexData(targetVertices, i);
        }

        index = 0;
        for (var j = 0; j < numInstances; ++j) {
            for (var i = 0; i < numVertices; ++i) {
                instanceData[index++] = j;
            }
        }

        return target;
    }
};