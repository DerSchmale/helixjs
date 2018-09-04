export var RenderSortFunctions = {
    sortOpaques: function(a, b)
    {
        var diff;
        var ma = a.material, mb = b.material;

        // explicit order set by user is the most important
        diff = ma._renderOrder - mb._renderOrder;
        if (diff !== 0) return diff;

        // limiting shader switches by grouping them
        diff = ma._shaderRenderOrderHint - mb._shaderRenderOrderHint;
        if (diff !== 0) return diff;

        // limiting pass state updates
        diff = ma._renderOrderHint - mb._renderOrderHint;
        if (diff !== 0) return diff;

        // limiting instance updates
        return a.renderOrderHint - b.renderOrderHint;
    },

    sortTransparents: function(a, b)
    {
        var diff = a.material._renderOrder - b.material._renderOrder;
        if (diff !== 0) return diff;
        return b.renderOrderHint - a.renderOrderHint;
    },

    sortShadowCasters: function(a, b)
    {
        return a.shadowQualityBias - b.shadowQualityBias;
    }
};