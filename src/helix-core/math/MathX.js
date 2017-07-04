var RCP_LOG_OF_2 = 1.0 / Math.log(2);

var MathX = {
    DEG_TO_RAD: Math.PI / 180.0,
    RAD_TO_DEG: 180.0 / Math.PI,

    sign: function(v)
    {
        return  v === 0.0? 0.0 :
            v > 0.0? 1.0 : -1.0;
    },

    isPowerOfTwo: function(value)
    {
        return value? ((value & -value) === value) : false;
    },

    log2: function(value)
    {
        return Math.log(value) * RCP_LOG_OF_2;
    },

    clamp: function(value, min, max)
    {
        return  value < min?    min :
            value > max?    max :
                value;
    },

    saturate: function(value)
    {
        return MathX.clamp(value, 0.0, 1.0);
    },

    lerp: function(a, b, factor)
    {
        return a + (b - a) * factor;
    }
};

export { MathX };