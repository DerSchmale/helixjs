import * as HX from "helix";
import * as CANNON from "cannon";
import {Collider} from "./Collider";

/**
 * @classdesc
 *
 * A sphere-shaped collider.
 *
 * @constructor
 *
 * @param {number} [radius] The radius of the sphere. If omitted, will use the object bounds.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SphereCollider(radius, center)
{
    Collider.call(this);
    this._radius = radius;
    this._center = center;
    if (radius !== undefined && center === undefined) {
        this._center = new HX.Float4();
    }
}

SphereCollider.prototype = Object.create(Collider.prototype);

SphereCollider.prototype.volume = function()
{
    var radius = this._radius;
    return .75 * Math.PI * radius * radius * radius;
};

SphereCollider.prototype.createShape = function(sceneBounds)
{
    this._radius = this._radius || sceneBounds.getRadius();
    return new CANNON.Sphere(this._radius);
};

export {SphereCollider};