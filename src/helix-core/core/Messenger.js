import {Signal} from "./Signal";

/**
 * @classdesc
 * Messenger is a system that allows subscribing to named Signals.
 *
 * @constructor
 */
function Messenger()
{
    this._signals = {};
}

Messenger.prototype =
{
    /**
     * Dispatches the message with the given name.
     */
    broadcast: function(name, args)
    {
        var signal = this._signals[name];

        // if it doesn't exist, there are no listeners
        if (signal) {
            signal.dispatch.apply(signal, arguments);
        }
    },

    /**
     * Binds a function to the message with the given name. The callback's first argument will be the name string of the message.
     */
    bind: function(name, callback, thisRef)
    {
        var signal = this._signals[name];

        if (!signal) {
            signal = new Signal();
            this._signals[name] = signal;
        }

        signal.bind(callback, thisRef);
    },

    /**
     * Removes a bound callback function.
     */
    unbind: function(name, callback)
    {
        var signal = this._signals[name];
        signal.unbind(callback);
        if (!signal.hasListeners)
            delete this._signals[name];
    },

    /**
     * Returns whether or not anyone is listening to the given message.
     */
    hasListeners: function(name)
    {
        return !!this._signals[name];
    }
};

export { Messenger };