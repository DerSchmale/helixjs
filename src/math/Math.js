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