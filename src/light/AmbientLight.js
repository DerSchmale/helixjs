/**
 *
 * @constructor
 */
HX.AmbientLight = function()
{
    // AMBIENT LIGHT IS NOT ACTUALLY A REAL LIGHT OBJECT
    HX.Entity.call(this);
    this._linearColor = new HX.Color();
    this.color = new HX.Color(.1,.1,.1);
};

HX.AmbientLight.prototype = Object.create(HX.Entity.prototype);

Object.defineProperties(HX.AmbientLight.prototype, {
    color: {
        get: function() { return this._color; },
        set: function(value)
        {
            this._color = value;
            if (HX.OPTIONS.useGammaCorrection)
                this._color.gammaToLinear(this._linearColor);
            else
                this._linearColor.copyFrom(this._color);
        }
    },

    linearColor: {
        get: function() { return this._linearColor; }
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