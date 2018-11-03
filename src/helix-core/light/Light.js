import {Color} from "../core/Color";
import {Entity} from "../entity/Entity";
import {META} from "../Helix";
import {PropertyListener} from "../core/PropertyListener";
import {Component} from "../entity/Component";

/**
 * @classdesc
 * Light is a base class for light objects.
 *
 * @property {Color} color The color of the ambient light.
 * @property {number} intensity The intensity of the ambient light.
 *
 * @abstract
 * @constructor
 *
 * @extends Entity
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Light()
{
	Component.call(this);
	this._scaledIrradiance = new Color();
	this._intensity = .2;
	this._color = new Color(1, 1, 1);

	this._colorChangeListener = new PropertyListener();
	this._colorChangeListener.add(this._color, "r");
	this._colorChangeListener.add(this._color, "g");
	this._colorChangeListener.add(this._color, "b");
	this._colorChangeListener.onChange.bind(this._updateScaledIrradiance, this);

	this._scaledIrradiance = new Color();
	this._updateScaledIrradiance();
}

Light.prototype = Object.create(Component.prototype, {
	color: {
		get: function() { return this._color; },
		set: function(value)
		{
			this._colorChangeListener.enabled = false;
			if (isNaN(value))
				this._color.copyFrom(value);
			else
				this._color.set(value);
			this._colorChangeListener.enabled = true;
			this._updateScaledIrradiance();
		}
	},

	intensity: {
		get: function() { return this._intensity; },
		set: function(value)
		{
			this._intensity = value;
			this._updateScaledIrradiance();
		},
	}
});

/**
 * Calculates the luminance of the light (color * intensity).
 */
Light.prototype.luminance = function ()
{
	return this._color.luminance() * this._intensity;
};

/**
 * @ignore
 */
Light.prototype._updateScaledIrradiance = function()
{
	// do not scale by 1/PI. It feels weird to control for general lights.
	if (META.OPTIONS.useGammaCorrection)
		this._color.gammaToLinear(this._scaledIrradiance);
	else
		this._scaledIrradiance.copyFrom(this._color);

	this._scaledIrradiance.r *= this._intensity;
	this._scaledIrradiance.g *= this._intensity;
	this._scaledIrradiance.b *= this._intensity;
};

/**
 * @ignore
 */
Light.prototype.copyFrom = function(src)
{
	this.color = src.color;
	this.intensity = src.intensity;
};

export { Light };