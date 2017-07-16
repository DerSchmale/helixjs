import {Float4} from "../math/Float4";

/**
 * @classdesc
 * BoundingVolume forms an abstract base class for axis-aligned bounding volumes, used in the scene hierarchy.
 *
 * @param type The type of bounding volume.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BoundingVolume(type)
{
    this._type = type;

    this._expanse = BoundingVolume.EXPANSE_EMPTY;
    this._minimumX = 0.0;
    this._minimumY = 0.0;
    this._minimumZ = 0.0;
    this._maximumX = 0.0;
    this._maximumY = 0.0;
    this._maximumZ = 0.0;
    this._halfExtentX = 0.0;
    this._halfExtentY = 0.0;
    this._halfExtentZ = 0.0;
    this._center = new Float4();
}

/**
 * Indicates the bounds are empty
 */
BoundingVolume.EXPANSE_EMPTY = 0;

/**
 * Indicates the bounds are infinitely large
 */
BoundingVolume.EXPANSE_INFINITE = 1;

/**
 * Indicates the bounds have a real size and position
 */
BoundingVolume.EXPANSE_FINITE = 2;

BoundingVolume._testAABBToSphere = function(aabb, sphere)
{
    // b = sphere var max = aabb._maximum;
    var maxX = sphere._maximumX;
    var maxY = sphere._maximumY;
    var maxZ = sphere._maximumZ;
    var minX = aabb._minimumX;
    var minY = aabb._minimumY;
    var minZ = aabb._minimumZ;
    var radius = sphere._halfExtentX;
    var centerX = sphere._center.x;
    var centerY = sphere._center.y;
    var centerZ = sphere._center.z;
    var dot = 0, diff;

    if (minX > centerX) {
        diff = centerX - minX;
        dot += diff * diff;
    }
    else if (maxX < centerX) {
        diff = centerX - maxX;
        dot += diff * diff;
    }

    if (minY > centerY) {
        diff = centerY - minY;
        dot += diff * diff;
    }
    else if (maxY < centerY) {
        diff = centerY - maxY;
        dot += diff * diff;
    }

    if (minZ > centerZ) {
        diff = centerZ - minZ;
        dot += diff * diff;
    }
    else if (maxZ < centerZ) {
        diff = centerZ - maxZ;
        dot += diff * diff;
    }

    return dot < radius * radius;
};

BoundingVolume.prototype =
{
    /**
     * Describes the size of the bounding box. {@linkcode BoundingVolume#EXPANSE_EMPTY}, {@linkcode BoundingVolume#EXPANSE_FINITE}, or {@linkcode BoundingVolume#EXPANSE_INFINITE}
     */
    get expanse() { return this._expanse; },

    /**
     * @ignore
     */
    get type() { return this._type; },

    growToIncludeMesh: function(mesh) { throw new Error("Abstract method!"); },
    growToIncludeBound: function(bounds) { throw new Error("Abstract method!"); },
    growToIncludeMinMax: function(min, max) { throw new Error("Abstract method!"); },

    /**
     * Clear the bounds.
     * @param expanseState The state to reset to. Either {@linkcode BoundingVolume#EXPANSE_EMPTY} or {@linkcode BoundingVolume#EXPANSE_INFINITE}.
     */
    clear: function(expanseState)
    {
        this._minimumX = this._minimumY = this._minimumZ = 0;
        this._maximumX = this._maximumY = this._maximumZ = 0;
        this._center.set(0, 0, 0);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = 0;
        this._expanse = expanseState === undefined? BoundingVolume.EXPANSE_EMPTY : expanseState;
    },

    /**
     * The minimum reach of the bounds, described as a box range.
     */
    get minimum() { return new Float4(this._minimumX, this._minimumY, this._minimumZ, 1.0); },

    /**
     * The maximum reach of the bounds, described as a box range.
     */
    get maximum() { return new Float4(this._maximumX, this._maximumY, this._maximumZ, 1.0); },

    /**
     * The center coordinate of the bounds
     */
    get center() { return this._center; },

    /**
     * The half extents of the bounds. These are the half-dimensions of the box encompassing the bounds from the center.
     */
    get halfExtent() { return new Float4(this._halfExtentX, this._halfExtentY, this._halfExtentZ, 0.0); },

    /**
     * The radius of the sphere encompassing the bounds. This is implementation-dependent, because the radius is less precise for a box than for a sphere
     */
    getRadius: function() { throw new Error("Abstract method!"); },

    /**
     * Transforms a bounding volume and stores it in this one.
     * @param {BoundingVolume} sourceBound The bounds to transform.
     * @param {Matrix4x4} matrix The matrix containing the transformation.
     */
    transformFrom: function(sourceBound, matrix) { throw new Error("Abstract method!"); },

    /**
     * Tests whether the bounds intersects a given convex solid. The convex solid is described as a list of planes pointing outward. Infinite solids are also allowed (Directional Light frusta without a near plane, for example)
     * @param cullPlanes An Array of planes to be tested. Planes are simply Float4 objects.
     * @param numPlanes The amount of planes to be tested against. This so we can test less planes than are in the cullPlanes array (Directional Light frusta, for example)
     * @returns {boolean} Whether or not the bounds intersect the solid.
     */
    intersectsConvexSolid: function(cullPlanes, numPlanes) { throw new Error("Abstract method!"); },

    /**
     * Tests whether the bounds intersect another bounding volume
     */
    intersectsBound: function(bound) { throw new Error("Abstract method!"); },

    /**
     * Tests on which side of the plane the bounding box is (front, back or intersecting).
     * @param plane The plane to test against.
     * @return {PlaneSide} The side of the plane
     */
    classifyAgainstPlane: function(plane) { throw new Error("Abstract method!"); },

    /**
     * @ignore
     */
    createDebugModel: function() { throw new Error("Abstract method!"); },

    /**
     * @ignore
     */
    getDebugModel: function()
    {
        if (this._type._debugModel === undefined)
            this._type._debugModel = this.createDebugModel();

        return this._type._debugModel;
    },

    toString: function()
    {
        return "BoundingVolume: [ " +
            this._minimumX + ", " +
            this._minimumY + ", " +
            this._minimumZ + " ] - [ " +
            this._maximumX + ", " +
            this._maximumY + ", " +
            this._maximumZ + " ], expanse: " +
            this._expanse;
    }
};

export { BoundingVolume };