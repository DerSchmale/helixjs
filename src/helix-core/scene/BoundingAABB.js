import {BoundingVolume} from "./BoundingVolume";
import {PlaneSide} from "../math/PlaneSide";
import {Float4} from "../math/Float4";
import {BoundingSphere} from "./BoundingSphere";

/**
 * @classdesc
 * BoundingAABB represents an axis-aligned bounding box.
 *
 * @constructor
 *
 * @extends BoundingVolume
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BoundingAABB()
{
    BoundingVolume.call(this, BoundingAABB);
}

BoundingAABB.prototype = Object.create(BoundingVolume.prototype);

/**
 * @inheritDoc
 */
BoundingAABB.prototype.growToIncludeMesh = function(mesh)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE) return;

    var attribute = mesh.getVertexAttributeByName("hx_position");
    var index = attribute.offset;
    var stride = mesh.getVertexStride(attribute.streamIndex);
    var vertices = mesh.getVertexData(attribute.streamIndex);
    var len = vertices.length;
    var minX, minY, minZ;
    var maxX, maxY, maxZ;

    if (this._expanse === BoundingVolume.EXPANSE_EMPTY) {
        maxX = minX = vertices[index];
        maxY = minY = vertices[index + 1];
        maxZ = minZ = vertices[index + 2];
        index += stride;
    }
    else {
        minX = this._minimumX; minY = this._minimumY; minZ = this._minimumZ;
        maxX = this._maximumX; maxY = this._maximumY; maxZ = this._maximumZ;
    }

    for (; index < len; index += stride) {
        var x = vertices[index];
        var y = vertices[index + 1];
        var z = vertices[index + 2];

        if (x > maxX) maxX = x;
        else if (x < minX) minX = x;
        if (y > maxY) maxY = y;
        else if (y < minY) minY = y;
        if (z > maxZ) maxZ = z;
        else if (z < minZ) minZ = z;
    }

    this._minimumX = minX; this._minimumY = minY; this._minimumZ = minZ;
    this._maximumX = maxX; this._maximumY = maxY; this._maximumZ = maxZ;
    this._expanse = BoundingVolume.EXPANSE_FINITE;

    this._updateCenterAndExtent();
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === BoundingVolume.EXPANSE_EMPTY ||
        bounds._expanse === BoundingVolume.EXPANSE_INHERIT ||
        this._expanse === BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === BoundingVolume.EXPANSE_INFINITE)
        this._expanse = BoundingVolume.EXPANSE_INFINITE;

    else if (this._expanse === BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = bounds._minimumX;
        this._minimumY = bounds._minimumY;
        this._minimumZ = bounds._minimumZ;
        this._maximumX = bounds._maximumX;
        this._maximumY = bounds._maximumY;
        this._maximumZ = bounds._maximumZ;
        this._expanse = BoundingVolume.EXPANSE_FINITE;
    }
    else {
        if (bounds._minimumX < this._minimumX)
            this._minimumX = bounds._minimumX;
        if (bounds._minimumY < this._minimumY)
            this._minimumY = bounds._minimumY;
        if (bounds._minimumZ < this._minimumZ)
            this._minimumZ = bounds._minimumZ;
        if (bounds._maximumX > this._maximumX)
            this._maximumX = bounds._maximumX;
        if (bounds._maximumY > this._maximumY)
            this._maximumY = bounds._maximumY;
        if (bounds._maximumZ > this._maximumZ)
            this._maximumZ = bounds._maximumZ;
    }

    this._updateCenterAndExtent();
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.growToIncludeMinMax = function(min, max)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE) return;

    if (this._expanse === BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = min.x;
        this._minimumY = min.y;
        this._minimumZ = min.z;
        this._maximumX = max.x;
        this._maximumY = max.y;
        this._maximumZ = max.z;
        this._expanse = BoundingVolume.EXPANSE_FINITE;
    }
    else {
        if (min.x < this._minimumX)
            this._minimumX = min.x;
        if (min.y < this._minimumY)
            this._minimumY = min.y;
        if (min.z < this._minimumZ)
            this._minimumZ = min.z;
        if (max.x > this._maximumX)
            this._maximumX = max.x;
        if (max.y > this._maximumY)
            this._maximumY = max.y;
        if (max.z > this._maximumZ)
            this._maximumZ = max.z;
    }

    this._updateCenterAndExtent();
};

