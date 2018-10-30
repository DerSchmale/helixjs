import {Primitive} from "./Primitive";

/**
 * @classdesc
 * CrossImpostorPrimitive provides a primitive {@linkcode Model} with cross-section planes. Useful for vegetation
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>width: The width of the planes</li>
 *     <li>height: The height of the planes</li>
 *     <li>numPlanes: The amount of planes to contain</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ImpostorPrimitive(definition)
{
    Primitive.call(this, definition);
}

ImpostorPrimitive.prototype = Object.create(Primitive.prototype);

/**
 * @ignore
 */
ImpostorPrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var width = definition.width || 1;
    var height = definition.height || 1;
    var numPlanes = definition.numPlanes || 2;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;
    var base = 0;

    for (var p = 0; p < numPlanes; ++p) {
        var angle = p / numPlanes * Math.PI;
        var dirX = Math.cos(angle);
        var dirY = Math.sin(angle);
        var x = dirX * width * .5;
        var y = dirY * width * .5;
        positions.push(
            -x, -y, height,
            x, y, height,
            x, y, 0,
            -x, -y, 0
        );
        uvs.push(
            0, 0,
            1, 0,
            1, 1,
            0, 1
        );
        normals.push(
            dirY, -dirX, 0,
            dirY, -dirX, 0,
            dirY, -dirX, 0,
            dirY, -dirX, 0
        );

        indices.push(base, base + 1, base + 2);
		indices.push(base, base + 2, base + 3);

		base += 4;
    }
};

export { ImpostorPrimitive };