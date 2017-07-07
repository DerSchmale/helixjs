/**
 * AnimationPlayhead is a 'helper' class that just updates a playhead. Returns the keyframes and the ratio between them
 * @param clip
 * @constructor
 */
function AnimationPlayhead(clip)
{
    this._clip = clip;
    this._time = 0;
    this._timeScale = 1.0;
    this._isPlaying = true;
    this._currentFrameIndex = 0;
    this._timeChanged = true;

    // the number of times the playhead has wrapped during the last update. Useful when moving skeleton root bone, fe.
    this.wraps = 0;

    // the playhead is currently between these two frames:
    this.frame1 = 0;
    this.frame2 = 0;

    // the ratio of the position of the playhead, used for lerping frame1 and frame2
    this.ratio = 0;
}

AnimationPlayhead.prototype =
{
    timeScale: {
        get: function() { return this._timeScale; },
        set: function(value) { this._timeScale = value; }
    },

    time: {
        get: function() { return this._animationClipPlayer; },
        set: function(value)
        {
            this._time = value;
            this._timeChanged = true;
        }
    },

    play: function()
    {
        this._isPlaying = true;
    },

    stop: function()
    {
        this._isPlaying = false;
    },

    update: function(dt)
    {
        if ((!this._isPlaying || dt === 0.0) && !this._timeChanged)
            return false;

        this._timeChanged = false;

        if (this._isPlaying) {
            dt *= this._timeScale;
            this._time += dt;
        }

        var clip = this._clip;
        // the last keyframe is just an "end marker" to interpolate with, it has no duration
        var numKeyFrames = clip.numKeyFrames;
        var numBaseFrames = numKeyFrames - 1;
        var duration = clip.duration;
        var wraps = 0;

        var frameA, frameB;

        if (dt > 0) {
            // could replace the while loop with an if loop and calculate wrap with division, but it's usually not more
            // than 1 anyway
            while (this._time >= duration) {
                // reset playhead to make sure progressive update logic works
                this._currentFrameIndex = 0;
                this._time -= duration;
                ++wraps;
            }

            do {
                // advance play head
                if (++this._currentFrameIndex === numKeyFrames) this._currentFrameIndex = 0;
                frameB = clip.getKeyFrame(this._currentFrameIndex);
            } while (frameB.time < this._time);

            --this._currentFrameIndex;
            frameA = clip.getKeyFrame(this._currentFrameIndex);
        }
        else {
            while (this._time < 0) {
                // reset playhead to make sure progressive update logic works
                this._currentFrameIndex = numBaseFrames;
                this._time += duration;
                ++wraps;
            }

            ++this._currentFrameIndex;
            do {
                if (--this._currentFrameIndex < 0) this._currentFrameIndex = numKeyFrames;
                frameA = clip.getKeyFrame(this._currentFrameIndex);
            } while (frameA.time > this._time);
        }

        this.wraps = wraps;
        this.frame1 = frameA;
        this.frame2 = frameB;
        this.ratio = (this._time - frameA.time) / (frameB.time - frameA.time);

        return true;
    }
};

export { AnimationPlayhead };