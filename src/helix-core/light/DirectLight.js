import {Color} from "../core/Color";
import {Entity} from "../entity/Entity";
import {Light} from "./Light";

/**
 * @classdesc
 * DirectLight forms a base class for direct lights.
 *
 * @property {number} intensity The intensity of the light.
 * @property {Color} color The color of the light.
 *
 * @abstract
 *
 * @constructor
 *
 * @extends Entity
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DirectLight()
{
    Light.call(this);
    this.intensity = 3.1415;
    this._castShadows = false;
}

DirectLight.prototype = Object.create(Light.prototype);

DirectLight.prototype.acceptVisitor = function (visitor)
{
    Light.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

DirectLight.prototype._updateScaledIrradiance = function ()
{
    Light.prototype._updateScaledIrradiance.call(this);

    // 1/PI radiance->irradiance factor
    var scale = 1 / Math.PI;

    this._scaledIrradiance.r *= scale;
    this._scaledIrradiance.g *= scale;
    this._scaledIrradiance.b *= scale;

    this._invalidateWorldBounds();
};

/**
 * @private
 */
DirectLight.prototype.renderDeferredLighting = function(renderer)
{
    // To implement by concrete subclasses
};

export { DirectLight };