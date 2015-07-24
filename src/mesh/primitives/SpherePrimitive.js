/**
 * Provide a definition with the property names to automatically build a primitive. Properties provided in the definition
 * are the same as the setter names (without get/set).
 * @param definition
 * @constructor
 */
HX.SpherePrimitive = {};

HX.SpherePrimitive.createMeshData = function(definition)
{
    var numSegmentsW = definition.numSegmentsW || 16;
    var numSegmentsH = definition.numSegmentsH || 10;
    var radius = definition.radius || .5;
    var scaleU = definition.scaleU || 1;
    var scaleV = definition.scaleV || 1;
    var flipSign = definition.invert? -1 : 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var VERTEX_SIZE = HX.MeshData.DEFAULT_VERTEX_SIZE;
    var data = new HX.MeshData.createDefaultEmpty();

    var numIndices = numSegmentsH*numSegmentsW * 6;
    var numVertices = (numSegmentsH + 1)*(numSegmentsW + 1);

    var vertices = new Array(numVertices * VERTEX_SIZE);
    var indices = new Array(numIndices);

    var vertexIndex = 0;
    var indexIndex = 0;
    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    for (var polarSegment = 0; polarSegment <= numSegmentsH; ++polarSegment) {
        var ratioV = polarSegment * rcpNumSegmentsH;
        var theta = ratioV * Math.PI;

        var y = -Math.cos(theta);
        var segmentUnitRadius = Math.sin(theta);

        if (flipSign < 0) ratioV = 1.0 - ratioV;

        for (var azimuthSegment = 0; azimuthSegment <= numSegmentsW; ++azimuthSegment) {
            var ratioU = azimuthSegment * rcpNumSegmentsW;
            var phi = ratioU * Math.PI * 2.0;

            if (flipSign) ratioU = 1.0 - ratioU;

            var normalX = Math.cos(phi) * segmentUnitRadius * flipSign;
            var normalY = y * flipSign;
            var normalZ = Math.sin(phi) * segmentUnitRadius * flipSign;

            vertices[vertexIndex] = normalX*radius; vertices[vertexIndex + 1] = normalY*radius; vertices[vertexIndex + 2] = normalZ*radius;
            vertices[vertexIndex + 3] = normalX * flipSign; vertices[vertexIndex + 4] = normalY * flipSign; vertices[vertexIndex + 5] = normalZ * flipSign;
            vertices[vertexIndex + 6] = -normalZ; vertices[vertexIndex + 7] = 0; vertices[vertexIndex + 8] = normalX;
            vertices[vertexIndex + 9] = 1.0 - ratioU*scaleU; vertices[vertexIndex + 10] = ratioV*scaleV;

            vertexIndex += VERTEX_SIZE;
        }
    }

    for (var polarSegment = 0; polarSegment < numSegmentsH; ++polarSegment) {
        for (var azimuthSegment = 0; azimuthSegment < numSegmentsW; ++azimuthSegment) {
            var w = numSegmentsW + 1;
            var base = azimuthSegment + polarSegment*w;

            indices[indexIndex] = base;
            indices[indexIndex + 1] = base + w;
            indices[indexIndex + 2] = base + w + 1;
            indices[indexIndex + 3] = base;
            indices[indexIndex + 4] = base + w + 1;
            indices[indexIndex + 5] = base + 1;

            indexIndex += 6;

            if (doubleSided) {
                indices[indexIndex] = base;
                indices[indexIndex + 1] = base + w + 1;
                indices[indexIndex + 2] = base + w;
                indices[indexIndex + 3] = base;
                indices[indexIndex + 4] = base + 1;
                indices[indexIndex + 5] = base + w + 1;
            }
        }
    }

    data.setVertexData(vertices);
    data.setIndexData(indices);
    return data;
};

HX.SpherePrimitive.createMesh = function(definition)
{
    var data = HX.SpherePrimitive.createMeshData(definition);
    return new HX.Mesh(data);
};

HX.SpherePrimitive.create = function(definition)
{
    definition = definition || {};

    var data = HX.SpherePrimitive.createMeshData(definition);

    var modelData = new HX.ModelData();
    modelData.addMeshData(data);

    return new HX.Model(modelData);
}