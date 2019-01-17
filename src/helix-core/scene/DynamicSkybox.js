import {Entity} from "../entity/Entity";
import {Skybox} from "./Skybox";
import {DynamicSkyTexture} from "../texture/DynamicSkyTexture";

/**
 * @classdesc
 * DynamicSkybox provides a dynamic skybox and DirectionalLight.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DynamicSkybox(sun, textureSize)
{
	this._texture = new DynamicSkyTexture(textureSize);
	Skybox.call(this, this._texture);

	this.sun = sun;

	this._invalidate();

	// prev light state to check for updates
	this._dx = 0;
	this._dy = 0;
	this._dz = 0;
	this._intensity = 0;
}

DynamicSkybox.prototype = Object.create(Skybox.prototype, {
	rayleighScattering: {
		get: function()
		{
			return this._texture.rayleighScattering;
		},

		set: function(value)
		{
			this._invalid = this._texture.rayleighScattering !== value;
			this._texture.rayleighScattering = true;
		}
	},
	rayleighHeightFalloff: {
		get: function()
		{
			return this._texture.rayleighHeightFalloff;
		},

		set: function(value)
		{
			this._invalid = this._texture.rayleighHeightFalloff !== value;
			this._texture.rayleighHeightFalloff = value;
		}
	},
	mieScattering: {
		get: function()
		{
			return this._texture.mieScattering;
		},

		set: function(value)
		{
			this._invalid = this._texture.mieScattering !== value;
			this._texture.mieScattering = value;
		}
	},
	mieCoefficient: {
		get: function()
		{
			return this._texture.mieCoefficient;
		},

		set: function(value)
		{
			this._invalid = this._texture.mieCoefficient !== value;
			this._texture.mieCoefficient = value;
		}
	},
	mieHeightFalloff: {
		get: function()
		{
			return this._texture.mieHeightFalloff;
		},

		set: function(value)
		{
			this._invalid = this._texture.mieHeightFalloff !== value;
			this._texture.mieHeightFalloff = value;
		}
	},
	groundColor: {
		get: function()
		{
			return this._texture.groundColor;
		},

		set: function(value)
		{
			this._invalid = true;
			this._texture.groundColor = value;
		}
	}
});

/**
 * @ignore
 */
DynamicSkybox.prototype.setTexture = function(texture) {};

/**
 * @ignore
 */
DynamicSkybox.prototype.copyFrom = function(src)
{
	Entity.prototype.copyFrom.call(this, src);
	this.groundColor = src.groundColor;
	this.rayleighScattering = src.rayleighScattering;
	this.rayleighHeightFalloff = src.rayleighHeightFalloff;
	this.mieScattering = src.mieScattering;
	this.mieCoefficient = src.mieCoefficient;
	this.mieHeightFalloff = src.mieHeightFalloff;
	this.groundColor = src.groundColor;
	this._invalid = true;
};

/**
 * @inheritDoc
 */
DynamicSkybox.prototype.clone = function()
{
	var clone = new DynamicSkybox();
	clone.copyFrom(this);
	return clone;
};

DynamicSkybox.prototype._update = function()
{
    var dir = this.sun.direction;
    var intensity = this.sun.intensity;

	if (!this._invalid && this._intensity === intensity && dir.x === this._dx && dir.y === this._dy && dir.z === this._dz)
        return;

    this._dx = dir.x;
    this._dy = dir.y;
    this._dz = dir.z;
    this._intensity = intensity;
    this._texture.intensity = intensity;
    this._texture.sunDirection = dir;

	// light colour is ignored, because we may want to set it to use absorption
	this._texture.update();

    this._invalid = false;
};

DynamicSkybox.prototype._invalidate = function()
{
    this._invalid = true;
};

export { DynamicSkybox };