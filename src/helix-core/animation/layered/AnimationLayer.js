import {AnimationPlayhead} from "../AnimationPlayhead";

var nameCounter = 0;

/**
 * @classdesc
 * AnimationLayer is a wrapper for a clip and a playhead that targets a specific object and that can be used in
 * LayeredAnimation.
 *
 * @param targetName The name of the target object. The name must match the name of an Entity, a MorphAnimation, a MeshInstance, or a SkeletonJoinr somewhere in the hierarchy of the animation's owning Entity
 * @param propertyName The name of the target object's animated property. Usually 'position', 'rotation', 'scale' or the name of a morph target.
 * @param clip The clip containing the keyframes for the animation
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayer(targetName, propertyName, clip)
{
    this._name = "hx_animationlayer_" + (nameCounter++);
    this._clip = clip;
    this._playhead = new AnimationPlayhead(clip);
    this._targetName = targetName;
    this._targetObject = null;
    this._propertyName = propertyName;
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
     * This finds the concrete objects belonging to the layers
     * @ignore
	 */
	resolveTarget: function(targets)
    {
        if (targets === null) {
            this._targetObject = null;
            return;
        }

        this._targetObject = targets[this._targetName]
        if (!this._targetObject) console.warn("Animation target '" + this._targetName + "' not found");
        this._verifyTarget();
    },

	/**
     * Allows testing whether the target is of the correct type for this layer.
     * @ignore
	 * @private
	 */
	_verifyTarget: function()
    {

    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[AnimationLayer(name=" + this.name + ")";
    },

	/**
	 * Creates a copy of this AnimationLayer object.
	 */
	clone: function()
    {
        throw new Error("Abstract method called!");
    }
};

export { AnimationLayer };