/**
 * Generates a new BoundingSphere with the transformation matrix applied.
 */
BoundingAABB.prototype.transform = function(matrix)
{
    var clone = new BoundingAABB();
    clone.transformFrom(this, matrix);
    return clone;
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse === BoundingVolume.EXPANSE_FINITE) {
        var arr = matrix._m;
        var m00 = arr[0], m10 = arr[1], m20 = arr[2];
        var m01 = arr[4], m11 = arr[5], m21 = arr[6];
        var m02 = arr[8], m12 = arr[9], m22 = arr[10];

        var x = sourceBound._center.x;
        var y = sourceBound._center.y;
        var z = sourceBound._center.z;

        var cx = this._center.x = m00 * x + m01 * y + m02 * z + arr[12];
        var cy = this._center.y = m10 * x + m11 * y + m12 * z + arr[13];
        var cz = this._center.z = m20 * x + m21 * y + m22 * z + arr[14];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;
        x = sourceBound._halfExtentX;
        y = sourceBound._halfExtentY;
        z = sourceBound._halfExtentZ;

        var hx = this._halfExtentX = m00 * x + m01 * y + m02 * z;
        var hy = this._halfExtentY = m10 * x + m11 * y + m12 * z;
        var hz = this._halfExtentZ = m20 * x + m21 * y + m22 * z;

        this._minimumX = cx - hx;
        this._minimumY = cy - hy;
        this._minimumZ = cz - hz;
        this._maximumX = cx + hx;
        this._maximumY = cy + hy;
        this._maximumZ = cz + hz;
        this._expanse = sourceBound._expanse;
    }
    else {
        this.clear(sourceBound._expanse);
    }
};


/**
 * @inheritDoc
 */
