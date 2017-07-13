import {Color} from "../core/Color";
import {Entity} from "../entity/Entity";
import {BoundingVolume} from "../scene/BoundingVolume";
import {META} from "../Helix";

/**
 * @classdesc
 * AmbientLight can be added to the scene to provide a minimum (single-color) amount of light in the scene.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AmbientLight()
{
    // AMBIENT LIGHT IS NOT ACTUALLY A REAL LIGHT OBJECT
    Entity.call(this);
    this._scaledIrradiance = new Color();
    this._intensity = .2;
    this.color = new Color(1, 1, 1);
    this._scaledIrradiance = new Color();
    this._updateScaledIrradiance();
};

AmbientLight.prototype = Object.create(Entity.prototype);

Object.defineProperties(AmbientLight.prototype, {
    /**
     * The color of the ambient light.
     */
    color: {
        get: function() { return this._color; },
        set: function(value)
        {
            this._color = isNaN(value) ? value : new Color(value);
            this._updateScaledIrradiance();
        }
    },

    /**
     * The intensity of the ambient light.
     */
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
 * @ignore
 */
AmbientLight.prototype.acceptVisitor = function (visitor)
{
    Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitAmbientLight(this);
};

/**
 * @ignore
 */
AmbientLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @ignore
 */
AmbientLight.prototype._updateScaledIrradiance = function()
{
    // do not scale by 1/PI. It feels weird to control.
    if (META.OPTIONS.useGammaCorrection)
        this._color.gammaToLinear(this._scaledIrradiance);
    else
        this._scaledIrradiance.copyFrom(this._color);

    this._scaledIrradiance.r *= this._intensity;
    this._scaledIrradiance.g *= this._intensity;
    this._scaledIrradiance.b *= this._intensity;
};

export { AmbientLight };