/**
 * Provide a definition with the property names to automatically build a primitive. Properties provided in the definition
 * are the same as the setter names (without get/set).
 * @param definition
 * @constructor
 */
HX.PlanePrimitive = {};

HX.PlanePrimitive.ALIGN_XZ = 1;
HX.PlanePrimitive.ALIGN_XY = 2;
HX.PlanePrimitive.ALIGN_YZ = 3;

HX.PlanePrimitive.create = function(definition)
{
    definition = definition || {};
    var alignment = definition.alignment || HX.PlanePrimitive.ALIGN_XZ;
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || 1;
    var width = definition.width || 1;
    var height = definition.height || 1;
    var scaleU = definition.scaleU || 1;
    var scaleV = definition.scaleV || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var VERTEX_SIZE = HX.MeshData.DEFAULT_VERTEX_SIZE;
    var data = new HX.MeshData.createDefaultEmpty();

    var numIndices = numSegmentsH*numSegmentsW * 6;
    var numVertices = (numSegmentsH + 1)*(numSegmentsW + 1);

    if (doubleSided) {
        numIndices *= 2;
        numVertices *= 2;
    }

    var vertices = new Array(numVertices * VERTEX_SIZE);
    var indices = new Array(numIndices);

    var vertexIndex = 0;
    var indexIndex = 0;
    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var posX = 0, posY = 0, posZ = 0;
    var normalX = 0, normalY = 0, normalZ = 0;
    var tangentX = 0, tangentY = 0, tangentZ = 0;
    var bitangentX = 0, bitangentY = 0, bitangentZ = 0;
    var uvU = 0, uvV = 0;

    if (alignment == HX.PlanePrimitive.ALIGN_XY) {
        normalZ = -1;
        tangentX = 1;
        bitangentY = 1;
    }
    else if (alignment == HX.PlanePrimitive.ALIGN_XZ) {
        normalY = 1;
        tangentX = -1;
        bitangentZ = 1;
    }
    else {
        normalX = 1;
        tangentZ = 1;
        bitangentY = 1;
    }

    for (var yi = 0; yi <= numSegmentsH; ++yi) {
        var y = (yi*rcpNumSegmentsH - .5)*height;

        for (var xi = 0; xi <= numSegmentsW; ++xi) {
            var x = (xi*rcpNumSegmentsW - .5)*width;

            if (alignment == HX.PlanePrimitive.ALIGN_XY) {
                posX = x;
                posY = y;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }
            else if (alignment == HX.PlanePrimitive.ALIGN_XZ) {
                posX = x;
                posZ = y;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }
            else {
                posY = y;
                posZ = x;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }

            uvU *= scaleU;
            uvV *= scaleV;

            vertices[vertexIndex] = posX; vertices[vertexIndex + 1] = posY; vertices[vertexIndex + 2] = posZ;
            vertices[vertexIndex + 3] = normalX; vertices[vertexIndex + 4] = normalY; vertices[vertexIndex + 5] = normalZ;
            vertices[vertexIndex + 6] = tangentX; vertices[vertexIndex + 7] = tangentY; vertices[vertexIndex + 8] = tangentZ;
            vertices[vertexIndex + 9] = bitangentX; vertices[vertexIndex + 10] = bitangentY; vertices[vertexIndex + 11] = bitangentZ;
            vertices[vertexIndex + 12] = uvU; vertices[vertexIndex + 13] = uvV;

            vertexIndex += VERTEX_SIZE;

            // add vertex with same position, but with inverted normal & tangent
            if (doubleSided) {
                vertices[vertexIndex] = posX; vertices[vertexIndex + 1] = posY; vertices[vertexIndex + 2] = posZ;
                vertices[vertexIndex + 3] = -normalX; vertices[vertexIndex + 4] = -normalY; vertices[vertexIndex + 5] = -normalZ;
                vertices[vertexIndex + 6] = -tangentX; vertices[vertexIndex + 7] = -tangentY; vertices[vertexIndex + 8] = -tangentZ;
                vertices[vertexIndex + 9] = bitangentX; vertices[vertexIndex + 10] = bitangentY; vertices[vertexIndex + 11] = bitangentZ;
                vertices[vertexIndex + 12] = 1.0 - uvU; vertices[vertexIndex + 13] = uvV;

                vertexIndex += VERTEX_SIZE;
            }

            if (xi != numSegmentsW && yi != numSegmentsH) {
                var w = numSegmentsW + 1;
                var base = xi + yi*w;
                var mult = doubleSided ? 1 : 0;

                indices[indexIndex] = base << mult;
                indices[indexIndex + 1] = (base + w) << mult;
                indices[indexIndex + 2] = (base + w + 1) << mult;
                indices[indexIndex + 3] = base << mult;
                indices[indexIndex + 4] = (base + w + 1) << mult;
                indices[indexIndex + 5] = (base + 1) << mult;

                indexIndex += 6;

                if(doubleSided) {
                    indices[indexIndex] = ((base + w + 1) << mult) + 1;
                    indices[indexIndex + 1] = ((base + w) << mult) + 1;
                    indices[indexIndex + 2] = (base << mult) + 1;
                    indices[indexIndex + 3] = ((base + 1) << mult) + 1;
                    indices[indexIndex + 4] = ((base + w + 1) << mult) + 1;
                    indices[indexIndex + 5] = (base << mult) + 1;
                    indexIndex += 6;
                }
            }
        }
    }

    data.setVertexData(vertices);
    data.setIndexData(indices);

    var modelData = new HX.ModelData();
    modelData.addMeshData(data);

    return new HX.Model(modelData);
};