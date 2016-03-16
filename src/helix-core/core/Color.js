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

        if (HX.OPTIONS.usePreciseGammaCorrection) {
            target.r = Math.pow(this.r, 2.2);
            target.g = Math.pow(this.g, 2.2);
            target.b = Math.pow(this.b, 2.2);
        }
        else {
            target.r = this.r * this.r;
            target.g = this.g * this.g;
            target.b = this.b * this.b;
        }
        target.a = this.a;

        return target;
    },

    linearToGamma: function(target)
    {
        target = target || new HX.Color();

        if (HX.OPTIONS.usePreciseGammaCorrection) {
            target.r = Math.pow(this.r, .454545);
            target.g = Math.pow(this.g, .454545);
            target.b = Math.pow(this.b, .454545);
        }
        else {
            target.r = Math.sqrt(this.r);
            target.g = Math.sqrt(this.g);
            target.b = Math.sqrt(this.b);
        }
        target.a = this.a;

        return target;
    },

    copyFrom: function(color)
    {
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
    },

    toString: function()
    {
        return "Color(" + this.r + ", " + this.g + ", " + this.b + ", " + this.a + ")";
    }
};

HX.Color.BLACK = new HX.Color(0, 0, 0, 1);
HX.Color.ZERO = new HX.Color(0, 0, 0, 0);
HX.Color.RED = new HX.Color(1, 0, 0, 1);
HX.Color.GREEN = new HX.Color(0, 1, 0, 1);
HX.Color.BLUE = new HX.Color(0, 0, 1, 1);
HX.Color.YELLOW = new HX.Color(1, 1, 0, 1);
HX.Color.MAGENTA = new HX.Color(1, 0, 1, 1);
HX.Color.CYAN = new HX.Color(0, 1, 1, 1);
HX.Color.WHITE = new HX.Color(1, 1, 1, 1);