BoundingAABB.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE || this._expanse === BoundingVolume.EXPANSE_INHERIT)
        return true;
    else if (this._expanse === BoundingVolume.EXPANSE_EMPTY)
        return false;

    var minX = this._minimumX, minY = this._minimumY, minZ = this._minimumZ;
    var maxX = this._maximumX, maxY = this._maximumY, maxZ = this._maximumZ;

    for (var i = 0; i < numPlanes; ++i) {
        // find the point that will always have the smallest signed distance
        var plane = cullPlanes[i];
        var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = plane.w;
        var closestX = planeX > 0? minX : maxX;
        var closestY = planeY > 0? minY : maxY;
        var closestZ = planeZ > 0? minZ : maxZ;

        // classify the closest point
        var signedDist = planeX * closestX + planeY * closestY + planeZ * closestZ + planeW;
        if (signedDist > 0.0)
            return false;
    }

    return true;
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.intersectsBound = function(bound)
{
    if (this._expanse === BoundingVolume.EXPANSE_EMPTY || bound._expanse === BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse === BoundingVolume.EXPANSE_INFINITE || bound._expanse === BoundingVolume.EXPANSE_INFINITE ||
        this._expanse === BoundingVolume.EXPANSE_INHERIT || bound._expanse === BoundingVolume.EXPANSE_INHERIT)
        return true;

    // both AABB
    if (bound._type === this._type) {
        return 	this._maximumX > bound._minimumX &&
            this._minimumX < bound._maximumX &&
            this._maximumY > bound._minimumY &&
            this._minimumY < bound._maximumY &&
            this._maximumZ > bound._minimumZ &&
            this._minimumZ < bound._maximumZ;
    }
    else {
        return BoundingVolume._testAABBToSphere(this, bound);
    }
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.classifyAgainstPlane = function(plane)
{
    var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = plane.w;

    var centerDist = planeX * this._center.x + planeY * this._center.y + planeZ * this._center.z + planeW;

    if (planeX < 0) planeX = -planeX;
    if (planeY < 0) planeY = -planeY;
    if (planeZ < 0) planeZ = -planeZ;

    var intersectionDist = planeX * this._halfExtentX + planeY * this._halfExtentY + planeZ * this._halfExtentZ;
    // intersectionDist is the distance to the far point
    // -intersectionDist is the distance to the closest point

    if (centerDist > intersectionDist)
        return PlaneSide.FRONT;
    if (centerDist < -intersectionDist)
        return PlaneSide.BACK;
    else
        return PlaneSide.INTERSECTING;
};

/**
 * @ignore
 */
BoundingAABB.prototype.intersectsRay = function(ray)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE) return true;
    if (this._expanse === BoundingVolume.EXPANSE_EMPTY || this._expanse === BoundingVolume.EXPANSE_INHERIT) return false;
    // slab method
    var o = ray.origin;
    var d = ray.direction;
    var oX = o.x, oY = o.y, oZ = o.z;
    var dirX = d.x, dirY = d.y, dirZ = d.z;
    var rcpDirX = 1.0 / dirX, rcpDirY = 1.0 / dirY, rcpDirZ = 1.0 / dirZ;

    var nearT = -Infinity;
    var farT = Infinity;

    var t1, t2;

    // t = (minX - oX) / dirX

    if (dirX !== 0.0) {
        t1 = (this._minimumX - oX) * rcpDirX;
        t2 = (this._maximumX - oX) * rcpDirX;
        // near is the closest intersection factor to the ray, far the furthest
        // so [nearT - farT] is the line segment cut off by the planes
        nearT = Math.min(t1, t2);
        farT = Math.max(t1, t2);
    }

    if (dirY !== 0.0) {
        t1 = (this._minimumY - oY) * rcpDirY;
        t2 = (this._maximumY - oY) * rcpDirY;

        // slice of more from the line segment [nearT - farT]
        nearT = Math.max(nearT, Math.min(t1, t2));
        farT = Math.min(farT, Math.max(t1, t2));
    }

    if (dirZ !== 0.0) {
        t1 = (this._minimumZ - oZ) * rcpDirZ;
        t2 = (this._maximumZ - oZ) * rcpDirZ;

        nearT = Math.max(nearT, Math.min(t1, t2));
        farT = Math.min(farT, Math.max(t1, t2));
    }

    return farT > 0 && farT >= nearT;
};

/**
 * Sets the minimum and maximum explicitly using {@linkcode Float4}
 */
BoundingAABB.prototype.setExplicit = function(min, max)
{
    this._minimumX = min.x;
    this._minimumY = min.y;
    this._minimumZ = min.z;
    this._maximumX = max.x;
    this._maximumY = max.y;
    this._maximumZ = max.z;
    this._expanse = BoundingVolume.EXPANSE_FINITE;
    this._updateCenterAndExtent();
};

/**
 * @ignore
 * @private
 */
BoundingAABB.prototype._updateCenterAndExtent = function()
{
    var minX = this._minimumX, minY = this._minimumY, minZ = this._minimumZ;
    var maxX = this._maximumX, maxY = this._maximumY, maxZ = this._maximumZ;
    this._center.x = (minX + maxX) * .5;
    this._center.y = (minY + maxY) * .5;
    this._center.z = (minZ + maxZ) * .5;
    this._halfExtentX = (maxX - minX) * .5;
    this._halfExtentY = (maxY - minY) * .5;
    this._halfExtentZ = (maxZ - minZ) * .5;
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.getRadius = function()
{
    return Math.sqrt(this._halfExtentX * this._halfExtentX + this._halfExtentY * this._halfExtentY + this._halfExtentZ * this._halfExtentZ);
};

BoundingAABB.prototype.getHalfExtents = function()
{
    return new Float4(this._halfExtentX, this._halfExtentY, this._halfExtentZ, 0.0);
};

BoundingAABB.prototype.clone = function()
{
    var aabb = new BoundingAABB()
    aabb.growToIncludeBound(this);
    return aabb;
};


export { BoundingAABB };