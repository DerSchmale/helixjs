/**
 * Values for classifying a point or object to a plane
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
export var PlaneSide = {
    /**
     * Entirely on the front side of the plane
     */
    FRONT: 1,

    /**
     * Entirely on the back side of the plane
     */
    BACK: -1,

    /**
     * Intersecting the plane.
     */
    INTERSECTING: 0
};