import { META } from '../Helix';

/**
 * @classdesc
 * Color is an object representing an RGBA color. It can contain HDR values (> 1).
 *
 * @param rOrHex The red component of the colour or a hexadecimal representation of the entire colour.
 * @param g The green component of the colour or omitted in favor of the hexadecimal representation.
 * @param b The blue component of the colour or omitted in favor of the hexadecimal representation.
 * @param a The alpha component of the colour or omitted in favor of the hexadecimal representation.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Color(rOrHex, g, b, a)
{
    /**
     * The green component of the colour.
     * @type {number}
     */
    this.r = 0.0;

    /**
     * The green component of the colour.
     * @type {number}
     */
    this.g = 0.0;

    /**
     * The blue component of the colour.
     * @type {number}
     */
    this.b = 0.0;

    /**
     * The alpha component of the colour.
     * @type {number}
     */
    this.a = 1.0;
    this.set(rOrHex, g, b, a);
}

/**
 * Linearly interpolates between two Colors.
 * @param {Color} a The first color to interpolate from.
 * @param {Color} b The second color to interpolate to.
 * @param {Number} t The interpolation factor.
 * @param {Color} [target] An optional target color. If not provided, a new Color object will be created and returned.
 * @returns {Color} The interpolated color.
 */
Color.lerp = function(a, b, t, target)
{
    target = target || new Color();
    var ar = a.r, ag = a.g, ab = a.b, aa = a.a;

    target.r = ar + (b.r - ar) * t;
    target.g = ag + (b.g - ag) * t;
    target.b = ab + (b.b - ab) * t;
    target.a = aa + (b.a - aa) * t;
    return target;
};

Color.prototype =
{
    /**
     * Sets the color values directly.
     * @param rOrHex The red component of the colour or a hexadecimal representation of the entire colour.
     * @param g The green component of the colour or omitted in favor of the hexadecimal representation.
     * @param b The blue component of the colour or omitted in favor of the hexadecimal representation.
     * @param a The alpha component of the colour or omitted in favor of the hexadecimal representation.
     */
    set: function (rOrHex, g, b, a)
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

    /**
     * Scales all components (except alpha).
     */
    scale: function(s)
    {
        this.r *= s;
        this.g *= s;
        this.b *= s;
    },

    /**
     * Returns a numerical representation of the entire colour. Only works for non-HDR color values.
     */
    hex: function ()
    {
        var r = (Math.min(this.r, 1.0) * 0xff);
        var g = (Math.min(this.g, 1.0) * 0xff);
        var b = (Math.min(this.b, 1.0) * 0xff);

        return (r << 16) | (g << 8) | b;
    },

    /**
     * Returns the luminance value of the color.
     */
    luminance: function ()
    {
        return this.r * .30 + this.g * 0.59 + this.b * .11;
    },

    /**
     * Converts the color from gamma space to linear space.
     * @param [target] An optional target Color. If not provided, a new Color object will be created and returned.
     * @returns {Color} The Color in linear space.
     *
     * @see {@link http://www.kinematicsoup.com/news/2016/6/15/gamma-and-linear-space-what-they-are-how-they-differ}
     */
    gammaToLinear: function (target)
    {
        target = target || new Color();

        if (META.OPTIONS.usePreciseGammaCorrection) {
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

    /**
     * Converts the color from linear space to gamma space.
     * @param [target] An optional target Color. If not provided, a new Color object will be created and returned.
     * @returns {Color} The Color in linear space.
     *
     * @see {@link http://www.kinematicsoup.com/news/2016/6/15/gamma-and-linear-space-what-they-are-how-they-differ}
     */
    linearToGamma: function (target)
    {
        target = target || new Color();

        if (META.OPTIONS.usePreciseGammaCorrection) {
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

    /**
     * Copies the values from another Color object.
     */
    copyFrom: function (color)
    {
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
    },

    /**
     * @ignore
     */
    toString: function ()
    {
        return "Color(" + this.r + ", " + this.g + ", " + this.b + ", " + this.a + ")";
    },

    /**
     * Returns a copy of this Color.
     */
    clone: function ()
    {
        var color = new Color();
        color.r = this.r;
        color.g = this.g;
        color.b = this.b;
        color.a = this.a;
        return color;
    }
};

/**
 * Preset for black with alpha 1
 */
Color.BLACK = new Color(0, 0, 0, 1);
/**
 * Preset for black with alpha 0
 */
Color.ZERO = new Color(0, 0, 0, 0);
/**
 * Preset for red
 */
Color.RED = new Color(1, 0, 0, 1);
/**
 * Preset for green
 */
Color.GREEN = new Color(0, 1, 0, 1);
/**
 * Preset for blue
 */
Color.BLUE = new Color(0, 0, 1, 1);
/**
 * Preset for yellow
 */
Color.YELLOW = new Color(1, 1, 0, 1);
/**
 * Preset for magenta
 */
Color.MAGENTA = new Color(1, 0, 1, 1);
/**
 * Preset for cyan
 */
Color.CYAN = new Color(0, 1, 1, 1);
/**
 * Preset for white
 */
Color.WHITE = new Color(1, 1, 1, 1);
/**
 * Preset for 50% rgb and alpha
 */
Color.HALF = new Color(.5, .5, .5, .5);

export { Color };