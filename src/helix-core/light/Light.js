/**
 * Subclasses must implement:
 * prototype.activate
 * prototype.prepareBatch
 * @constructor
 */
HX.Light = function ()
{
    HX.Entity.call(this);
    this._type = this.getTypeID();
    this._intensity = 3.1415;
    this._color = new HX.Color(1.0, 1.0, 1.0);
    this._scaledIrradiance = new HX.Color();
    this._castShadows = false;
    this._updateScaledIrradiance();
};

HX.Light.prototype = Object.create(HX.Entity.prototype);

HX.Light.prototype.getTypeID = function()
{
    throw new Error("Light is not registered! Be sure to pass the light type into the customLights array upon Helix initialization.");
};

HX.Light.prototype.acceptVisitor = function (visitor)
{
    HX.Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

Object.defineProperties(HX.Light.prototype, {
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
            this._color = isNaN(value) ? value : new HX.Color(value);
            this._updateScaledIrradiance();
        }
    }
});

// returns the index of the FIRST UNRENDERED light
HX.Light.prototype.renderBatch = function(lightCollection, startIndex, renderer)
{
    throw new Error("Abstract method!");
};

HX.Light.prototype.luminance = function ()
{
    return this._color.luminance() * this._intensity;
};

HX.Light.prototype._updateScaledIrradiance = function ()
{
    // this includes 1/PI radiance->irradiance factor
    var scale = this._intensity / Math.PI;

    if (HX.OPTIONS.useGammaCorrection)
        this._color.gammaToLinear(this._scaledIrradiance);
    else
        this._scaledIrradiance.copyFrom(this._color);

    this._scaledIrradiance.r *= scale;
    this._scaledIrradiance.g *= scale;
    this._scaledIrradiance.b *= scale;
    this._invalidateWorldBounds();
};