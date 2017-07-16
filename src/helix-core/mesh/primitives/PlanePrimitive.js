import {Primitive} from "./Primitive";

/**
 * @classdesc
 * PlanePrimitive provides a primitive plane {@linkcode Model}.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of horizontal segments</li>
 *     <li>numSegmentsH: The amount of vertical segments </li>
 *     <li>width: The width of the plane</li>
 *     <li>height: The height of the plane</li>
 *     <li>doubleSided: Whether or not the faces should point both ways</li>
 *     <li>alignment: The axes along which to orient the plane. One of {@linkcode PlanePrimitive#ALIGN_XZ}, {@linkcode PlanePrimitive#ALIGN_XY}, {@linkcode PlanePrimitive#ALIGN_YZ}</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PlanePrimitive(definition)
{
    Primitive.call(this, definition);
}

PlanePrimitive.prototype = Object.create(Primitive.prototype);

PlanePrimitive.ALIGN_XZ = 1;
PlanePrimitive.ALIGN_XY = 2;
PlanePrimitive.ALIGN_YZ = 3;

PlanePrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var alignment = definition.alignment || PlanePrimitive.ALIGN_XZ;
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || 1;
    var width = definition.width || 1;
    var height = definition.height || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var posX = 0, posY = 0, posZ = 0;
    var normalX = 0, normalY = 0, normalZ = 0;
    var uvU = 0, uvV = 0;

    if (alignment === PlanePrimitive.ALIGN_XY)
        normalZ = -1;
    else if (alignment === PlanePrimitive.ALIGN_XZ)
        normalY = 1;
    else
        normalX = 1;

    for (var yi = 0; yi <= numSegmentsH; ++yi) {
        var y = (yi*rcpNumSegmentsH - .5)*height;

        for (var xi = 0; xi <= numSegmentsW; ++xi) {
            var x = (xi*rcpNumSegmentsW - .5)*width;

            if (alignment === PlanePrimitive.ALIGN_XY) {
                posX = x;
                posY = y;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }
            else if (alignment === PlanePrimitive.ALIGN_XZ) {
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

            positions.push(posX, posY, posZ);

            if (normals)
                normals.push(normalX, normalY, normalZ);

            if (uvs)
                uvs.push(uvU, uvV);

            // add vertex with same position, but with inverted normal & tangent
            if (doubleSided) {
                positions.push(posX, posY, posZ);

                if (normals)
                    normals.push(-normalX, -normalY, -normalZ);

                if (uvs)
                    uvs.push(1.0 - uvU, uvV);
            }

            if (xi !== numSegmentsW && yi !== numSegmentsH) {
                var w = numSegmentsW + 1;
                var base = xi + yi*w;
                var mult = doubleSided ? 1 : 0;

                indices.push(base << mult, (base + w) << mult, (base + w + 1) << mult);
                indices.push(base << mult, (base + w + 1) << mult, (base + 1) << mult);

                if(doubleSided) {
                    indices.push(((base + w + 1) << mult) + 1, ((base + w) << mult) + 1, (base << mult) + 1);
                    indices.push(((base + 1) << mult) + 1, ((base + w + 1) << mult) + 1, (base << mult) + 1);
                }
            }
        }
    }
};

export {PlanePrimitive };