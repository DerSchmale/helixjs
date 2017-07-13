function FbxTime(value)
{
    this._value = value;
}

FbxTime.getSpan = function(start, stop)
{
    return new FbxTime(stop._value - start._value);
};

FbxTime.TC_MILLISECOND = 46186158;

FbxTime.prototype =
{
    get milliseconds()
    {
        return this._value / FbxTime.TC_MILLISECOND;
    },

    set milliseconds(value)
    {
        this._value = value * FbxTime.TC_MILLISECOND;
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

export {FbxTime};