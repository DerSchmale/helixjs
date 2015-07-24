/**
 *
 * @param numFrames The amount of frames to average
 * @constructor
 */
HX.FPSCounter = function(numFrames)
{
    this._numFrames = numFrames || 1;
    this._frames = [ ];
    this._maxFPS = undefined;
    this._minFPS = undefined;
    this._currentFPS = 0;
    this._averageFPS = 0;
    this._runningSum = 0;

    for (var i = 0; i < this._numFrames; ++i)
        this._frames[i] = 0;

    this._index = 0;
};

HX.FPSCounter.prototype =
{
    /**
     * Updates the counter with a new frame time
     * @param dt The time in milliseconds for the last frame
     */
    update: function(dt)
    {
        this._currentFPS = 1000 / dt;

        this._runningSum -= this._frames[this._index];
        this._runningSum += this._currentFPS;
        this._averageFPS = this._runningSum / this._numFrames;
        this._frames[this._index++] = this._currentFPS;

        if (this._index == this._numFrames) this._index = 0;

        if (this._maxFPS === undefined || this._currentFPS > this._maxFPS)
            this._maxFPS = this._currentFPS;

        if (this._minFPS === undefined || this._currentFPS < this._minFPS)
            this._minFPS = this._currentFPS;


    },

    getLastFrameFPS: function()
    {
        return Math.round(this._currentFPS);
    },

    getAverageFPS: function()
    {
        return Math.round(this._averageFPS);
    },

    getMaxFPS: function()
    {
        return Math.round(this._maxFPS);
    },

    getMinFPS: function()
    {
        return Math.round(this._minFPS);
    },

    reset: function()
    {
        this._maxFPS = undefined;
        this._minFPS = undefined;
    }

};