import {Primitive} from "./Primitive";

/**
 * @classdesc
 * TorusPrimitive provides a primitive cylinder {@linkcode Model}.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of horizontal segments</li>
 *     <li>numSegmentsH: The amount of vertical segments </li>
 *     <li>radius: The radius of the torus</li>
 *     <li>tubeRadius: The radius of the torus's tube</li>
 *     <li>invert: Whether or not the faces should point inwards</li>
 *     <li>doubleSided: Whether or not the faces should point both ways</li>
 *     <li>alignment: The axes along which to orient the torus. One of {@linkcode TorusPrimitive#ALIGN_XZ}, {@linkcode TorusPrimitive#ALIGN_XY}, {@linkcode TorusPrimitive#ALIGN_YZ}</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function TorusPrimitive(definition)
{
    Primitive.call(this, definition);
}

TorusPrimitive.prototype = Object.create(Primitive.prototype);

TorusPrimitive.ALIGN_XZ = 1;
TorusPrimitive.ALIGN_XY = 2;
TorusPrimitive.ALIGN_YZ = 3;

TorusPrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var numSegmentsW = definition.numSegmentsW || 15;
    var numSegmentsH = definition.numSegmentsH || 20;
    var radius = definition.radius || .5;
    var tubeRadius = definition.tubeRadius || .1;
    var alignment = definition.alignment || TorusPrimitive.ALIGN_XZ;

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
                case TorusPrimitive.ALIGN_XZ:
                    positions.push(tx * rad, py  * tubeRadius, tz * rad);

                    if (normals)
                        normals.push(tx * px, py, tz * px);

                    break;
                case TorusPrimitive.ALIGN_XY:
                    positions.push(-tx * rad, tz * rad, py  * tubeRadius);

                    if (normals)
                        normals.push(-tx * px, tz * px, py);
                    break;
                case TorusPrimitive.ALIGN_YZ:
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

export { TorusPrimitive};