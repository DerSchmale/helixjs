/**
 * @constructor
 */
HX.BoxPrimitive = {};

HX.BoxPrimitive._createMeshData = function(definition)
{
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || 1;
    var numSegmentsD = definition.numSegmentsD || 1;
    var width = definition.width || 1;
    var height = definition.height || width;
    var depth = definition.depth || width;
    var scaleU = definition.scaleU || 1;
    var scaleV = definition.scaleV || 1;
    var flipSign = definition.invert? -1 : 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var VERTEX_SIZE = HX.MeshData.DEFAULT_VERTEX_SIZE;
    var data = new HX.MeshData();
    data.addVertexAttribute('hx_position', 3);

    var NUM_FACES = 6;

    var vertices = [];
    var indices = [];

    var oppositeVertexIndex;
    var vertexIndex = 0;
    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var rcpNumSegmentsD = 1/numSegmentsD;
    var halfW = width * .5;
    var halfH = height * .5;
    var halfD = depth * .5;

    // front and back
    oppositeVertexIndex = vertexIndex + (numSegmentsW + 1)*(numSegmentsH + 1) * VERTEX_SIZE;

    for (var hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        var ratioV = hSegment * rcpNumSegmentsH;
        var y = height * ratioV - halfH;
        if (flipSign < 0) ratioV = 1.0 - ratioV;

        for (var wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            var ratioU = wSegment * rcpNumSegmentsW;
            var x = width * ratioU - halfW;

            if (flipSign < 0) ratioU = 1.0 - ratioU;

            // front
            vertices[vertexIndex] = x*flipSign; vertices[vertexIndex + 1] = y*flipSign; vertices[vertexIndex + 2] = halfD*flipSign;
            vertices[vertexIndex + 3] = 0; vertices[vertexIndex + 4] = 0; vertices[vertexIndex + 5] = 1;
            vertices[vertexIndex + 6] = 1; vertices[vertexIndex + 7] = 0; vertices[vertexIndex + 8] = 0; vertices[vertexIndex + 9] = 1;
            vertices[vertexIndex + 10] = ratioU*scaleU; vertices[vertexIndex + 11] = ratioV*scaleV;

            // back
            vertices[oppositeVertexIndex] = -x*flipSign; vertices[oppositeVertexIndex + 1] = y*flipSign; vertices[oppositeVertexIndex + 2] = -halfD*flipSign;
            vertices[oppositeVertexIndex + 3] = 0; vertices[oppositeVertexIndex + 4] = 0; vertices[oppositeVertexIndex + 5] = -1;
            vertices[oppositeVertexIndex + 6] = -1; vertices[oppositeVertexIndex + 7] = 0; vertices[oppositeVertexIndex + 8] = 0; vertices[vertexIndex + 9] = 1;
            vertices[oppositeVertexIndex + 10] = ratioU*scaleU; vertices[oppositeVertexIndex + 11] = ratioV*scaleV;

            vertexIndex += VERTEX_SIZE;
            oppositeVertexIndex += VERTEX_SIZE;
        }
    }

    vertexIndex = oppositeVertexIndex;
    oppositeVertexIndex = vertexIndex + (numSegmentsD + 1)*(numSegmentsH + 1) * VERTEX_SIZE;

    for (var hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        var ratioV = hSegment * rcpNumSegmentsH;
        var y = height * ratioV - halfH;

        for (var dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
            var ratioU = dSegment * rcpNumSegmentsD;
            var z = depth * ratioU - halfD;

            // left
            vertices[vertexIndex] = -halfW; vertices[vertexIndex + 1] = y; vertices[vertexIndex + 2] = z*flipSign;
            vertices[vertexIndex + 3] = -flipSign; vertices[vertexIndex + 4] = 0; vertices[vertexIndex + 5] = 0;
            vertices[vertexIndex + 6] = 0; vertices[vertexIndex + 7] = 0; vertices[vertexIndex + 8] = flipSign; vertices[vertexIndex + 9] = 1;
            vertices[vertexIndex + 10] = ratioU*scaleU; vertices[vertexIndex + 11] = ratioV*scaleV;

            // right
            vertices[oppositeVertexIndex] = halfW; vertices[oppositeVertexIndex + 1] = y; vertices[oppositeVertexIndex + 2] = -z*flipSign;
            vertices[oppositeVertexIndex + 3] = flipSign; vertices[oppositeVertexIndex + 4] = 0; vertices[oppositeVertexIndex + 5] = 0;
            vertices[oppositeVertexIndex + 6] = 0; vertices[oppositeVertexIndex + 7] = 0; vertices[oppositeVertexIndex + 8] = -flipSign; vertices[vertexIndex + 9] = 1;
            vertices[oppositeVertexIndex + 10] = ratioU*scaleU; vertices[oppositeVertexIndex + 11] = ratioV*scaleV;

            vertexIndex += VERTEX_SIZE;
            oppositeVertexIndex += VERTEX_SIZE;
        }
    }

    vertexIndex = oppositeVertexIndex;
    oppositeVertexIndex = vertexIndex + (numSegmentsW + 1)*(numSegmentsD + 1) * VERTEX_SIZE;

    for (var dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
        var ratioV = dSegment * rcpNumSegmentsD;
        var z = depth * ratioV - halfD;

        for (var wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            var ratioU = wSegment * rcpNumSegmentsW;
            var x = width * ratioU - halfW;

            // top
            vertices[vertexIndex] = x; vertices[vertexIndex + 1] = halfH; vertices[vertexIndex + 2] = -z*flipSign;
            vertices[vertexIndex + 3] = 0; vertices[vertexIndex + 4] = flipSign; vertices[vertexIndex + 5] = 0;
            vertices[vertexIndex + 6] = 1; vertices[vertexIndex + 7] = 0; vertices[vertexIndex + 8] = 0; vertices[vertexIndex + 9] = 1;
            vertices[vertexIndex + 10] = ratioU*scaleU; vertices[vertexIndex + 11] = ratioV*scaleV;

            // bottom
            vertices[oppositeVertexIndex] = x; vertices[oppositeVertexIndex + 1] = -halfH; vertices[oppositeVertexIndex + 2] = z*flipSign;
            vertices[oppositeVertexIndex + 3] = 0; vertices[oppositeVertexIndex + 4] = -flipSign; vertices[oppositeVertexIndex + 5] = 0;
            vertices[oppositeVertexIndex + 6] = 1; vertices[oppositeVertexIndex + 7] = 0; vertices[oppositeVertexIndex + 8] = 0; vertices[vertexIndex + 9] = 1;
            vertices[oppositeVertexIndex + 10] = ratioU*scaleU; vertices[oppositeVertexIndex + 11] = ratioV*scaleV;

            vertexIndex += VERTEX_SIZE;
            oppositeVertexIndex += VERTEX_SIZE;
        }
    }

    var offset = 0;
    var indexIndex = 0;
    for (var face = 0; face < NUM_FACES; ++face) {
        // order:
        // front, back, left, right, bottom, top
        var numSegmentsU = face == 2 || face == 3? numSegmentsD : numSegmentsW;
        var numSegmentsV = face == 4 || face == 5? numSegmentsD : numSegmentsH;

        for (var yi = 0; yi < numSegmentsV; ++yi) {
            for (var xi = 0; xi < numSegmentsU; ++xi) {
                var w = numSegmentsU + 1;
                var base = offset + xi + yi*w;

                indices[indexIndex] = base;
                indices[indexIndex + 1] = base + w + 1;
                indices[indexIndex + 2] = base + w;
                indices[indexIndex + 3] = base;
                indices[indexIndex + 4] = base + 1;
                indices[indexIndex + 5] = base + w + 1;

                indexIndex += 6;
            }
        }
        offset += (numSegmentsU + 1) * (numSegmentsV + 1);
    }

    if (doubleSided) {
        var i = 0;

        while (i < indexIndex) {
            indices[indexIndex + i] = indices[i];
            indices[indexIndex + i + 1] = indices[i + 2];
            indices[indexIndex + i + 2] = indices[i + 1];
            indices[indexIndex + i + 3] = indices[i + 3];
            indices[indexIndex + i + 4] = indices[i + 5];
            indices[indexIndex + i + 5] = indices[i + 4];
            i += 6;
        }
    }

    data.setVertexData(vertices, 0);
    data.setIndexData(indices);
    return data;
};

HX.BoxPrimitive.createMesh = function(definition)
{
    var data = HX.BoxPrimitive._createMeshData(definition);
    return new HX.Mesh(data);
};

HX.BoxPrimitive.create = function(definition)
{
    definition = definition || {};

    var data = HX.BoxPrimitive._createMeshData(definition);

    var modelData = new HX.ModelData();
    modelData.addMeshData(data);

    return new HX.Model(modelData);
};