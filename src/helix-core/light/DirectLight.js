import {Entity} from "../entity/Entity";
import {Light} from "./Light";
import {Component} from "../entity/Component";

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
	this._Light_updateScaledIrradiance = Light.prototype._updateScaledIrradiance;

    Light.call(this);
    this.intensity = 3.1415;
	this.depthBias = .0;
    this._castShadows = false;
    this.shadowQualityBias = 0;
}

DirectLight.prototype = Object.create(Light.prototype);

DirectLight.prototype._updateScaledIrradiance = function ()
{
    this._Light_updateScaledIrradiance();

    // 1/PI radiance->irradiance factor
    var scale = 1 / Math.PI;

    this._scaledIrradiance.r *= scale;
    this._scaledIrradiance.g *= scale;
    this._scaledIrradiance.b *= scale;
};



/**
 * @ignore
 */
DirectLight.prototype.copyFrom = function(src)
{
	Light.prototype.copyFrom.call(this, src);
	this.shadowQualityBias = src.shadowQualityBias;
	this.castShadows = src.castShadows;
	this.depthBias = src.depthBias;
};

export { DirectLight };