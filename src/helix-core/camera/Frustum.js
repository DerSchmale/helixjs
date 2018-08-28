import {Float4} from "../math/Float4";

/**
 * @classdesc
 * Frustum (a truncated pyramid) describes the set of planes bounding the camera's visible area.
 *
 * @constructor
 *
 * @property planes An Array of planes describing the frustum. The planes are in world space and point outwards.
 * @property corners An array containing the 8 vertices of the frustum, in world space.
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Frustum()
{
    this.planes = new Array(6);
    this.corners = new Array(8);

    for (var i = 0; i < 6; ++i)
        this.planes[i] = new Float4();

    for (i = 0; i < 8; ++i)
        this.corners[i] = new Float4();
}

/**
 * The index for the left plane.
 */
Frustum.PLANE_LEFT = 0;

/**
 * The index for the right plane.
 */
Frustum.PLANE_RIGHT = 1;

/**
 * The index for the bottom plane.
 */
Frustum.PLANE_BOTTOM = 2;

/**
 * The index for the top plane.
 */
Frustum.PLANE_TOP = 3;

/**
 * The index for the near plane.
 */
Frustum.PLANE_NEAR = 4;

/**
 * The index for the far plane.
 */
Frustum.PLANE_FAR = 5;

/**
 * @ignore
 */
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
         * @ignore
         */
        update: function(projection, inverseProjection)
        {
            this._updatePlanes(projection);
            this._updateCorners(inverseProjection);
        },

        _updatePlanes: function(projection)
        {
            var m = projection._m;
            var planes = this.planes;

            var left = planes[Frustum.PLANE_LEFT];
            var right = planes[Frustum.PLANE_RIGHT];
            var top = planes[Frustum.PLANE_TOP];
            var bottom = planes[Frustum.PLANE_BOTTOM];
            var near = planes[Frustum.PLANE_NEAR];
            var far = planes[Frustum.PLANE_FAR];

            var r1x = m[0], r1y = m[4], r1z = m[8], r1w = m[12];
            var r2x = m[1], r2y = m[5], r2z = m[9], r2w = m[13];
            var r3x = m[2], r3y = m[6], r3z = m[10], r3w = m[14];
            var r4x = m[3], r4y = m[7], r4z = m[11], r4w = m[15];

            left.x = -(r4x + r1x);
            left.y = -(r4y + r1y);
            left.z = -(r4z + r1z);
            left.w = -(r4w + r1w);
            left.normalizeAsPlane();

            right.x = r1x - r4x;
            right.y = r1y - r4y;
            right.z = r1z - r4z;
            right.w = r1w - r4w;
            right.normalizeAsPlane();

            bottom.x = -(r4x + r2x);
            bottom.y = -(r4y + r2y);
            bottom.z = -(r4z + r2z);
            bottom.w = -(r4w + r2w);
            bottom.normalizeAsPlane();

            top.x = r2x - r4x;
            top.y = r2y - r4y;
            top.z = r2z - r4z;
            top.w = r2w - r4w;
            top.normalizeAsPlane();

            near.x = -(r4x + r3x);
            near.y = -(r4y + r3y);
            near.z = -(r4z + r3z);
            near.w = -(r4w + r3w);
            near.normalizeAsPlane();

            far.x = r3x - r4x;
            far.y = r3y - r4y;
            far.z = r3z - r4z;
            far.w = r3w - r4w;
            far.normalizeAsPlane();
        },

        _updateCorners: function(inverseProjection)
        {
            var corners = this.corners;
            for (var i = 0; i < 8; ++i) {
                var corner = corners[i];
                inverseProjection.transform(Frustum.CLIP_SPACE_CORNERS[i], corner);
                corner.scale(1.0 / corner.w);
            }
        }
    };


export { Frustum };