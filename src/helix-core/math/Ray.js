import {Float4} from "./Float4";
/**
 * @classdesc
 * Ray class bundles an origin point and a direction vector for ray-intersection tests.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Ray()
{
    /**
     * The origin point of the ray.
     */
    this.origin = new Float4(0, 0, 0, 1);

    /**
     * The direction vector of the ray.
     */
    this.direction = new Float4(0, 0, 0, 0);
}

Ray.prototype =
{
    /**
     * Transforms a given ray and stores it in this one.
     * @param ray The ray to transform.
     * @param matrix The matrix containing the transformation.
     */
    transformFrom: function(ray, matrix)
    {
        matrix.transformPoint(ray.origin, this.origin);
        matrix.transformVector(ray.direction, this.direction);
        this.direction.normalize();
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "Ray(\n" +
                "origin: " + this.origin.toString() + "\n" +
                "direction: " + this.direction.toString() + "\n" +
                ")";
    }
};

export { Ray };