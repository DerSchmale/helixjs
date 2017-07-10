import {BoundingVolume} from "../scene/BoundingVolume";
import {Entity} from "../entity/Entity";
import {DeferredLightProbeShader} from "./shaders/DeferredLightProbeShader";
import {META} from "../Helix";

/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
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

// conversion range for spec power to mip
LightProbe.powerRange0 = .00098;
LightProbe.powerRange1 = .9921;

LightProbe.prototype = Object.create(Entity.prototype,
    {
        specularTexture: {
            get: function() { return this._specularTexture; }
        },
        diffuseTexture: {
            get: function() { return this._diffuseTexture; }
        }
    });

LightProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

LightProbe.prototype.acceptVisitor = function (visitor)
{
    Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

LightProbe.prototype.renderDeferredLighting = function(renderer)
{
    // To implement by concrete subclasses
};

LightProbe.prototype.renderDeferredLighting = function(renderer)
{
    this._deferredShader.execute(renderer);
};

export { LightProbe };
