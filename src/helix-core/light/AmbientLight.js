import {Color} from "../core/Color";
import {Light} from "../light/Light";
import {BoundingVolume} from "../scene/BoundingVolume";
import {Component} from "../entity/Component";
import {BoundingAABB} from "../scene/BoundingAABB";

/**
 * @classdesc
 * AmbientLight can be added to the scene to provide a minimum (single-color) amount of light in the scene.
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

AmbientLight.prototype = Object.create(Light.prototype);

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

Component.register("ambientLight", AmbientLight);

export { AmbientLight };