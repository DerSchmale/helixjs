import * as HX from "helix";
import * as CANNON from "cannon";
import {Collider} from "./Collider";

/**
 * @classdesc
 *
 * A capsule-shaped collider.
 *
 * @constructor
 *
 * @param {number} [radius] The radius of the cylinder. If omitted, will use the object bounds.
 * @param {number} [height] The height of the cylinder. If omitted, will use the object bounds.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CylinderCollider(radius, height, mainAxis, center)
{
    Collider.call(this);
    this._radius = radius;
    this._height = height;
    this._center = center;

    if (mainAxis) {
        mainAxis.normalize();
        this._orientation = HX.Quaternion.fromVectors(HX.Float4.Z_AXIS, mainAxis);
    }
}

CylinderCollider.prototype = Object.create(Collider.prototype);

CylinderCollider.prototype.volume = function()
{
    return Math.PI * this._radius * this._radius * this._height;
};

CylinderCollider.prototype.createShape = function(bounds)
{
    if (!this._radius) {
        var f = new HX.Float2();

        f.set(bounds.halfExtent); // copy X and Y
        this._radius = f.length;
    }

    if (!this._height)
        this._height = bounds.halfExtent.z * 2.0;

    return new CANNON.Cylinder(this._radius, this._radius, this._height, 10);
};

export {CylinderCollider};