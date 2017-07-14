import {Color} from "../core/Color";
import {Entity} from "../entity/Entity";
import {META} from "../Helix";

/**
 * @classdesc
 * Light forms a base class for lights.
 *
 * @abstract
 *
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Light()
{
    Entity.call(this);
    //this._type = this.getTypeID();
    this._intensity = 3.1415;
    this._color = new Color(1.0, 1.0, 1.0);
    this._scaledIrradiance = new Color();
    this._castShadows = false;
    this._updateScaledIrradiance();
}

Light.prototype = Object.create(Entity.prototype, {
    intensity: {
        get: function ()
        {
            return this._intensity;
        },

        set: function (value)
        {
            this._intensity = value;
            this._updateScaledIrradiance();
        }
    },

    color: {
        get: function ()
        {
            return this._color;
        },

        /**
         * Value can be hex or
         * @param value
         */
        set: function (value)
        {
            this._color = isNaN(value) ? value : new Color(value);
            this._updateScaledIrradiance();
        }
    }
});

Light.prototype.acceptVisitor = function (visitor)
{
    Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

Light.prototype.luminance = function ()
{
    return this._color.luminance() * this._intensity;
};

Light.prototype._updateScaledIrradiance = function ()
{
    // this includes 1/PI radiance->irradiance factor
    var scale = this._intensity / Math.PI;

    if (META.OPTIONS.useGammaCorrection)
        this._color.gammaToLinear(this._scaledIrradiance);
    else
        this._scaledIrradiance.copyFrom(this._color);

    this._scaledIrradiance.r *= scale;
    this._scaledIrradiance.g *= scale;
    this._scaledIrradiance.b *= scale;
    this._invalidateWorldBounds();
};

Light.prototype.renderDeferredLighting = function(renderer)
{
    // To implement by concrete subclasses
};

export { Light };