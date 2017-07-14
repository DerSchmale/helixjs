import {BoundingVolume} from "../scene/BoundingVolume";
import {Entity} from "../entity/Entity";
import {DeferredLightProbeShader} from "./shaders/DeferredLightProbeShader";
import {META} from "../Helix";
import {Float4} from "../math/Float4";

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
    Entity.call(this);
    this._specularTexture = specularTexture;
    this._diffuseTexture = diffuseTexture;
    this._size = undefined;

    if (META.OPTIONS.defaultLightingModel)
        this._deferredShader = new DeferredLightProbeShader(this);
}

// conversion range for spec power to mip. Lys style.
LightProbe.powerRange0 = .00098;
LightProbe.powerRange1 = .9921;

LightProbe.prototype = Object.create(Entity.prototype,
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
                var deferredInvalid = false;
                if (META.OPTIONS.defaultLightingModel && (this._size === undefined || value === undefined))
                    deferredInvalid = true;

                this._size = value;
                this._invalidateWorldBounds();

                if (deferredInvalid) this._deferredShader = new DeferredLightProbeShader(this);
            },
        }
    });

/**
 * @ignore
 */
LightProbe.prototype._updateWorldBounds = function()
{
    var min = new Float4();
    var max = new Float4();
    return function()
    {
        if (!this._size)
            this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
        else {
            this.worldMatrix.getColumn(3, min);
            this.worldMatrix.getColumn(3, max);
            var rad = this._size * .5;
            min.x -= rad;
            min.y -= rad;
            min.z -= rad;
            max.x += rad;
            max.y += rad;
            max.z += rad;
            this._worldBounds.setExplicit(min, max);
        }
    }
}();

/**
 * ignore
 */
LightProbe.prototype.acceptVisitor = function (visitor)
{
    Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

/**
 * ignore
 */
LightProbe.prototype.renderDeferredLighting = function(renderer)
{
    this._deferredShader.execute(renderer);
};

export { LightProbe };
