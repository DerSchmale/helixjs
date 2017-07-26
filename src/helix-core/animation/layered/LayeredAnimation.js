import {onPreFrame} from "../../Helix";

/**
 * LayeredAnimation combines a bunch of AnimationLayer objects into a single manageable animation. This acts globally,
 * so it's not a {@linkcode Component} belonging to an {@linkcode Entity}
 *
 * @constructor
 */
function LayeredAnimation()
{
    this._layers = [];
    this._time = 0;
    this._timeScale = 1;
    this._name = null;
    this._looping = true;
}

LayeredAnimation.prototype = {
    /**
     * The name of the animation.
     */
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    /**
     * A value to control the playback speed.
     */
    get timeScale()
    {
        return this._timeScale;
    },
    set timeScale(value)
    {
        this._timeScale = value;
    },

    /**
     * The current time in milliseconds of the play head.
     */
    get time()
    {
        return this._time;
    },
    set time(value)
    {
        this._time = value;
        for (var i = 0; i < this._layers.length; ++i) {
            this._layers[i].time = value;
        }
    },

    /**
     * Determines whether the animation should loop or not. By default, it uses the value determined by the
     * AnimationClip, but can be overridden.
     */
    get looping()
    {
        return this._looping;
    },
    set looping(value)
    {
        this._looping = value
        for (var i = 0; i < this._layers.length; ++i) {
            this._layers[i].looping = true;
        }
    },

    /**
     * Adds a layer to the animation
     * @param layer
     */
    addLayer: function (layer)
    {
        this._layers.push(layer);
        layer.time = this._time;
        layer.looping = this._looping;
    },

    /**
     * Removes a layer from the animation
     * @param layer
     */
    removeLayer: function (layer)
    {
        var index = this._layers.indexOf(layer);
        if (index >= 0)
            this._layers.splice(index, 1);
    },

    /**
     * Starts playback of the animation
     */
    play: function ()
    {
        onPreFrame.bind(this._update, this);
    },

    /**
     * Stops playback of the animation
     */
    stop: function ()
    {
        onPreFrame.unbind(this._update);
    },

    /**
     * This needs to be called every frame.
     * @param dt The time passed since last frame in milliseconds.
     */
    _update: function (dt)
    {
        dt *= this._timeScale;

        this._time += dt;

        var len = this._layers.length;
        for (var i = 0; i < len; ++i) {
            this._layers[i].update(dt);
        }
    }
};

export { LayeredAnimation }