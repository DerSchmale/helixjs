/**
 *
 * @param type
 * @constructor
 */
HX.BoundingVolume = function(type)
{
    this._type = type;

    this._expanse = HX.BoundingVolume.EXPANSE_EMPTY;
    this._minimumX = 0.0;
    this._minimumY = 0.0;
    this._minimumZ = 0.0;
    this._maximumX = 0.0;
    this._maximumY = 0.0;
    this._maximumZ = 0.0;
    this._halfExtentX = 0.0;
    this._halfExtentY = 0.0;
    this._halfExtentZ = 0.0;
    this._center = new HX.Float4();
};

HX.BoundingVolume.EXPANSE_EMPTY = 0;
HX.BoundingVolume.EXPANSE_INFINITE = 1;
HX.BoundingVolume.EXPANSE_FINITE = 2;

HX.BoundingVolume._testAABBToSphere = function(aabb, sphere)
{
    // b = sphere var max = aabb._maximum;
    var maxX = sphere._maximumX;
    var maxY = sphere._maximumY;
    var maxZ = sphere._maximumZ;
    var minX = aabb._minimumX;
    var minY = aabb._minimumY;
    var minZ = aabb._minimumZ;
    var radius = sphere._halfExtentX;
    var centerX = this._center.x;
    var centerY = this._center.y;
    var centerZ = this._center.z;
    var dot = 0;

    if (minX > centerX) {
        var diff = centerX - minX;
        dot += diff * diff;
    }
    else if (maxX < centerX) {
        var diff = centerX - maxX;
        dot += diff * diff;
    }

    if (minY > centerY) {
        var diff = centerY - minY;
        dot += diff * diff;
    }
    else if (maxY < centerY) {
        var diff = centerY - maxY;
        dot += diff * diff;
    }

    if (minZ > centerZ) {
        var diff = centerZ - minZ;
        dot += diff * diff;
    }
    else if (maxZ < centerZ) {
        var diff = centerZ - maxZ;
        dot += diff * diff;
    }

    return dot < radius * radius;
};

HX.BoundingVolume.prototype =
{
    get expanse() { return this._expanse; },
    get type() { return this._type; },

    growToIncludeMesh: function(meshData) { throw new Error("Abstract method!"); },
    growToIncludeBound: function(bounds) { throw new Error("Abstract method!"); },
    growToIncludeMinMax: function(min, max) { throw new Error("Abstract method!"); },

    clear: function(expanseState)
    {
        this._minimumX = this._minimumY = this._minimumZ = 0;
        this._maximumX = this._maximumY = this._maximumZ = 0;
        this._center.set(0, 0, 0);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = 0;
        this._expanse = expanseState === undefined? HX.BoundingVolume.EXPANSE_EMPTY : expanseState;
    },

    // both center/radius and min/max approaches are used, depending on the type, but both are required
    get minimum() { return new HX.Float4(this._minimumX, this._minimumY, this._minimumZ, 1.0); },
    get maximum() { return new HX.Float4(this._maximumX, this._maximumY, this._maximumZ, 1.0); },

    get center() { return this._center; },
    // the half-extents of the box encompassing the bounds.
    get halfExtent() { return new HX.Float4(this._halfExtentX, this._halfExtentY, this._halfExtentZ, 0.0); },
    // the radius of the sphere encompassing the bounds. This is implementation-dependent, because the radius is less precise for a box than for a sphere
    getRadius: function() { throw new Error("Abstract method!"); },

    transformFrom: function(sourceBound, matrix) { throw new Error("Abstract method!"); },

    // numPlanes is provided so we can provide a full frustum but skip near/far tests (useful in some cases)
    // convex solid may be infinite
    intersectsConvexSolid: function(cullPlanes, numPlanes) { throw new Error("Abstract method!"); },
    intersectsBound: function(bound) { throw new Error("Abstract method!"); },
    classifyAgainstPlane: function(plane) { throw new Error("Abstract method!"); },

    createDebugModelInstance: function() { throw new Error("Abstract method!"); },

    getDebugModelInstance: function()
    {
        if (this._type._debugModel === undefined)
            this._type._debugModel = this.createDebugModelInstance();

        return this._type._debugModel;
    },

    getDebugMaterial: function()
    {
        if (HX.BoundingVolume._debugMaterial === undefined) {
            var material = new HX.Material();
            var shader = new HX.Shader(HX.ShaderLibrary.get("debug_bounds_vertex.glsl"), HX.ShaderLibrary.get("debug_bounds_fragment.glsl"));
            var materialPass = new HX.MaterialPass(shader);
            materialPass.elementType = HX.ElementType.LINES;
            materialPass.cullMode = HX.CullMode.NONE;
            material.setPass(HX.MaterialPass.POST_LIGHT_PASS, materialPass);
            material.setUniform("color", new HX.Color(1.0, 0.0, 1.0));
            HX.BoundingVolume._debugMaterial = material;
        }

        return HX.BoundingVolume._debugMaterial;
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

/**
 *
 * @constructor
 */
HX.BoundingAABB = function()
{
    HX.BoundingVolume.call(this, HX.BoundingAABB);
};

HX.BoundingAABB.prototype = Object.create(HX.BoundingVolume.prototype);

HX.BoundingAABB.prototype.growToIncludeMesh = function(meshData)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    var attribute = meshData.getVertexAttribute("hx_position");
    var index = attribute.offset;
    var stride = meshData.getVertexStride(attribute.streamIndex);
    var vertices = meshData.getVertexData(attribute.streamIndex);
    var len = vertices.length;
    var minX, minY, minZ;
    var maxX, maxY, maxZ;

    if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
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
    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;

    this._updateCenterAndExtent();
};

HX.BoundingAABB.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === HX.BoundingVolume.EXPANSE_EMPTY || this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
        this._expanse = HX.BoundingVolume.EXPANSE_INFINITE;

    else if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = bounds._minimumX;
        this._minimumY = bounds._minimumY;
        this._minimumZ = bounds._minimumZ;
        this._maximumX = bounds._maximumX;
        this._maximumY = bounds._maximumY;
        this._maximumZ = bounds._maximumZ;
        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
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

HX.BoundingAABB.prototype.growToIncludeMinMax = function(min, max)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = min.x;
        this._minimumY = min.y;
        this._minimumZ = min.z;
        this._maximumX = max.x;
        this._maximumY = max.y;
        this._maximumZ = max.z;
        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
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

HX.BoundingAABB.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse === HX.BoundingVolume.EXPANSE_INFINITE || sourceBound._expanse === HX.BoundingVolume.EXPANSE_EMPTY)
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

        this._halfExtentX = m00 * x + m01 * y + m02 * z;
        this._halfExtentY = m10 * x + m11 * y + m12 * z;
        this._halfExtentZ = m20 * x + m21 * y + m22 * z;


        this._minimumX = this._center.x - this._halfExtentX;
        this._minimumY = this._center.y - this._halfExtentY;
        this._minimumZ = this._center.z - this._halfExtentZ;
        this._maximumX = this._center.x + this._halfExtentX;
        this._maximumY = this._center.y + this._halfExtentY;
        this._maximumZ = this._center.z + this._halfExtentZ;
        this._expanse = sourceBound._expanse;
    }
};

