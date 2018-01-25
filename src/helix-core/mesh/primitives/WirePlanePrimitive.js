import {Primitive} from "./Primitive";

/**
 * @classdesc
 * WirePlanePrimitive provides a primitive plane {@linkcode Model} to use with line types, useful for debugging.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of horizontal segments</li>
 *     <li>numSegmentsH: The amount of vertical segments </li>
 *     <li>width: The width of the plane</li>
 *     <li>height: The height of the plane</li>
 *     <li>alignment: The axes along which to orient the plane. One of {@linkcode WirePlanePrimitive#ALIGN_XZ}, {@linkcode WirePlanePrimitive#ALIGN_XY}, {@linkcode WirePlanePrimitive#ALIGN_YZ}</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function WirePlanePrimitive(definition)
{
    Primitive.call(this, definition);
}

WirePlanePrimitive.prototype = Object.create(Primitive.prototype);

WirePlanePrimitive.ALIGN_XZ = 1;
WirePlanePrimitive.ALIGN_XY = 2;
WirePlanePrimitive.ALIGN_YZ = 3;

WirePlanePrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var alignment = definition.alignment || WirePlanePrimitive.ALIGN_XY;
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || 1;
    var width = definition.width || 1;
    var height = definition.height || 1;

    var positions = target.positions;
    var indices = target.indices;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var posX = 0, posY = 0, posZ = 0;

    for (var yi = 0; yi <= numSegmentsH; ++yi) {
        var y = (yi*rcpNumSegmentsH - .5)*height;

        for (var xi = 0; xi <= numSegmentsW; ++xi) {
            var x = (xi*rcpNumSegmentsW - .5)*width;

            if (alignment === WirePlanePrimitive.ALIGN_XY) {
                posX = x;
                posY = y;
            }
            else if (alignment === WirePlanePrimitive.ALIGN_XZ) {
                posX = x;
                posZ = y;
            }
            else {
                posY = x;
                posZ = y;
            }

            positions.push(posX, posY, posZ);

            if (xi !== numSegmentsW && yi !== numSegmentsH) {
                var w = numSegmentsW + 1;
                var base = xi + yi*w;

                indices.push(base, base + 1);
                indices.push(base + 1, base + w + 1);
                indices.push(base + w + 1, base + w);
                indices.push(base + w, base);
            }
        }
    }
};

export { WirePlanePrimitive };