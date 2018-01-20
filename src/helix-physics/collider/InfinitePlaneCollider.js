import {Collider} from "./Collider";
import {Quaternion} from "../../helix-core/math/Quaternion";

/**
 * @classdesc
 *
 * A collider along an infinite plane.
 *
 * @constructor
 *
 * @param {number} [height] The height of the sphere. If omitted, will use the object bounds.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function InfinitePlaneCollider(height)
{
    Collider.call(this);
    if (height) this._center = new HX.Float4(0, height, 0);
    // this._orientation = new Quaternion();
    // this._orientation.fromAxisAngle(HX.Float4.X_AXIS, -Math.PI * .5);
}

InfinitePlaneCollider.prototype = Object.create(Collider.prototype);

InfinitePlaneCollider.prototype.volume = function()
{
    return 0;
};

InfinitePlaneCollider.prototype.createShape = function(sceneBounds)
{
    return new CANNON.Plane();
};

export {InfinitePlaneCollider};