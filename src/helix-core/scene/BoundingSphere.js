import {BoundingVolume} from "./BoundingVolume";
import {BoundingAABB} from "./BoundingAABB";
import {PlaneSide} from "../math/PlaneSide";
import {SpherePrimitive} from "../mesh/primitives/SpherePrimitive";

/**
 * @classdesc
 * BoundingAABB represents a bounding sphere.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BoundingSphere()
{
    BoundingVolume.call(this, BoundingSphere);
}

BoundingSphere.prototype = Object.create(BoundingVolume.prototype);

/**
 * Sets the center and radius explicitly.
 */
BoundingSphere.prototype.setExplicit = function(center, radius)
{
    this._center.copyFrom(center);
    this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;
    this._expanse = BoundingVolume.EXPANSE_FINITE;
    this._updateMinAndMax();
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.growToIncludeMesh = function(mesh)
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
    var centerX = (maxX + minX) * .5;
    var centerY = (maxY + minY) * .5;
    var centerZ = (maxZ + minZ) * .5;
    var maxSqrRadius = 0.0;

    index = attribute.offset;
    for (; index < len; index += stride) {
        var dx = centerX - vertices[index];
        var dy = centerY - vertices[index + 1];
        var dz = centerZ - vertices[index + 2];
        var sqrRadius = dx*dx + dy*dy + dz*dz;
        if (sqrRadius > maxSqrRadius) maxSqrRadius = sqrRadius;
    }

    this._center.x = centerX;
    this._center.y = centerY;
    this._center.z = centerZ;

    var radius = Math.sqrt(maxSqrRadius);
    this._halfExtentX = radius;
    this._halfExtentY = radius;
    this._halfExtentZ = radius;

    this._expanse = BoundingVolume.EXPANSE_FINITE;

    this._updateMinAndMax();
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === BoundingVolume.EXPANSE_EMPTY || this._expanse === BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === BoundingVolume.EXPANSE_INFINITE)
        this._expanse = BoundingVolume.EXPANSE_INFINITE;

    else if (this._expanse === BoundingVolume.EXPANSE_EMPTY) {
        this._center.x = bounds._center.x;
        this._center.y = bounds._center.y;
        this._center.z = bounds._center.z;
        if (bounds._type === this._type) {
            this._halfExtentX = bounds._halfExtentX;
            this._halfExtentY = bounds._halfExtentY;
            this._halfExtentZ = bounds._halfExtentZ;
        }
        else {
            this._halfExtentX = this._halfExtentY = this._halfExtentZ = bounds.getRadius();
        }
        this._expanse = BoundingVolume.EXPANSE_FINITE;
    }

    else {
        var minX = this._minimumX; var minY = this._minimumY; var minZ = this._minimumZ;
        var maxX = this._maximumX; var maxY = this._maximumY; var maxZ = this._maximumZ;

        if (bounds._maximumX > maxX)
            maxX = bounds._maximumX;
        if (bounds._maximumY > maxY)
            maxY = bounds._maximumY;
        if (bounds._maximumZ > maxZ)
            maxZ = bounds._maximumZ;
        if (bounds._minimumX < minX)
            minX = bounds._minimumX;
        if (bounds._minimumY < minY)
            minY = bounds._minimumY;
        if (bounds._minimumZ < minZ)
            minZ = bounds._minimumZ;

        this._center.x = (minX + maxX) * .5;
        this._center.y = (minY + maxY) * .5;
        this._center.z = (minZ + maxZ) * .5;

        var dx = maxX - this._center.x;
        var dy = maxY - this._center.y;
        var dz = maxZ - this._center.z;
        var radius = Math.sqrt(dx*dx + dy*dy + dz*dz);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;
    }

    this._updateMinAndMax();
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.growToIncludeMinMax = function(min, max)
{
    // temp solution, not run-time perf critical
    var aabb = new BoundingAABB();
    aabb.growToIncludeMinMax(min, max);
    this.growToIncludeBound(aabb);
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.getRadius = function()
{
    return this._halfExtentX;
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse === BoundingVolume.EXPANSE_INFINITE || sourceBound._expanse === BoundingVolume.EXPANSE_EMPTY)
        this.clear(sourceBound._expanse);
    else {
        var arr = matrix._m;
        var m00 = arr[0], m10 = arr[1], m20 = arr[2];
        var m01 = arr[4], m11 = arr[5], m21 = arr[6];
        var m02 = arr[8], m12 = arr[9], m22 = arr[10];

        var x = sourceBound._center.x;
        var y = sourceBound._center.y;
        var z = sourceBound._center.z;

        this._center.x = m00 * x + m01 * y + m02 * z + arr[12];
        this._center.y = m10 * x + m11 * y + m12 * z + arr[13];
        this._center.z = m20 * x + m21 * y + m22 * z + arr[14];


        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;
        x = sourceBound._halfExtentX;
        y = sourceBound._halfExtentY;
        z = sourceBound._halfExtentZ;

        var hx = m00 * x + m01 * y + m02 * z;
        var hy = m10 * x + m11 * y + m12 * z;
        var hz = m20 * x + m21 * y + m22 * z;

        var radius = Math.sqrt(hx * hx + hy * hy + hz * hz);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;

        this._minimumX = this._center.x - this._halfExtentX;
        this._minimumY = this._center.y - this._halfExtentY;
        this._minimumZ = this._center.z - this._halfExtentZ;
        this._maximumX = this._center.x + this._halfExtentX;
        this._maximumY = this._center.y + this._halfExtentY;
        this._maximumZ = this._center.z + this._halfExtentZ;

        this._expanse = BoundingVolume.EXPANSE_FINITE;
    }
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE)
        return true;
    else if (this._expanse === BoundingVolume.EXPANSE_EMPTY)
        return false;

    var centerX = this._center.x, centerY = this._center.y, centerZ = this._center.z;
    var radius = this._halfExtentX;

    for (var i = 0; i < numPlanes; ++i) {
        var plane = cullPlanes[i];
        var signedDist = plane.x * centerX + plane.y * centerY + plane.z * centerZ + plane.w;

        if (signedDist > radius)
            return false;
    }

    return true;
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.intersectsBound = function(bound)
{
    if (this._expanse === BoundingVolume.EXPANSE_EMPTY || bound._expanse === BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse === BoundingVolume.EXPANSE_INFINITE || bound._expanse === BoundingVolume.EXPANSE_INFINITE)
        return true;

    // both Spheres
    if (bound._type === this._type) {
        var dx = this._center.x - bound._center.x;
        var dy = this._center.y - bound._center.y;
        var dz = this._center.z - bound._center.z;
        var touchDistance = this._halfExtentX + bound._halfExtentX;
        return dx*dx + dy*dy + dz*dz < touchDistance*touchDistance;
    }
    else
        return BoundingVolume._testAABBToSphere(bound, this);
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.classifyAgainstPlane = function(plane)
{
    var dist = plane.x * this._center.x + plane.y * this._center.y + plane.z * this._center.z + plane.w;
    var radius = this._halfExtentX;
    if (dist > radius) return PlaneSide.FRONT;
    else if (dist < -radius) return PlaneSide.BACK;
    else return PlaneSide.INTERSECTING;
};

/**
 * @ignore
 * @private
 */
BoundingSphere.prototype._updateMinAndMax = function()
{
    var centerX = this._center.x, centerY = this._center.y, centerZ = this._center.z;
    var radius = this._halfExtentX;
    this._minimumX = centerX - radius;
    this._minimumY = centerY - radius;
    this._minimumZ = centerZ - radius;
    this._maximumX = centerX + radius;
    this._maximumY = centerY + radius;
    this._maximumZ = centerZ + radius;
};

/**
 * @ignore
 */
BoundingSphere.prototype.createDebugModel = function()
{
    return new SpherePrimitive({doubleSided:true});
};

export {BoundingSphere };