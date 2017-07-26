import {AnimationPlayhead} from "../AnimationPlayhead";

/**
 * @classdesc
 * AnimationLayer is a wrapper for a clip and a playhead that targets a specific object and that can be used in
 * LayeredAnimation.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayer(targetObject, clip)
{
    this._name = null;
    this._clip = clip;
    this._playhead = new AnimationPlayhead(clip);
    this._targetObject = targetObject;
}

AnimationLayer.prototype =
{
    /**
     * Defines whether this layer should repeat or not.
     */
    get looping()
    {
        return this._playhead.looping;
    },

    set looping(value)
    {
        this._playhead.looping = value;
    },

    /**
     * The current time in milliseconds of the play head.
     */
    get time() { return this._playhead.time; },
    set time(value) { this._playhead.time = value; },

    /**
     * The total duration of the layer, in milliseconds.
     */
    get duration()
    {
        return this._clip.duration;
    },

    /**
     * Returns the key frame with the given index.
     */
    getKeyFrame: function(index)
    {
        return this._clip.getKeyFrame(index);
    },

    /**
     * This needs to be called every frame.
     * @param dt The time passed since last frame in milliseconds.
     * @returns {boolean} Whether or not the playhead moved. This can be used to spare further calculations if the old state is kept.
     */
    update: function(dt)
    {
        // this._playhead.update(dt);
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[AnimationLayer(name=" + this.name + ")";
    }
};

export { AnimationLayer };