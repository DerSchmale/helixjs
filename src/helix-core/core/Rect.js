/**
 * @classdesc
 * Rect is a value object describing an axis-aligned rectangle.
 * @param x The x-coordinate of the "top-left" corner.
 * @param y The y-coordinate of the "top-left" corner.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
export function Rect(x, y, width, height)
{
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
}