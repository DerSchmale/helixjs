HX.TorusPrimitive = HX.Primitive.define();

HX.TorusPrimitive.ALIGN_XZ = 1;
HX.TorusPrimitive.ALIGN_XY = 2;
HX.TorusPrimitive.ALIGN_YZ = 3;

HX.TorusPrimitive._generate = function(target, definition)
{
    definition = definition || {};
    var numSegmentsW = definition.numSegmentsW || 15;
    var numSegmentsH = definition.numSegmentsH || 20;
    var radius = definition.radius || .5;
    var tubeRadius = definition.tubeRadius || .1;
    var alignment = definition.alignment || HX.PlanePrimitive.ALIGN_XZ;

    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    for (var poloidalSegment = 0; poloidalSegment <= numSegmentsH; ++poloidalSegment) {
        var ratioV = poloidalSegment * rcpNumSegmentsH;
        var theta = ratioV * Math.PI * 2.0;
        var px = Math.cos(theta);
        var py = Math.sin(theta);

        for (var toroidalSegment = 0; toroidalSegment <= numSegmentsW; ++toroidalSegment) {
            var ratioU = toroidalSegment * rcpNumSegmentsW;
            var phi = ratioU * Math.PI * 2.0;
            var tx = Math.cos(phi);
            var tz = Math.sin(phi);
            var rad = radius + px  * tubeRadius;

            switch(alignment) {
                case HX.TorusPrimitive.ALIGN_XZ:
                    positions.push(tx * rad, py  * tubeRadius, tz * rad);

                    if (normals)
                        normals.push(tx * px, py, tz * px);

                    break;
                case HX.TorusPrimitive.ALIGN_XY:
                    positions.push(-tx * rad, tz * rad, py  * tubeRadius);

                    if (normals)
                        normals.push(-tx * px, tz * px, py);
                    break;
                case HX.TorusPrimitive.ALIGN_YZ:
                    positions.push(py  * tubeRadius, -tx * rad, tz * rad);

                    if (normals)
                        normals.push(py, -tx * px, tz * px);
                    break;

                default:
                    // nothing

            }

            if (uvs)
                uvs.push(ratioU, 1.0 - ratioV);
        }
    }

    var indices = target.indices;

    for (var polarSegment = 0; polarSegment < numSegmentsH; ++polarSegment) {
        for (var azimuthSegment = 0; azimuthSegment < numSegmentsW; ++azimuthSegment) {
            var w = numSegmentsW + 1;
            var base = azimuthSegment + polarSegment*w;

            indices.push(base, base + w, base + w + 1);
            indices.push(base, base + w + 1, base + 1);

            if (doubleSided) {
                indices.push(base, base + w + 1, base + w);
                indices.push(base, base + 1, base + w + 1);
            }
        }
    }
};