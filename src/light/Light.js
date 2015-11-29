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
    this._luminanceBound = 1 / 255;
    this._color = new HX.Color(1.0, 1.0, 1.0);
    this._scaledIrradiance = new HX.Color();
    this._castShadows = false;
    this._updateScaledIrradiance();
};

HX.Light.prototype = Object.create(HX.Entity.prototype);

HX.Light.prototype.getTypeID = function()
{
    throw "Light is not registered! Be sure to pass the light type into the customLights array upon Helix initialization.";
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
    throw "Abstract method!";
};

/**
 * The minimum luminance to be considered as "contributing to the lighting", used to define bounds. Any amount below this will be zeroed. Defaults to 1/255.
 */
HX.Light.prototype.getLuminanceBound = function ()
{
    return this._luminanceBound;
};

HX.Light.prototype.setLuminanceBound = function (value)
{
    this._luminanceBound = value;
    this._invalidateWorldBounds();
};

HX.Light.prototype.luminance = function ()
{
    return this._color.luminance() * this._intensity;
};

HX.Light.prototype._updateScaledIrradiance = function ()
{
    // this includes 1/PI radiance->irradiance factor
    var scale = this._intensity / Math.PI;

    if (HX.OPTIONS.useLinearSpace) {
        this._color.gammaToLinear(this._scaledIrradiance);
    }
    else {
        this._scaledIrradiance.r = this._color.r;
        this._scaledIrradiance.g = this._color.g;
        this._scaledIrradiance.b = this._color.b;
    }

    this._scaledIrradiance.r *= scale;
    this._scaledIrradiance.g *= scale;
    this._scaledIrradiance.b *= scale;
    this._invalidateWorldBounds();
};