import {BoundingVolume} from "../scene/BoundingVolume";
import {Entity} from "../entity/Entity";
import {Float4} from "../math/Float4";
import {BoundingSphere} from "../scene/BoundingSphere";
import {Component} from "../entity/Component";
import {BoundingAABB} from "../scene/BoundingAABB";

/**
 * @classdesc
 * LightProbe provides functionality to store global illumination information and apply it to the scene lighting.
 * Only providing a simple specularTexture will behave like environment mapping, but diffuse convolution can be applied
 * for global diffuse illumination.
 *
 * @property {TextureCube} diffuseTexture A cube map texture containing diffuse global illumination information
 * @property {TextureCube} specularTexture A cube map texture containing specular global illumination information
 * @property {number} size Defines the virtual size of the environment map box. Useful for local reflections. Leave undefined for a traditional environment map "at infinity"
 *
 * @see {@linkcode https://www.knaldtech.com/lys/} for an example tool to generate the required images.
 *
 * @constructor
 * @param {TextureCube} diffuseTexture A cube map texture containing diffuse global illumination information
 * @param {TextureCube} specularTexture A cube map texture containing specular global illumination information
 *
 * @extends Entity
 *
 * @author derschmale <http://www.derschmale.com>
 */
function LightProbe(diffuseTexture, specularTexture)
{
    Component.call(this);
    this._specularTexture = specularTexture;
    this._diffuseTexture = diffuseTexture;
    this._size = undefined;
    this._bounds = new BoundingAABB();
	this._bounds.clear(BoundingVolume.EXPANSE_INFINITE);
}

// conversion range for spec power to mip. Lys style.
LightProbe.powerRange0 = .00098;
LightProbe.powerRange1 = .9921;

Component.create(LightProbe,
    {
        specularTexture: {
            get: function() { return this._specularTexture; }
        },
        diffuseTexture: {
            get: function() { return this._diffuseTexture; }
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


/**
 * ignore
 */
LightProbe.prototype.acceptVisitor = function (visitor)
{
    visitor.visitLight(this);
};

export { LightProbe };
