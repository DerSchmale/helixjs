import {Primitive} from "./Primitive";

/**
 * @classdesc
 * CylinderPrimitive provides a primitive cylinder {@linkcode Model}.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of horizontal segments</li>
 *     <li>numSegmentsH: The amount of vertical segments </li>
 *     <li>radius: The radius of the cylinder</li>
 *     <li>height: The height of the cylinder</li>
 *     <li>doubleSided: Whether or not the faces should point both ways</li>
 *     <li>alignment: The axis along which to orient the cylinder. One of {@linkcode CylinderPrimitive#ALIGN_X}, {@linkcode CylinderPrimitive#ALIGN_Y}, {@linkcode CylinderPrimitive#ALIGN_Z}</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CylinderPrimitive(definition)
{
    Primitive.call(this, definition);
}

CylinderPrimitive.prototype = Object.create(Primitive.prototype);

/**
 * The alignment dictates which access should be parallel to the sides of the cylinder
 * @type {number}
 */
CylinderPrimitive.ALIGN_X = 1;
CylinderPrimitive.ALIGN_Y = 2;
CylinderPrimitive.ALIGN_Z = 3;

/**
 * @ignore
 */
CylinderPrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var alignment = definition.alignment || CylinderPrimitive.ALIGN_Z;
    var numSegmentsH = definition.numSegmentsH || 1;
    var numSegmentsW = definition.numSegmentsW || 16;
    var radius = definition.radius || .5;
    var height = definition.height || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var hi, ci;
    var cx, cy;
    var angle;

    // sides
    for (hi = 0; hi <= numSegmentsH; ++hi) {
        var h = (hi*rcpNumSegmentsH - .5)*height;
        for (ci = 0; ci <= numSegmentsW; ++ci) {
            angle = ci * rcpNumSegmentsW * Math.PI * 2;
            var nx = Math.sin(angle);
            var ny = Math.cos(angle);
            cx = nx * radius;
            cy = ny * radius;

            switch (alignment) {
                case CylinderPrimitive.ALIGN_X:
                    positions.push(-h, cx, cy);
                    if (normals) normals.push(0, nx, ny);
                    break;
                case CylinderPrimitive.ALIGN_Z:
                    positions.push(cx, cy, -h);
                    if (normals) normals.push(nx, ny, 0);
                    break;
                default:
                    positions.push(cx, h, cy);
                    if (normals) normals.push(nx, 0, ny);
                    break;
            }

            if (uvs) uvs.push(1.0 - ci*rcpNumSegmentsW, hi*rcpNumSegmentsH);
        }
    }

    for (hi = 0; hi < numSegmentsH; ++hi) {
        for (ci = 0; ci < numSegmentsW; ++ci) {
            var w = numSegmentsW + 1;
            var base = ci + hi*w;

            indices.push(base, base + w + 1, base + w);
            indices.push(base, base + 1, base + w + 1);

            if (doubleSided) {
                indices.push(base, base + w, base + w + 1);
                indices.push(base, base + w + 1, base + 1);
            }
        }
    }


    // top & bottom
    var indexOffset = positions.length / 3;
    var halfH = height * .5;
    for (ci = 0; ci < numSegmentsW; ++ci) {
        angle = ci * rcpNumSegmentsW * Math.PI * 2;
        var u = Math.sin(angle);
        var v = Math.cos(angle);
        cx = u * radius;
        cy = v * radius;

        u = -u * .5 + .5;
        v = v * .5 + .5;

        switch (alignment) {
            case CylinderPrimitive.ALIGN_X:
                positions.push(halfH, cx, cy);
                positions.push(-halfH, cx, cy);

                if (normals) {
                    normals.push(1, 0, 0);
                    normals.push(-1, 0, 0);
                }

                if (uvs) {
                    uvs.push(v, 1.0 - u);
                    uvs.push(1.0 - v,  1.0 - u);
                }
                break;

            case CylinderPrimitive.ALIGN_Z:
                positions.push(cx, cy, halfH);
                positions.push(cx, cy, -halfH);

                if (normals) {
                    normals.push(0, 0, 1);
                    normals.push(0, 0, -1);
                }

                if (uvs) {
                    uvs.push(u, v);
                    uvs.push(1.0 - u, v);
                }
                break;
            default:
                positions.push(cx, -halfH, cy);
                positions.push(cx, halfH, cy);

                if (normals) {
                    normals.push(0, -1, 0);
                    normals.push(0, 1, 0);
                }

                if (uvs) {
                    uvs.push(u, v);
                    uvs.push(u, 1.0 - v);
                }
                break;
        }
    }

    for (ci = 1; ci < numSegmentsW - 1; ++ci) {
        var offset = ci << 1;
        indices.push(indexOffset, indexOffset + offset + 2, indexOffset + offset);
        indices.push(indexOffset + 1, indexOffset + offset + 1, indexOffset + offset + 3);
    }
};

export { CylinderPrimitive };