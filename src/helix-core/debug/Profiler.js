// these are some debug profiling methods used while developing

/**
 * Just some timing functions used for engine dev.
 *
 * @ignore
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
export var Profiler = (function() {
    var times =  {};
    var startTimes = {};

    return {
        getTime: function (id)
        {
            return times[id];
        },

        startTiming: function (id)
        {
            if (!times[id]) times[id] = 0;
            startTimes[id] = Date.now();
        },

        stopTiming: function (id)
        {
            times[id] += Date.now() - startTimes[id];
        },

        resetTiming: function (id)
        {
            times[id] = 0;
        }
    }
})();