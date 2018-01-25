import {Primitive} from "./Primitive";

/**
 * @classdesc
 * WireBoxPrimitive provides a primitive box {@linkcode Model} to use with line types, useful for debugging.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>width: The width of the box</li>
 *     <li>height: The height of the box</li>
 *     <li>depth: The depth of the box</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function WireBoxPrimitive(definition)
{
    Primitive.call(this, definition);
}

WireBoxPrimitive.prototype = Object.create(Primitive.prototype);

WireBoxPrimitive.prototype._generate = function(target, definition)
{
    var width = definition.width || 1;
    var height = definition.height || width;
    var depth = definition.depth || width;

    var halfW = width * .5;
    var halfH = height * .5;
    var halfD = depth * .5;

    var positions = target.positions;
    var indices = target.indices;

    positions.push(-halfW, -halfD, -halfH);
    positions.push(halfW, -halfD, -halfH);
    positions.push(-halfW, -halfD, halfH);
    positions.push(halfW, -halfD, halfH);

    positions.push(-halfW, halfD, -halfH);
    positions.push(halfW, halfD, -halfH);
    positions.push(-halfW, halfD, halfH);
    positions.push(halfW, halfD, halfH);

    indices.push(0, 1);
    indices.push(2, 3);
    indices.push(0, 2);
    indices.push(1, 3);

    indices.push(4, 5);
    indices.push(6, 7);
    indices.push(4, 6);
    indices.push(5, 7);

    indices.push(0, 4);
    indices.push(2, 6);
    indices.push(1, 5);
    indices.push(3, 7);
};

export { WireBoxPrimitive };