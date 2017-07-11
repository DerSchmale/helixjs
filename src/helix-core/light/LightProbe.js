/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 */
import {BoundingVolume} from "../scene/BoundingVolume";
import {Entity} from "../entity/Entity";
import {DeferredLightProbeShader} from "./shaders/DeferredLightProbeShader";
import {META} from "../Helix";
import {Float4} from "../math/Float4";

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
