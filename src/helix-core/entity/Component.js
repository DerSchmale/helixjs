function Component()
{
    // this allows notifying entities about bound changes (useful for sized components)
    this._entity = null;
}

Component.prototype =
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

export { Component };