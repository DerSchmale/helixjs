HX.MeshBatch = {
    create: function(sourceMeshData, numInstances)
    {
        var target = HX.MeshData.createDefaultBatchEmpty();
        var targetVertices = [];
        var targetIndices = [];
        var sourceVertices = sourceMeshData._vertexData;
        var sourceIndices = sourceMeshData._indexData;
        var len = sourceVertices.length;
        var indexIndex = 0;
        var vertexIndex = 0;

        target.vertexUsage = sourceMeshData.vertexUsage;
        target.indexUsage = sourceMeshData.vertexUsage;

        for (var i = 0; i < numInstances; ++i) {
            var indexOffset = vertexIndex / HX.MeshData.DEFAULT_BATCHED_VERTEX_SIZE;
            len = sourceVertices.length;
            var j = 0;
            while (j < len) {
                for (var k = 0; k < HX.MeshData.DEFAULT_VERTEX_SIZE; ++k)
                    targetVertices[vertexIndex++] = sourceVertices[j++];

                targetVertices[vertexIndex++] = i;
            }

            len = sourceIndices.length;
            for (j = 0; j < len; ++j)
                targetIndices[indexIndex++] = sourceIndices[j] + indexOffset;
        }

        target.setVertexData(targetVertices);
        target.setIndexData(targetIndices);

        return target;
    }
};