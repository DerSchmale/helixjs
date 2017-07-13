/**
 * @classdesc
 * <p>Signal provides an implementation of the Observer pattern. Functions can be bound to the Signal, and they will be
 * called when the Signal is dispatched. This implementation allows for keeping scope.</p>
 * <p>When dispatch has an object passed to it, this is called the "payload" and will be passed as a parameter to the
 * listener functions</p>
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Signal()
{
    this._listeners = [];
    this._lookUp = {};
}

/**
 * Signals keep "this" of the caller, because having this refer to the signal itself would be silly
 */
Signal.prototype =
{
    /**
     * Binds a function as a listener to the Signal
     * @param listener A function to be called when the function is dispatched.
     * @param [thisRef] If provided, the object that will become "this" in the function. Used in a class as such:
     *
     * @example
     * signal.bind(this.methodFunction, this);
     */
    bind: function(listener, thisRef)
    {
        this._lookUp[listener] = this._listeners.length;
        var callback = thisRef? listener.bind(thisRef) : listener;
        this._listeners.push(callback);
    },

    /**
     * Removes a function as a listener.
     */
    unbind: function(listener)
    {
        var index = this._lookUp[listener];
        this._listeners.splice(index, 1);
        delete this._lookUp[listener];
    },

    /**
     * Dispatches the signal, causing all the listening functions to be called.
     * @param [payload] An optional object to be passed in as a parameter to the listening functions. Can be used to provide data.
     */
    dispatch: function(payload)
    {
        var len = this._listeners.length;
        for (var i = 0; i < len; ++i)
            this._listeners[i](payload);
    },

    /**
     * Returns whether there are any functions bound to the Signal or not.
     */
    get hasListeners()
    {
        return this._listeners.length > 0;
    }
};

export { Signal };