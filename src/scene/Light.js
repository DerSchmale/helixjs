/**
 * Subclasses must implement:
 * prototype.activate
 * prototype.prepareBatch
 * @constructor
 */
HX.Light = function (type)
{
    HX.SceneNode.call(this);
    this._luminance = 1.0;
    this._luminanceBound = 1 / 255;
    this._type = type; // used for sorting (TODO: Does this work?)
    this._color = new HX.Color(1.0, 1.0, 1.0);
    this._scaledIrradiance = new HX.Color();
    this._castsShadows = false;
    this._updateScaledIrradiance();
};

HX.Light.prototype = Object.create(HX.SceneNode.prototype);

HX.Light.prototype.acceptVisitor = function (visitor)
{
    HX.SceneNode.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

HX.Light.prototype.getLuminance = function ()
{
    return this._luminance;
};

HX.Light.prototype.setLuminance = function (value)
{
    this._luminance = value;
    this._updateScaledIrradiance();
};

HX.Light.prototype.getColor = function ()
{
    return this._color;
};

HX.Light.prototype.activate = function(camera, gbuffer, occlusion)
{

};

// returns the index of the FIRST UNRENDERED light
HX.Light.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    throw "Abstract method!";
};

/**
 * Value can be hex or ColorRGBA
 */
HX.Light.prototype.setColor = function (value)
{
    this._color = isNaN(value) ? value : new HX.Color(value);

    this._updateScaledIrradiance();
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
    this._updateWorldBounds();
};

HX.Light.prototype.luminance = function ()
{
    return this._color.luminance() * this._luminance;
};

HX.Light.prototype._updateScaledIrradiance = function ()
{
    // this includes 1/PI radiance->irradiance factor
    var scale = this._luminance / (Math.PI * this._color.luminance());

    this._scaledIrradiance.r = this._color.r * scale;
    this._scaledIrradiance.g = this._color.g * scale;
    this._scaledIrradiance.b = this._color.b * scale;
    this._invalidateWorldBounds();
};