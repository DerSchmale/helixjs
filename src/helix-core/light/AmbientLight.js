import {Color} from "../core/Color";
import {Light} from "../light/Light";
import {BoundingVolume} from "../scene/BoundingVolume";
import {Component} from "../entity/Component";
import {BoundingAABB} from "../scene/BoundingAABB";

/**
 * @classdesc
 * AmbientLight can be added to the scene to provide a minimum (single-color) amount of light in the scene.
 *
 * @property {Color} color The color of the ambient light.
 * @property {number} intensity The intensity of the ambient light.
 *
 * @constructor
 *
 * @extends Light
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AmbientLight()
{
	Light.call(this);
	this._bounds = new BoundingAABB();
}

Component.create(AmbientLight, {}, Light);

/**
 * @ignore
 */
AmbientLight.prototype.acceptVisitor = function (visitor)
{
    visitor.visitAmbientLight(this);
};

AmbientLight.prototype._updateBounds = function()
{
	this._bounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @inheritDoc
 */
AmbientLight.prototype.clone = function()
{
	var clone = new AmbientLight();
	clone.copyFrom(this);
	return clone;
};

export { AmbientLight };