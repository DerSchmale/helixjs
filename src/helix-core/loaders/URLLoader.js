/**
 * @ignore
 *
 * @classdesc
 * URLLoader loads any sort of file. It exists only to hide ugly XMLHttpRequest stuff.
 *
 * @param [headers] Optional headers (key/value pairs) to pass along to the request.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function URLLoader(headers)
{
    this._params = undefined;
    this._data = null;
    this._timeout = 0;
    this._method = 'GET';
    this._type = URLLoader.DATA_TEXT;
    this._headers = headers || {};
}

URLLoader.ERROR_TIME_OUT = 408;
URLLoader.METHOD_GET = 'get';
URLLoader.METHOD_POST = 'post';

URLLoader.DATA_TEXT = 0;
URLLoader.DATA_BINARY = 1;

URLLoader.prototype =
{
    get type()
    {
        return this._type;
    },

    set type(value)
    {
        this._type = value;
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

    get data()
    {
        return this._data;
    },

    setRequestHeader: function(name, value)
    {
        this._headers[name] = value;
    },

    load: function (url)
    {
        var request = new XMLHttpRequest();
        request.open(this._method, url, true);

        for (var key in this._headers) {
            if (this._headers.hasOwnProperty(key))
                request.setRequestHeader(key, this._headers[key]);
        }

        if (this._timeout) {
            request.timeout = this._timeout;

            request.ontimeout = function ()
            {
                self.onError(URLLoader.ERROR_TIME_OUT);
            };
        }

        if (this._type === URLLoader.DATA_BINARY)
            request.responseType = "arraybuffer";
        else
            request.overrideMimeType("application/json");

        var self = this;

        request.onreadystatechange = function ()
        {
            var DONE = this.DONE || 4;
            if (this.readyState === DONE) {
                if (this.status === 200) {
                    this._data = self._type === URLLoader.DATA_TEXT? request.responseText : new DataView(request.response);
                    if (self.onComplete) self.onComplete(this._data);
                }
                else if (self.onError)
                    self.onError(this.status);
            }
        };

        request.send(this._params);
    },

    // made to assign
    onComplete: function (data)
    {
    },

    onError: function (errorStatus)
    {
    }
};

export { URLLoader };