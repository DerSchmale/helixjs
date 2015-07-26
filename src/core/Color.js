/**
 * Hexadecimal representations are always 0xAARRGGBB
 * @param rOrHex
 * @param g
 * @param b
 * @param a
 * @constructor
 */
HX.Color = function(rOrHex, g, b, a)
{
    this.set(rOrHex, g, b, a);
};

HX.Color.prototype =
{
    set: function(rOrHex, g, b, a)
    {
        if (rOrHex === undefined) {
            this.a = 1.0;
            this.r = 1.0;
            this.g = 1.0;
            this.b = 1.0;
        }
        else if (g === undefined) {
            this.a = 1.0;
            this.r = ((rOrHex & 0xff0000) >>> 16) / 255.0;
            this.g = ((rOrHex & 0x00ff00) >>> 8) / 255.0;
            this.b = (rOrHex & 0x0000ff) / 255.0;
        }
        else {
            this.r = rOrHex;
            this.g = g;
            this.b = b;
            this.a = a === undefined ? 1.0 : a;
        }
    },

    hex: function()
    {
        var r = (Math.min(this.r, 1.0) * 0xff);
        var g = (Math.min(this.g, 1.0) * 0xff);
        var b = (Math.min(this.b, 1.0) * 0xff);

        return (r << 16) | (g << 8) | b;
    },

    luminance: function()
    {
        return this.r*.30 + this.g*0.59 + this.b*.11;
    },

    gammaToLinear: function(target)
    {
        target = target || new HX.Color();

        target.r = Math.pow(this.r, 2.2);
        target.g = Math.pow(this.g, 2.2);
        target.b = Math.pow(this.b, 2.2);
        target.a = this.a;

        return target;
    },

    linearToGamma: function(target)
    {
        target = target || new HX.Color();

        target.r = Math.pow(this.r,.454545);
        target.g = Math.pow(this.g,.454545);
        target.b = Math.pow(this.b,.454545);
        target.a = this.a;

        return target;
    }
};