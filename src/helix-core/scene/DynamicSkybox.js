import {Entity} from "../entity/Entity";
import {TextureCube} from "../texture/TextureCube";
import {capabilities, CubeFace, TextureFormat} from "../Helix";
import {Color} from "../core/Color";
import {CubeCamera} from "../camera/CubeCamera";
import {Skybox} from "./Skybox";
import {FrameBuffer} from "../texture/FrameBuffer";
import {EffectPass} from "../effect/EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {GL} from "../core/GL";

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
	textureSize = textureSize || 128;
	this._texture = new TextureCube();
	this._texture.initEmpty(textureSize, TextureFormat.RGBA, capabilities.HDR_DATA_TYPE);
	this._texture.generateMipmap();
	Skybox.call(this, this._texture);
	this._initRendering();

	this.sun = sun;

	this._rayleighScattering = new Color(5.8e-6, 1.35e-5, 3.31e-5);
	this._groundColor = new Color(0.5, 0.5, 0.5);
	this._mieScattering = 5.216e-6;
	this._mieCoefficient = 0.3;
	this._rayleighHeightFalloff = 8000;
	this._mieHeightFalloff = 1200;

	// stores previous state
	this.rayleighScattering = this._rayleighScattering;
	this.mieScattering = this._mieScattering;
	this.mieCoefficient = this._mieCoefficient;
	this.rayleighHeightFalloff = this._rayleighHeightFalloff;
	this.mieHeightFalloff = this._mieHeightFalloff;
	this.groundColor = this._groundColor;

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
			return this._rayleighScattering;
		},

		set: function(value)
		{
			this._rayleighScattering = value;
			this._invalid = true;
			this._pass.setUniform("rayleighScattering", value);
			this._pass.setUniform("rayleighExtinction", value);
		}
	},
	rayleighHeightFalloff: {
		get: function()
		{
			return this._rayleighHeightFalloff;
		},

		set: function(value)
		{
			this._rayleighHeightFalloff = value;
			this._invalid = true;
			this._pass.setUniform("rayleighHeightFalloff",  1.0 / value);
		}
	},
	mieScattering: {
		get: function()
		{
			return this._mieScattering;
		},

		set: function(value)
		{
			this._mieScattering = value;
			this._invalid = true;
			this._pass.setUniform("mieScattering", value);
			this._pass.setUniform("mieExtinction", value * 1.11);
		}
	},
	mieCoefficient: {
		get: function()
		{
			return this._mieCoefficient;
		},

		set: function(g)
		{
			this._mieCoefficient = g;
			this._invalid = true;
			this._pass.setUniform("mieCoefficient",  1.55 * g - 0.55 * g * g * g);
		}
	},
	mieHeightFalloff: {
		get: function()
		{
			return this._mieHeightFalloff;
		},

		set: function(value)
		{
			this._mieHeightFalloff = value;
			this._invalid = true;
			this._pass.setUniform("mieHeightFalloff",  1.0 / value);
		}
	},
	groundColor: {
		get: function()
		{
			return this._groundColor;
		},

		set: function(value)
		{
			this._groundColor = value;
			this._invalid = true;
			this._pass.setUniform("groundColor",  value.gammaToLinear());
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
	this.rayleighFactors = src.rayleighFactors;
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

    var pass = this._pass;
    pass.setUniform("sunDir", dir);
    pass.setUniform("intensity", intensity);
	// light colour is ignored, because we may want to set it to use absorption

    for (var i = 0; i < 6; ++i) {
    	GL.setRenderTarget(this._fbos[i]);
		GL.clear();
    	var camera = this._cubeCam.getFaceCamera(i);
		pass.setUniform("inverseViewProjectionMatrix", camera.inverseViewProjectionMatrix);
		pass.draw();
	}

	this._texture.generateMipmap();

    this._invalid = false;
};

DynamicSkybox.prototype._invalidate = function()
{
    this._invalid = true;
};

DynamicSkybox.prototype._initRendering = function()
{
	this._cubeCam = new CubeCamera();
	this._fbos = [];

	var cubeFaces = [ CubeFace.POSITIVE_X, CubeFace.NEGATIVE_X, CubeFace.POSITIVE_Y, CubeFace.NEGATIVE_Y, CubeFace.POSITIVE_Z, CubeFace.NEGATIVE_Z ];
	for (var i = 0; i < 6; ++i) {
		this._fbos[i] = new FrameBuffer(this._texture, null, cubeFaces[i]);
		this._fbos[i].init();
	}

	var volumetric = ShaderLibrary.get("snippets_volumetric.glsl") + "\n";
	this._pass = new EffectPass(volumetric + ShaderLibrary.get("dynamic_skybox_vertex.glsl"), volumetric + ShaderLibrary.get("dynamic_skybox_fragment.glsl"));
	this._pass.setUniform("earthRadius", 6371000.0);
	this._pass.setUniform("atmosphereRadius", 6426000.0);

};

export { DynamicSkybox };