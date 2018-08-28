import {MathX} from "../math/MathX";

/**
 * @classdesc
 * AnimationPlayhead is a 'helper' class that just updates a play head. Returns the keyframes and the ratio between them.
 * This is for example used in {@linkcode SkeletonClipNode}.
 *
 * @param {AnimationClip} clip The clip to play.
 * @param {Boolean} looping Determines whether the animation should loop or not. By default, it uses the value determined
 * by the AnimationClip, but can be overridden.
 *
 * @constructor
 *
 * @propety playbackRate A value to control the playback speed.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationPlayhead(clip)
{
	this.playbackRate = 1.0;
	this._clip = clip;
	this._time = 0;
    this._isPlaying = true;
    this._currentFrameIndex = 0;
    this._timeChanged = true;

    this.looping = clip.looping;

    /**
     * The number of times the playhead has wrapped during the last update. Useful when moving skeleton root joint, fe.
     * @type {number}
     */
    this.wraps = 0;

    /**
     * The first frame before the playhead's current position.
     * @type {number}
     */
    this.frame1 = 0;

    /**
     * The frame right after the playhead's current position.
     * @type {number}
     */
    this.frame2 = 0;

    /**
     * The ratio of the play head's position between frame1 and frame2. This is used to interpolate between frame1 and frame2's keyframe values.
     * @type {number}
     */
    this.ratio = 0;
}

AnimationPlayhead.prototype =
    {
        /**
         * The current time in milliseconds of the play head.
         */
        get time() { return this._time; },
        set time(value)
        {
            if (!this.looping)
                value = MathX.clamp(value, 0, this._clip.duration);

            if (this._time === value) return;
            this._time = value;
            this._timeChanged = true;
        },

        /**
         * Starts updating the play head when update(dt) is called.
         */
        play: function()
        {
            this._isPlaying = true;
        },

        /**
         * Stops updating the play head when update(dt) is called.
         */
        stop: function()
        {
            this._isPlaying = false;
        },

        /**
         * This needs to be called every frame.
         * @param dt The time passed since last frame in milliseconds.
         * @returns {boolean} Whether or not the playhead moved. This can be used to spare further calculations if the old state is kept.
         */
        update: function(dt)
        {
            var playheadUpdated = (this._isPlaying && dt !== 0.0);
            if (!playheadUpdated && !this._timeChanged)
                return false;

            this._timeChanged = false;

            if (this._isPlaying) {
                dt *= this.playbackRate;
                this._time += dt;
            }

            var clip = this._clip;
            // the last keyframe is just an "end marker" to interpolate with, it has no duration
            var numKeyFrames = clip.numKeyFrames;
            var numBaseFrames = numKeyFrames - 1;
            var duration = clip.duration;
            var wraps = 0;

            if (!this.looping) {
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
                while (this.looping && this._time >= duration) {
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
                while (this.looping && this._time < 0) {
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