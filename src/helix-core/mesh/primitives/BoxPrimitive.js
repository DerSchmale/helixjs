/**
 * @constructor
 */
HX.BoxPrimitive = {};

HX.BoxPrimitive._createMeshData = function(definition)
{
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || definition.numSegmentsW || 1;
    var numSegmentsD = definition.numSegmentsD || definition.numSegmentsW || 1;
    var width = definition.width || 1;
    var height = definition.height || width;
    var depth = definition.depth || width;
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

    var vertexStride = data.getVertexStride(0);

    var vertices = [];
    var indices = [];

    var NUM_FACES = 6;

    var oppositeVertexIndex;
    var vertexIndex = 0;
    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var rcpNumSegmentsD = 1/numSegmentsD;
    var halfW = width * .5;
    var halfH = height * .5;
    var halfD = depth * .5;

    // front and back
    oppositeVertexIndex = vertexIndex + (numSegmentsW + 1)*(numSegmentsH + 1) * vertexStride;

    for (var hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        var ratioV = hSegment * rcpNumSegmentsH;
        var y = height * ratioV - halfH;
        if (flipSign < 0) ratioV = 1.0 - ratioV;

        for (var wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            var ratioU = wSegment * rcpNumSegmentsW;
            var x = width * ratioU - halfW;

            if (flipSign < 0) ratioU = 1.0 - ratioU;

            // front and back
            vertices[vertexIndex++] = x*flipSign;
            vertices[vertexIndex++] = y*flipSign;
            vertices[vertexIndex++] = halfD*flipSign;

            vertices[oppositeVertexIndex++] = -x*flipSign;
            vertices[oppositeVertexIndex++] = y*flipSign;
            vertices[oppositeVertexIndex++] = -halfD*flipSign;


            if (normals) {
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = 1;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = -1;
            }

            if (tangents) {
                vertices[vertexIndex++] = 1;
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = 1;
                vertices[oppositeVertexIndex++] = -1;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = 1;
            }

            if (uvs) {
                vertices[vertexIndex++] = ratioU*scaleU;
                vertices[vertexIndex++] = ratioV*scaleV;
                vertices[oppositeVertexIndex++] = ratioU*scaleU;
                vertices[oppositeVertexIndex++] = ratioV*scaleV;
            }
        }
    }

    vertexIndex = oppositeVertexIndex;
    oppositeVertexIndex = vertexIndex + (numSegmentsD + 1)*(numSegmentsH + 1) * vertexStride;

    for (var hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        var ratioV = hSegment * rcpNumSegmentsH;
        var y = height * ratioV - halfH;

        for (var dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
            var ratioU = dSegment * rcpNumSegmentsD;
            var z = depth * ratioU - halfD;

            // left and right
            vertices[vertexIndex++] = -halfW;
            vertices[vertexIndex++] = y;
            vertices[vertexIndex++] = z*flipSign;
            vertices[oppositeVertexIndex++] = halfW;
            vertices[oppositeVertexIndex++] = y;
            vertices[oppositeVertexIndex++] = -z*flipSign;

            if (normals) {
                vertices[vertexIndex++] = -flipSign;
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = flipSign;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = 0;
            }

            if (tangents) {
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = flipSign;
                vertices[vertexIndex++] = 1;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = -flipSign;
                vertices[oppositeVertexIndex++] = 1;
            }

            if (uvs) {
                vertices[vertexIndex++] = ratioU*scaleU;
                vertices[vertexIndex++] = ratioV*scaleV;
                vertices[oppositeVertexIndex++] = ratioU*scaleU;
                vertices[oppositeVertexIndex++] = ratioV*scaleV;
            }
        }
    }

    vertexIndex = oppositeVertexIndex;
    oppositeVertexIndex = vertexIndex + (numSegmentsW + 1)*(numSegmentsD + 1) * vertexStride;

    for (var dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
        var ratioV = dSegment * rcpNumSegmentsD;
        var z = depth * ratioV - halfD;

        for (var wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            var ratioU = wSegment * rcpNumSegmentsW;
            var x = width * ratioU - halfW;

            // top and bottom
            vertices[vertexIndex++] = x;
            vertices[vertexIndex++] = halfH;
            vertices[vertexIndex++] = -z*flipSign;
            vertices[oppositeVertexIndex++] = x;
            vertices[oppositeVertexIndex++] = -halfH;
            vertices[oppositeVertexIndex++] = z*flipSign;

            if (normals) {
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = flipSign;
                vertices[vertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = -flipSign;
                vertices[oppositeVertexIndex++] = 0;
            }

            if (tangents) {
                vertices[vertexIndex++] = 1;
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = 0;
                vertices[vertexIndex++] = 1;
                vertices[oppositeVertexIndex++] = 1;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = 0;
                vertices[oppositeVertexIndex++] = 1;
            }

            if (uvs) {
                vertices[vertexIndex++] = ratioU * scaleU;
                vertices[vertexIndex++] = ratioV * scaleV;
                vertices[oppositeVertexIndex++] = ratioU * scaleU;
                vertices[oppositeVertexIndex++] = ratioV * scaleV;
            }
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
            indexIndex += 6;
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