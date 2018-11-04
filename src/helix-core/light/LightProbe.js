import {BoundingVolume} from "../scene/BoundingVolume";
import {Entity} from "../entity/Entity";
import {Float4} from "../math/Float4";
import {BoundingSphere} from "../scene/BoundingSphere";
import {Component} from "../entity/Component";

/**
 * @classdesc
 * LightProbe provides functionality to store global illumination information and apply it to the scene lighting.
 * Only providing a simple specularTexture will behave like environment mapping, but diffuse convolution can be applied
 * for global diffuse illumination.
 *
 * @property {SphericalHarmonicsRGB} diffuseSH A spherical harmonics representation of the diffuse global illumination
 * @property {TextureCube} specularTexture A cube map texture containing specular global illumination information
 * @property {number} intensity Defines the intensity of the environment map.
 * @property {number} size Defines the virtual size of the environment map box. Useful for local reflections. Leave undefined for a traditional environment map "at infinity"
 *
 * @see {@linkcode https://www.knaldtech.com/lys/} for an example tool to generate the required images.
 *
 * @constructor
 * @param {SphericalHarmonicsRGB} diffuseSH A spherical harmonics representation of the diffuse global illumination
 * @param {TextureCube} specularTexture A cube map texture containing specular global illumination information
 *
 * @extends Entity
 *
 * @author derschmale <http://www.derschmale.com>
 */
function LightProbe(diffuseSH, specularTexture)
{
    Component.call(this);
    this.intensity = 1.0;
	this._diffuseSH = diffuseSH;
	this._specularTexture = specularTexture;
    this._size = undefined;
    this._bounds = new BoundingSphere();
	this._bounds.clear(BoundingVolume.EXPANSE_INFINITE);
	this._renderOrderHint = 0;
}

// conversion range for spec power to mip. Lys style.
LightProbe.powerRange0 = .00098;
LightProbe.powerRange1 = .9921;

LightProbe.prototype = Object.create(Component.prototype,
    {
        specularTexture: {
            get: function() { return this._specularTexture; }
        },
		diffuseSH: {
            get: function() { return this._diffuseSH; }
        },
        size: {
            get: function()
            {
                return this._size;
            },
            set: function(value)
            {
                if (this._size === value) return;

                this._size = value;

				if (value)
					this._bounds.setExplicit(Float4.ORIGIN_POINT, value);
				else
					this._bounds.clear(BoundingVolume.EXPANSE_INFINITE);
			},
        }
    });


LightProbe.prototype.clone = function()
{
	var clone = new LightProbe(this._diffuseSH, this._specularTexture);
	clone.size = this.size;
	clone.intensity = this.intensity;
	return clone;
};

Component.register("lightProbe", LightProbe);

export { LightProbe };