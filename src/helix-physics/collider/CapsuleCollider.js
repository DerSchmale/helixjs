import * as HX from "helix";
import * as CANNON from "cannon";
import {Collider} from "./Collider";
import {CompoundShape} from "./CompoundShape";

/**
 * @classdesc
 *
 * A capsule-shaped collider.
 *
 * @constructor
 *
 * @param {number} [radius] The radius of the capsule. If omitted, will use the object bounds.
 * @param {number} [height] The height of the capsule. If omitted, will use the object bounds.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CapsuleCollider(radius, height, center)
{
    Collider.call(this);
    this._radius = radius;
    this._height = height;
    this._center = center;
    if (this._height < 2.0 * this._radius) this._height = 2.0 * this._radius;
    if (radius !== undefined && center === undefined) {
        this._center = new HX.Float4();
    }
}

CapsuleCollider.prototype = Object.create(Collider.prototype);

CapsuleCollider.prototype.volume = function()
{
    var radius = this._radius;
    var cylHeight = this._height - 2 * this._radius;
    var sphereVol = .75 * Math.PI * radius * radius * radius;
    var cylVol = Math.PI * radius * radius * cylHeight;
    return cylVol + sphereVol;
};

CapsuleCollider.prototype.createShape = function(sceneBounds)
{
	var cylHeight = this._height - 2 * this._radius;
    this._radius = this._radius || sceneBounds.getRadius();
    var shape = new CompoundShape();
    var sphere = new CANNON.Sphere(this._radius);
	shape.addShape(sphere, new HX.Float4(0, 0, -cylHeight * .5));
	shape.addShape(sphere, new HX.Float4(0, 0, cylHeight * .5));
	shape.addShape(new CANNON.Cylinder(this._radius, this._radius, cylHeight, 10));
    return shape;
};

export {CapsuleCollider};