import {Color} from "../core/Color";
import {Light} from "../light/Light";
import {BoundingVolume} from "../scene/BoundingVolume";

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
	// TODO: Refactor, all the light code is generally the same as for HX.Light and HX.AmbientLight
	// AMBIENT LIGHT IS NOT ACTUALLY A REAL LIGHT OBJECT
	Light.call(this);
}

AmbientLight.prototype = Object.create(Light.prototype);

/**
 * @ignore
 */
AmbientLight.prototype.acceptVisitor = function (visitor)
{
    Light.prototype.acceptVisitor.call(this, visitor);
    visitor.visitAmbientLight(this);
};

/**
 * @ignore
 */
AmbientLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

export { AmbientLight };