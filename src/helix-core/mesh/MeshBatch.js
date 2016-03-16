HX.MeshBatch = {
    create: function(sourceMeshData, numInstances)
    {
        var len, i, j;
        var target = new HX.MeshData();
        var sourceIndices = sourceMeshData._indexData;

        target.vertexUsage = sourceMeshData.vertexUsage;
        target.indexUsage = sourceMeshData.vertexUsage;

        var attribs = sourceMeshData._vertexAttributes;
        var instanceStream = sourceMeshData.numStreams;

        for (i = 0; i < attribs.length; ++i) {
            var attribute = attribs[i];
            target.addVertexAttribute(attribute.name, attribute.numComponents, attribute.streamIndex);
        }

        target.addVertexAttribute("hx_instanceID", 1, instanceStream);

        var instanceData = [];
        var targetIndices = [];
        var index = 0;
        var numVertices = sourceMeshData.numVertices;

        for (i = 0; i < numInstances; ++i) {
            len = sourceIndices.length;
            for (j = 0; j < len; ++j) {
                targetIndices[index++] = sourceIndices[j] + numVertices * i;
            }
        }

        target.setIndexData(targetIndices);

        for (i = 0; i < sourceMeshData.numStreams; ++i) {
            var targetVertices = [];
            var sourceVertices = sourceMeshData.getVertexData(i);

            len = sourceVertices.length;
            index = 0;

            // duplicate vertex data for each instance
            for (j = 0; j < numInstances; ++j) {
                for (var k = 0; k < len; ++k) {
                    targetVertices[index++] = sourceVertices[k];
                }
            }

            target.setVertexData(targetVertices, i);
        }

        index = 0;
        for (j = 0; j < numInstances; ++j) {
            for (i = 0; i < numVertices; ++i) {
                instanceData[index++] = j;
            }
        }

        target.setVertexData(instanceData, instanceStream);

        return target;
    }
};