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

    /**
     * Tests whether the bounding box intersects. The convex solid is described as a list of planes pointing outward. Infinite solids are also allowed (Directional Light frusta without a near plane, for example)
     * @param cullPlanes An Array of planes to be tested. Planes are simply Float4 objects.
     * @param numPlanes The amount of planes to be tested against. This so we can test less planes than are in the cullPlanes array (Directional Light frusta, for example)
     * @returns {boolean} Whether or not the bounds intersect the solid.
     */
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
            material.setPass(HX.MaterialPass.GEOMETRY_PASS, materialPass);
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