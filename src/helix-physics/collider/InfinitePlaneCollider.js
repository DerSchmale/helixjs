import * as HX from "helix";
import {Collider} from "./Collider";

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
    if (height) this._center = new HX.Float4(0, 0, height);
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