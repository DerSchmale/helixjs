import * as HX from "helix";
import * as CANNON from "cannon";
import {Collider} from "./Collider";
import {CompoundShape} from "./CompoundShape";

/**
 * @classdesc
 *
 * A box-shaped collider with the "walls" pointing to the inside
 *
 * @constructor
 *
 * @param {Float4} [thickness] The thickness of the box walls. Defaults to .1
 * @param {Float4} [min] The minimum coordinates of the box in local object space. If omitted, will use the object bounds.
 * @param {Float4} [max] The maximum coordinates of the box in local object space. If omitted, will use the object bounds.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function InvertedBoxCollider(thickness, min, max)
{
    Collider.call(this);

    this._thickness = thickness || .1;

    if (min && max) {
        this._halfExtents = HX.Float4.subtract(max, min).scale(.5);
        this._center = HX.Float4.add(max, min).scale(.5);
    }
}

InvertedBoxCollider.prototype = Object.create(Collider.prototype);

InvertedBoxCollider.prototype.volume = function()
{
    return 8 * (this._halfExtents.x * this._halfExtents.y * this._halfExtents.z);
};

InvertedBoxCollider.prototype.createShape = function(bounds)
{
    if (!this._halfExtents)
        this._halfExtents = bounds.getHalfExtents();

    var shape = new CompoundShape();
    var t = this._thickness;
    var th = t * .5;
    var he = this._halfExtents;

    shape.addShape(new CANNON.Box(new CANNON.Vec3(th, he.y + t, he.z)), new CANNON.Vec3(he.x + th, 0, 0));         // posX
    shape.addShape(new CANNON.Box(new CANNON.Vec3(th, he.y + t, he.z)), new CANNON.Vec3(-(he.x + th), 0, 0));      // negX
    shape.addShape(new CANNON.Box(new CANNON.Vec3(he.x + t, th, he.z)), new CANNON.Vec3(0, he.y + th, 0));         // posY
    shape.addShape(new CANNON.Box(new CANNON.Vec3(he.x + t, th, he.z)), new CANNON.Vec3(0, -(he.y + th), 0));      // negY
    shape.addShape(new CANNON.Box(new CANNON.Vec3(he.x, he.y, th)), new CANNON.Vec3(0, 0, he.z + th));         // posZ
    shape.addShape(new CANNON.Box(new CANNON.Vec3(he.x, he.y, th)), new CANNON.Vec3(0, 0, -(he.z + th)));      // negZ

    return shape;
};

export {InvertedBoxCollider};