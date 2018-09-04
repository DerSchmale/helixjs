import {Signal} from "../core/Signal";

/**
 * AsyncTaskQueue allows queueing a bunch of functions which are executed "whenever", in order.
 *
 * @classdesc
 *
 * @constructor
 */
function AsyncTaskQueue()
{
    this.onComplete = new Signal();
    this.onProgress = new Signal();
    this._queue = [];
    this._childQueues = [];
    this._currentIndex = 0;
    this._isRunning = false;
	this._timeout = undefined;
}

AsyncTaskQueue.prototype = {
	/**
	 * Indicates whether the queue is currently running or not.
	 */
	get isRunning() { return this._isRunning },

	/**
     * Adds a function to execute. Provide the parameters for the function as parameters after the function.
	 */
	queue: function(func, rest)
    {
        // V8 engine doesn't perform well if not copying the array first before slicing
        var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));

        this._queue.push({
            func: func,
            args: args.slice(1)
        });
    },

	/**
     * Adds a child queue to execute. This can be done by queued tasks while this queue is already running.
	 */
    addChildQueue: function(queue)
    {
        this._childQueues.push(queue);
    },

	/**
     * Starts execution of the tasks in the queue.
	 */
	execute: function()
    {
        if (this._isRunning)
            throw new Error("Already running!");

        this._isRunning = true;
        this._currentIndex = 0;

        this._executeTask();
    },

	/**
     * Cancels execution of the queue.
	 */
	cancel: function()
    {
        if (!this._isRunning) return;
        if (this._timeout !== undefined)
            clearTimeout(this._timeout);

        this._isRunning = false;
        this._timeout = undefined;
    },

	/**
     * @ignore
	 * @private
	 */
	_executeTask: function()
    {
        this._timeout = setTimeout(this._executeImpl.bind(this));
    },

	/**
	 * @ignore
	 * @private
	 */
    _executeImpl: function()
    {
        // cancelled
        if (!this._isRunning) return;

        this.onProgress.dispatch(this._currentIndex / this._queue.length);

        if (this._childQueues.length > 0) {
            var queue = this._childQueues.shift();
            queue.onComplete.bind(this._executeImpl, this);
            queue.execute();
        }
        else if (this._queue.length === this._currentIndex) {
			this._isRunning = false;
            this.onComplete.dispatch();
        }
        else {
            var elm = this._queue[this._currentIndex];
            elm.func.apply(this, elm.args);
            ++this._currentIndex;
            this._executeTask();
        }
    }
};

export { AsyncTaskQueue };