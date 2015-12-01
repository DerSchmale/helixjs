HX.Component = function()
{
    // this allows notifying entities about bound changes (useful for sized components)
    this._entity = null;
};

HX.Component.prototype =
{
    // to be overridden:
    onAdded: function() {},
    onRemoved: function() {},

    // by default, onUpdate is not implemented at all
    //onUpdate: function(dt) {},
    onUpdate: null,

    get entity()
    {
        return this._entity;
    }
};