// numPlanes is provided so we can provide a full frustum but skip near or far tests (useful in some cases such as directional light frusta)
HX.BoundingAABB.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
        return true;
    else if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    var minX = this._minimumX, minY = this._minimumY, minZ = this._minimumZ;
    var maxX = this._maximumX, maxY = this._maximumY, maxZ = this._maximumZ;

    for (var i = 0; i < numPlanes; ++i) {
        // find the point that will always have the smallest signed distance
        var plane = cullPlanes[i];
        var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = plane.w;
        var closestX = planeX < 0? minX : maxX;
        var closestY = planeY < 0? minY : maxY;
        var closestZ = planeZ < 0? minZ : maxZ;

        // classify the closest point
        var signedDist = planeX * closestX + planeY * closestY + planeZ * closestZ + planeW;
        if (signedDist < 0.0)
            return false;
    }

    return true;
};

HX.BoundingAABB.prototype.intersectsBound = function(bound)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY || bound._expanse === HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE || bound._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
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
        return HX.BoundingVolume._testAABBToSphere(this, bound);
    }
};

HX.BoundingAABB.prototype.classifyAgainstPlane = function(plane)
{
    var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = planeW;

    var centerDist = planeX * this._center.x + planeY * this._center.y + planeZ * this._center.z + planeW;

    if (planeX < 0) planeX = -planeX;
    if (planeY < 0) planeY = -planeY;
    if (planeZ < 0) planeZ = -planeZ;

    var intersectionDist = planeX * this._halfExtentX + planeY * this._halfExtentY + planeZ * this._halfExtentZ;

    if (centerDist > intersectionDist)
        return HX.PlaneSide.FRONT;
    else if (centerDist < -intersectionDist)
        return HX.PlaneSide.BACK;
    else
        return HX.PlaneSide.INTERSECTING;
};

HX.BoundingAABB.prototype.setExplicit = function(min, max)
{
    this._minimumX = min.x;
    this._minimumY = min.y;
    this._minimumZ = min.z;
    this._maximumX = max.x;
    this._maximumY = max.y;
    this._maximumZ = max.z;
    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    this._updateCenterAndExtent();
};

HX.BoundingAABB.prototype._updateCenterAndExtent = function()
{
    var minX = this._minimumX; var minY = this._minimumY; var minZ = this._minimumZ;
    var maxX = this._maximumX; var maxY = this._maximumY; var maxZ = this._maximumZ;
    this._center.x = (minX + maxX) * .5;
    this._center.y = (minY + maxY) * .5;
    this._center.z = (minZ + maxZ) * .5;
    this._halfExtentX = (maxX - minX) * .5;
    this._halfExtentY = (maxY - minY) * .5;
    this._halfExtentZ = (maxZ - minZ) * .5;
};

