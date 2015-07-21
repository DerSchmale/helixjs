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
    getType: function()
    {
        return this._type;
    },

    setType: function(type)
    {
        this._type = type;
    },

    getData: function ()
    {
        return this._data;
    },

    getMethod: function ()
    {
        return this._method;
    },

    setMethod: function (value)
    {
        this._method = value;
    },

    getTimeoutDuration: function ()
    {
        return this._timeout;
    },

    setTimeoutDuration: function (milliseconds)
    {
        this._timeout = milliseconds;
    },

    setParameters: function (params)
    {
        this._params = params;
    },

    load: function (url)
    {
        var request = new XMLHttpRequest();
        request.open(this._method, url, true);
        request.timeout = this._timeout;
        var _this = this;

        request.ontimeout = function ()
        {
            _this.onError(HX.URLLoader.ERROR_TIME_OUT);
        };

        request.onreadystatechange = function ()
        {
            var DONE = this.DONE || 4;
            if (this.readyState === DONE) {
                if (this.status == 200) {
                    this._data = this._type == HX.URLLoader.DATA_TEXT? request.responseText : request.response;
                    if (_this.onComplete) _this.onComplete(this._data);
                }
                else if (_this.onError)
                    _this.onError(this.status);
            }
        };

        request.send(this._params);
    },

    // made to assign
    onComplete: function (onComplete)
    {
    },

    onError: function (errorStatus)
    {
    }
};