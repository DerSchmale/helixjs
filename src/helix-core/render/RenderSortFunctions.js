export var RenderSortFunctions = {
    sortOpaques: function(a, b)
    {
        var diff;

        diff = a.material._renderOrder - b.material._renderOrder;
        if (diff !== 0) return diff;

        diff = a.material._renderOrderHint - b.material._renderOrderHint;
        if (diff !== 0) return diff;

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