import * as HX from "helix";
import * as CANNON from "cannon";
import {Collider} from "./Collider";

/**
 * @classdesc
 *
 * A box-shaped collider.
 *
 * @constructor
 *
 * @param {Float4} [min] The minimum coordinates of the box in local object space. If omitted, will use the object bounds.
 * @param {Float4} [max] The maximum coordinates of the box in local object space. If omitted, will use the object bounds.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BoxCollider(min, max)
{
    Collider.call(this);
    if (min && max) {
        this._halfExtents = HX.Float4.subtract(max, min).scale(.5);
        this._center = HX.Float4.add(max, min).scale(.5);
    }
}

BoxCollider.prototype = Object.create(Collider.prototype);

BoxCollider.prototype.volume = function()
{
    return 8 * (this._halfExtents.x * this._halfExtents.y * this._halfExtents.z);
};

BoxCollider.prototype.createShape = function(bounds)
{
    if (!this._halfExtents)
        this._halfExtents = bounds.getHalfExtents();

    var vec3 = new CANNON.Vec3();
    vec3.copy(this._halfExtents);
    return new CANNON.Box(vec3);
};

export {BoxCollider};