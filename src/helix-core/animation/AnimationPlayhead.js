/**
 * AnimationPlayhead is a 'helper' class that just updates a playhead. Returns the keyframes and the ratio between them
 * @param clip
 * @constructor
 */
import {MathX} from "../math/MathX";
function AnimationPlayhead(clip)
{
    this._clip = clip;
    this._time = 0;
    this._timeScale = 1.0;
    this._isPlaying = true;
    this._currentFrameIndex = 0;
    this._timeChanged = true;

    this._looping = clip.looping;

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
        get timeScale() { return this._timeScale; },
        set timeScale(value) { this._timeScale = value; },

        get looping() { return this._looping; },
        set looping(value) { this._looping = value},

        get time() { return this._time; },
        set time(value)
        {
            if (!this._looping)
                value = MathX.clamp(value, 0, this._clip.duration);

            if (this._time === value) return;
            this._time = value;
            this._timeChanged = true;
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
            var playheadUpdated = (this._isPlaying && dt !== 0.0);
            if (!playheadUpdated && !this._timeChanged)
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

            if (!this._looping) {
                if (this._time > duration) {
                    this._time = duration;
                    this._isPlaying = false;
                }
                else if (this._time < 0) {
                    this._time = 0;
                    this._isPlaying = false;
                }
            }

            var frameA, frameB;

            if (dt >= 0) {
                // could replace the while loop with an if loop and calculate wrap with division, but it's usually not more
                // than 1 anyway
                while (this._looping && this._time >= duration) {
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
            else if (dt < 0) {
                while (this._looping && this._time < 0) {
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