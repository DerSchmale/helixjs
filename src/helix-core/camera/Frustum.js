import {Float4} from "../math/Float4";

/**
 *
 * @constructor
 */
function Frustum()
{
    this._planes = new Array(6);
    this._corners = new Array(8);

    for (var i = 0; i < 6; ++i)
        this._planes[i] = new Float4();

    for (i = 0; i < 8; ++i)
        this._corners[i] = new Float4();

    this._r1 = new Float4();
    this._r2 = new Float4();
    this._r3 = new Float4();
    this._r4 = new Float4();
}

Frustum.PLANE_LEFT = 0;
Frustum.PLANE_RIGHT = 1;
Frustum.PLANE_BOTTOM = 2;
Frustum.PLANE_TOP = 3;
Frustum.PLANE_NEAR = 4;
Frustum.PLANE_FAR = 5;

Frustum.CLIP_SPACE_CORNERS = [
    new Float4(-1.0, -1.0, -1.0, 1.0),
    new Float4(1.0, -1.0, -1.0, 1.0),
    new Float4(1.0, 1.0, -1.0, 1.0),
    new Float4(-1.0, 1.0, -1.0, 1.0),
    new Float4(-1.0, -1.0, 1.0, 1.0),
    new Float4(1.0, -1.0, 1.0, 1.0),
    new Float4(1.0, 1.0, 1.0, 1.0),
    new Float4(-1.0, 1.0, 1.0, 1.0)
];

Frustum.prototype =
    {
        /**
         * An Array of planes describing frustum. The planes are in world space and point outwards.
         */
        get planes() { return this._planes; },

        /**
         * An array containing the 8 vertices of the frustum, in world space.
         */
        get corners() { return this._corners; },

        update: function(projection, inverseProjection)
        {
            this._updatePlanes(projection);
            this._updateCorners(inverseProjection);
        },

        _updatePlanes: function(projection)
        {
            // todo: this can all be inlined, but not the highest priority (only once per frame)
            var r1 = projection.getRow(0, this._r1);
            var r2 = projection.getRow(1, this._r2);
            var r3 = projection.getRow(2, this._r3);
            var r4 = projection.getRow(3, this._r4);

            Float4.add(r4, r1, this._planes[Frustum.PLANE_LEFT]);
            Float4.subtract(r4, r1, this._planes[Frustum.PLANE_RIGHT]);
            Float4.add(r4, r2, this._planes[Frustum.PLANE_BOTTOM]);
            Float4.subtract(r4, r2, this._planes[Frustum.PLANE_TOP]);
            Float4.add(r4, r3, this._planes[Frustum.PLANE_NEAR]);
            Float4.subtract(r4, r3, this._planes[Frustum.PLANE_FAR]);

            for (var i = 0; i < 6; ++i) {
                this._planes[i].negate();
                this._planes[i].normalizeAsPlane();
            }
        },

        _updateCorners: function(inverseProjection)
        {
            for (var i = 0; i < 8; ++i) {
                var corner = this._corners[i];
                inverseProjection.transform(Frustum.CLIP_SPACE_CORNERS[i], corner);
                corner.scale(1.0 / corner.w);
            }
        }
    };


export { Frustum };