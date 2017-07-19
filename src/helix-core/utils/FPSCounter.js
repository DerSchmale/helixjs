/**
 * @classdesc
 * A utility class to keep track of teh frame rate. It keeps a running average for the last few frames.
 *
 * @param numFrames The amount of frames to average.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FPSCounter(numFrames)
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
}

FPSCounter.prototype =
{
    /**
     * Updates the counter with a new frame time
     * @param dt The time in milliseconds since the last frame
     */
    update: function(dt)
    {
        this._currentFPS = 1000 / dt;

        this._runningSum -= this._frames[this._index];
        this._runningSum += this._currentFPS;
        this._averageFPS = this._runningSum / this._numFrames;
        this._frames[this._index++] = this._currentFPS;

        if (this._index === this._numFrames) this._index = 0;

        if (this._maxFPS === undefined || this._currentFPS > this._maxFPS)
            this._maxFPS = this._currentFPS;

        if (this._minFPS === undefined || this._currentFPS < this._minFPS)
            this._minFPS = this._currentFPS;


    },

    /**
     * Returns the last frame's fps.
     */
    get lastFrameFPS()
    {
        return Math.round(this._currentFPS);
    },

    /**
     * Returns the running average fps.
     */
    get averageFPS()
    {
        return Math.round(this._averageFPS);
    },

    /**
     * Returns the maximum fps since last reset.
     */
    get maxFPS()
    {
        return Math.round(this._maxFPS);
    },

    /**
     * Returns the minimum fps since last reset.
     */
    get minFPS()
    {
        return Math.round(this._minFPS);
    },

    /**
     * Resets minimum and maximum fps stats.
     */
    reset: function()
    {
        this._maxFPS = undefined;
        this._minFPS = undefined;
    }
};

export { FPSCounter };