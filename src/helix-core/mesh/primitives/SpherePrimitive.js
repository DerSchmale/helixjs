HX.SpherePrimitive = HX.Primitive.define();

HX.SpherePrimitive._generate = function(target, definition)
{
    definition = definition || {};
    var numSegmentsW = definition.numSegmentsW || 16;
    var numSegmentsH = definition.numSegmentsH || 10;
    var radius = definition.radius || .5;

    var flipSign = definition.invert? -1 : 1;

    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;

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
            positions.push(normalX*radius, normalY*radius, normalZ*radius);

            if (normals)
                normals.push(normalX * flipSign, normalY * flipSign, normalZ * flipSign);

            if (uvs)
                uvs.push(ratioU, ratioV);
        }
    }

    var indices = target.indices;

    for (polarSegment = 0; polarSegment < numSegmentsH; ++polarSegment) {
        for (azimuthSegment = 0; azimuthSegment < numSegmentsW; ++azimuthSegment) {
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