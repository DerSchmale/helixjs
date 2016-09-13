/**
 *
 * @constructor
 */
HX.AmbientLight = function()
{
    // AMBIENT LIGHT IS NOT ACTUALLY A REAL LIGHT OBJECT
    HX.Entity.call(this);
    this._scaledIrradiance = new HX.Color();
    this._intensity = .2;
    this.color = new HX.Color(1, 1, 1);
    this._scaledIrradiance = new HX.Color();
    this._updateScaledIrradiance();
};

HX.AmbientLight.prototype = Object.create(HX.Entity.prototype);

Object.defineProperties(HX.AmbientLight.prototype, {
    color: {
        get: function() { return this._color; },
        set: function(value)
        {
            this._color = isNaN(value) ? value : new HX.Color(value);
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

HX.AmbientLight.prototype.acceptVisitor = function (visitor)
{
    HX.Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitAmbientLight(this);
};

HX.AmbientLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
};

HX.AmbientLight.prototype._updateScaledIrradiance = function()
{
    // do not scale by 1/PI. It feels weird to control.
    if (HX.OPTIONS.useGammaCorrection)
        this._color.gammaToLinear(this._scaledIrradiance);
    else
        this._scaledIrradiance.copyFrom(this._color);

    this._scaledIrradiance.r *= this._intensity;
    this._scaledIrradiance.g *= this._intensity;
    this._scaledIrradiance.b *= this._intensity;
};