import {Entity} from "../entity/Entity";
import {Light} from "./Light";

/**
 * @classdesc
 * DirectLight forms a base class for direct lights.
 *
 * @property {boolean} castShadows Defines whether or not this light casts shadows.
 * @property {number} shadowQualityBias Shifts the priority of the shadow quality. Higher values will mean lower quality.
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
	this.depthBias = .0;
    this._castShadows = false;
    this.shadowQualityBias = 0;
}

DirectLight.prototype = Object.create(Light.prototype);

DirectLight.prototype.acceptVisitor = function (visitor)
{
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
};



/**
 * @ignore
 */
DirectLight.prototype.copyTo = function(target)
{
	Light.prototype.copyTo.call(this, target);
	target.shadowQualityBias = this.shadowQualityBias;
	target.castShadows = this.castShadows;
	target.depthBias = this.depthBias;
};

export { DirectLight };