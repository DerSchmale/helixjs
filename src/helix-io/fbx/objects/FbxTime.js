HX.FbxTime = function(value)
{
    this._value = value;
};

HX.FbxTime.getSpan = function(start, stop)
{
    return new HX.FbxTime(stop._value - start._value);
};

HX.FbxTime.TC_MILLISECOND = 46186158;

HX.FbxTime.prototype =
{
    get milliseconds()
    {
        return this._value / HX.FbxTime.TC_MILLISECOND;
    },

    set milliseconds(value)
    {
        this._value = value * HX.FbxTime.TC_MILLISECOND;
    },

    getFrameCount: function(frameRate)
    {
        return Math.floor(this.milliseconds / 1000.0 * frameRate);
    },

    toString: function()
    {
        return "[FbxTime(name="+this._value+")]";
    }
};