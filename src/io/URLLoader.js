HX.URLLoader = function ()
{
    this._params = undefined;
    this._data = null;
    this._timeout = 5000;
    this._method = 'GET';
    this._type = HX.URLLoader.DATA_TEXT;
};

HX.URLLoader.ERROR_TIME_OUT = 408;
HX.URLLoader.METHOD_GET = 'get';
HX.URLLoader.METHOD_POST = 'post';

HX.URLLoader.DATA_TEXT = 0;
HX.URLLoader.DATA_BINARY = 1;

HX.URLLoader.prototype =
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

    load: function (url)
    {
        var request = new XMLHttpRequest();
        request.open(this._method, url, true);
        request.timeout = this._timeout;
        var self = this;

        request.ontimeout = function ()
        {
            self.onError(HX.URLLoader.ERROR_TIME_OUT);
        };

        request.onreadystatechange = function ()
        {
            var DONE = this.DONE || 4;
            if (this.readyState === DONE) {
                if (this.status === 200) {
                    this._data = this._type == HX.URLLoader.DATA_TEXT? request.responseText : request.response;
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