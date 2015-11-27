/**
 * Calculates the vector dot product for any object with x y and z, ignoring the w-component.
 */
HX.dot2 = function(a, b)
{
    return a.x * b.x + a.y * b.y;
};

/**
 * Calculates the vector dot product for any object with x y and z, ignoring the w-component.
 */
HX.dot3 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z;
};

/**
 * Calculates the full 4-component dot product.
 */
HX.dot4 = function(a, b)
{
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
};

HX.RCP_LOG_OF_2 = 1.0 / Math.log(2);

HX.log2 = function(value)
{
    return Math.log(value) * HX.RCP_LOG_OF_2;
};

HX.clamp = function(value, min, max)
{
    return  value < min?    min :
            value > max?    max :
                            value;
};

HX.saturate = function(value)
{
    return HX.clamp(value, 0.0, 1.0);
};