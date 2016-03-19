/**
 * Provide a definition with the property names to automatically build a primitive. Properties provided in the definition
 * are the same as the setter names (without get/set).
 * @param definition
 * @constructor
 */
HX.SpherePrimitive = {};

HX.SpherePrimitive.createMeshData = function(definition)
{
    definition = definition || {};
    var numSegmentsW = definition.numSegmentsW || 16;
    var numSegmentsH = definition.numSegmentsH || 10;
    var radius = definition.radius || .5;
    var scaleU = definition.scaleU || 1;
    var scaleV = definition.scaleV || 1;
    var flipSign = definition.invert? -1 : 1;
    var uvs = definition.uvs === undefined? true : definition.uvs;
    var normals = definition.normals === undefined? true : definition.normals;
    var tangents = definition.tangents === undefined? true : definition.tangents;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 3);
    if (normals) data.addVertexAttribute('hx_normal', 3);
    if (tangents) data.addVertexAttribute('hx_tangent', 4);
    if (uvs) data.addVertexAttribute('hx_texCoord', 2);

    var vertices = [];
    var indices = [];

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

            // position
            vertices[vertexIndex++] = normalX*radius;
            vertices[vertexIndex++] = normalY*radius;
            vertices[vertexIndex++] = normalZ*radius;

            if (normals) {
                vertices[vertexIndex++] = normalX * flipSign;
                vertices[vertexIndex++] = normalY * flipSign;
                vertices[vertexIndex++] = normalZ * flipSign;
            }

            if (tangents) {
                vertices[vertexIndex++] = -normalZ;
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = normalX;
                vertices[vertexIndex++] = 1.0;
            }

            if (uvs) {
                vertices[vertexIndex++] = 1.0 - ratioU*scaleU;
                vertices[vertexIndex++] = ratioV*scaleV;
            }
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

                indexIndex += 6;
            }
        }
    }

    data.setVertexData(vertices, 0);
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
};