HX.Component = function()
{
    // this allows notifying entities about bound changes (useful for sized components)
    this._entity = null;
    this._worldBounds = this._createBoundingVolume();
    this._worldBoundsInvalid = true;
};

HX.Component.prototype =
{
    // to be overridden:
    onAdded: function() {},
    onRemoved: function() {},
    onUpdate: function(dt) {},

    get entity()
    {
        return this._entity;
    }
};