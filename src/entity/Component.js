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

    // TODO: should this be called by RenderCollector?
    // it could trigger multiple calls for multiple viewports
    // perhaps Helix should provide a general update mechanic, based on a hidden FrameTicker?
    // components should indicate whether they SHOULD be updated, otherwise we're calling way too many
    onUpdate: function(dt) {},

    // components should indicate whether they SHOULD be visited, otherwise we're calling way too many of them
    acceptVisitor: function(visitor) {},

    get entity()
    {
        return this._entity;
    },

    get worldBounds()
    {
        if (this._worldBounds && this._worldBoundsInvalid)
            this._updateWorldBounds();

        return this._worldBounds;
    },

    _invalidateWorldBounds: function()
    {
        if (!this._worldBounds) return;
        this._worldBoundsInvalid = true;
        if (this._entity)
            this._entity._invalidateWorldBounds();
    },

    // by default, components are not bounded, so these do nothing
    _updateWorldBounds: function()
    {
    },

    _createBoundingVolume: function()
    {
        return null;
    }
};