// part of the
HX.BoundingAABB.prototype.getRadius = function()
{
    return Math.sqrt(this._halfExtentX * this._halfExtentX + this._halfExtentY * this._halfExtentY + this._halfExtentZ * this._halfExtentZ);
};

HX.BoundingAABB.prototype.createDebugModelInstance = function()
{
    return new HX.ModelInstance(HX.BoxPrimitive.create(), [this.getDebugMaterial()]);
};

/**
 *
 * @constructor
 */
HX.BoundingSphere = function()
{
    HX.BoundingVolume.call(this, HX.BoundingSphere);
};

HX.BoundingSphere.prototype = Object.create(HX.BoundingVolume.prototype);

HX.BoundingSphere.prototype.setExplicit = function(center, radius)
{
    this._center.copyFrom(center);
    this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;
    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    this._updateMinAndMax();
};

HX.BoundingSphere.prototype.growToIncludeMesh = function(meshData)
{
    if (this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    var attribute = meshData.getVertexAttribute("hx_position");
    var index = attribute.offset;
    var stride = meshData.getVertexStride(attribute.streamIndex);
    var vertices = attribute.getVertexData(attribute.streamIndex);
    var len = vertices.length;
    var minX, minY, minZ;
    var maxX, maxY, maxZ;

    if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
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

    this._expanse = HX.BoundingVolume.EXPANSE_FINITE;

    this._updateMinAndMax();
};

HX.BoundingSphere.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === HX.BoundingVolume.EXPANSE_EMPTY || this._expanse === HX.BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === HX.BoundingVolume.EXPANSE_INFINITE)
        this._expanse = HX.BoundingVolume.EXPANSE_INFINITE;

    else if (this._expanse === HX.BoundingVolume.EXPANSE_EMPTY) {
        this._center.x = bounds._center.x;
        this._center.y = bounds._center.y;
        this._center.z = bounds._center.z;
        if (bounds._type == this._type) {
            this._halfExtentX = bounds._halfExtentX;
            this._halfExtentY = bounds._halfExtentY;
            this._halfExtentZ = bounds._halfExtentZ;
        }
        else {
            this._halfExtentX = this._halfExtentY = this._halfExtentZ = bounds.getRadius();
        }
        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
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

HX.BoundingSphere.prototype.growToIncludeMinMax = function(min, max)
{
    // temp solution, not run-time perf critical
    var aabb = new HX.BoundingAABB();
    aabb.growToIncludeMinMax(min, max);
    this.growToIncludeBound(aabb);
};

HX.BoundingSphere.prototype.getRadius = function()
{
    return this._halfExtentX;
};

HX.BoundingSphere.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse == HX.BoundingVolume.EXPANSE_INFINITE || sourceBound._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
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

        this._expanse = HX.BoundingVolume.EXPANSE_FINITE;
    }
};

// tests against a convex solid bounded by planes (fe: a frustum)
// numPlanes is provided so we can provide a full frustum but skip near/far tests (useful in some cases)
HX.BoundingSphere.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse == HX.BoundingVolume.EXPANSE_INFINITE)
        return true;
    else if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    var centerX = this._center.x, centerY = this._center.y, centerZ = this._center.z;
    var negRadius = -this._halfExtentX;

    for (var i = 0; i < numPlanes; ++i) {
        var plane = cullPlanes[i];
        var signedDist = plane.x * centerX + plane.y * centerY + plane.z * centerZ + plane.w;

        if (signedDist < negRadius) {
            return false;
        }
    }

    return true;
};

HX.BoundingSphere.prototype.intersectsBound = function(bound)
{
    if (this._expanse == HX.BoundingVolume.EXPANSE_EMPTY || bound._expanse == HX.BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse == HX.BoundingVolume.EXPANSE_INFINITE || bound._expanse == HX.BoundingVolume.EXPANSE_INFINITE)
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
        return HX.BoundingVolume._testAABBToSphere(bound, this);
};

HX.BoundingSphere.prototype.classifyAgainstPlane = function(plane)
{
    var dist = plane.x * this._center.x + plane.y * this._center.y + plane.z * this._center.z + plane.w;
    var radius = this._halfExtentX;
    if (dist > radius) return HX.PlaneSide.FRONT;
    else if (dist < -radius) return HX.PlaneSide.BACK;
    else return HX.PlaneSide.INTERSECTING;
};

HX.BoundingSphere.prototype._updateMinAndMax = function()
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

HX.BoundingSphere.prototype.createDebugModelInstance = function()
{
    return new HX.ModelInstance(HX.SpherePrimitive.create({doubleSided:true}), [this.getDebugMaterial()]);
};

HX.FixedAABB = function()
{
    HX.BoundingAABB.call(this);
};

HX.FixedAABB.prototype = Object.create(HX.BoundingAABB.prototype);