/**
 * TODO: Remove in favour of AssetLibrary
 * @constructor
 */
import {URLLoader} from "./URLLoader";
function BulkURLLoader()
{
    this._params = undefined;
    this._timeout = 5000;
    this._method = 'GET';
    this._type = URLLoader.DATA_TEXT;
    this._abortOnFail = false;

    this._files = null;
    this._index = 0;
    this._data = null;
};

BulkURLLoader.prototype =
{
    getData: function(filename)
    {
        return this._data[filename];
    },

    get type()
    {
        return this._type;
    },

    set type(value)
    {
        this._type = value;
    },

    get abortOnFail()
    {
        return this._abortOnFail;
    },

    set abortOnFail(value)
    {
        this._abortOnFail = value;
    },

    get method()
    {
        return this._method;
    },

    set method(value)
    {
        this._method = value;
    },

    get timeoutDuration()
    {
        return this._timeout;
    },

    set timeoutDuration(milliseconds)
    {
        this._timeout = milliseconds;
    },

    get parameters()
    {
        return this._params;
    },

    set parameters(params)
    {
        this._params = params;
    },

    load: function(files)
    {
        this._files = files;
        this._data = {};
        this._index = 0;

        this._loadQueued();
    },

    _loadQueued: function()
    {
        if (this._index === this._files.length) {
            this.onComplete();
            return;
        }

        var urlLoader = new URLLoader();
        urlLoader.parameters = this._params;
        urlLoader.timeoutDuration = this._timeout;
        urlLoader.method = this._method;
        urlLoader.type = this._type;

        var self = this;
        urlLoader.onComplete = function(data)
        {
            var filename = self._files[self._index];
            self._data[filename] = data;
            ++self._index;
            self._loadQueued();
        };

        urlLoader.onFail = function() {
            self.onFail();
            if (self._abortOnFail)
                return;
            else
                urlLoader.onComplete(null);
        };

        urlLoader.load(this._files[this._index]);
    },

    // made to assign
    onComplete: function (data)
    {
    },

    onError: function (errorStatus)
    {
    }
};

export { BulkURLLoader };