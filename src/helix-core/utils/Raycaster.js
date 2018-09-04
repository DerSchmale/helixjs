import {SceneVisitor} from "../scene/SceneVisitor";
import {ObjectPool} from "../core/ObjectPool";
import {Float4} from "../math/Float4";
import {Ray} from "../math/Ray";
import {Matrix4x4} from "../math/Matrix4x4";

function IntersectionData()
{
    this.entity = null;
    this.component = null;
    this.point = new Float4();
    this.faceNormal = new Float4();
    this.t = Infinity;

    // used to interpolate more data if needed
    this.mesh = null;
    this.barycentric = new Float4();    // the barycentric coordinate of the hit
    this.faceIndex = -1;                // the index into the index buffer where the face starts.
}

function Potential()
{
    this.meshInstance = null;
    this.closestDistanceSqr = 0;
    this.objectMatrix = new Matrix4x4();

    // to store this in a linked list for pooling
    this.next = null;
}

/**
 * @classdec
 *
 * Raycaster sends a ray through the scene and finds the closest intersector.
 *
 * @constructor
 */
function Raycaster()
{
    SceneVisitor.call(this);
    this._potentials = null;
    this._potentialPool = new ObjectPool(Potential);
    this._localRay = new Ray();
}

Raycaster.prototype = Object.create(SceneVisitor.prototype);

/**
 * Finds the closest intersection point in the scene for the ray.
 * @param ray The ray in world space coordinates.
 * @param scene The scene containing the geometry to test.
 *
 * TODO: Should also be able to provide a set of objects instead of the scene?
 */
Raycaster.prototype.cast = function(ray, scene)
{
    this._potentials = [];
    this._ray = ray;
    this._scene = scene;

    this._potentialPool.reset();

    scene.acceptVisitor(this);

    this._potentials.sort(this._sortPotentialFunc);
    var hitData = this._findClosest();

    // TODO: Provide MeshInstance.rayCastProxy

    return hitData.entity? hitData : null;
};

/**
 * @ignore
 */
Raycaster.prototype.qualifies = function(object)
{
    return object.raycast && object.visible && object.worldBounds.intersectsRay(this._ray);
};

/**
 * @ignore
 */
Raycaster.prototype.visitMeshInstance = function (meshInstance)
{
    var entity = meshInstance.entity;
    var potential = this._potentialPool.getItem();
    potential.meshInstance = meshInstance;
    var dir = this._ray.direction;
    var dirX = dir.x, dirY = dir.y, dirZ = dir.z;
    var origin = this._ray.origin;
    var bounds = entity.worldBounds;
    var center = bounds.center;
    var ex = bounds._halfExtentX;
    var ey = bounds._halfExtentY;
    var ez = bounds._halfExtentZ;
    ex = dirX > 0? center.x - ex : center.x + ex;
    ey = dirY > 0? center.y - ey : center.y + ey;
    ez = dirZ > 0? center.z - ez : center.z + ez;

    // this is not required for the order, but when testing the intersection distances
    ex -= origin.x;
    ey -= origin.y;
    ez -= origin.z;

    // the closest projected point on the ray is the order
    potential.closestDistanceSqr = ex * dirX + ey * dirY + ez * dirZ;
    potential.objectMatrix.inverseAffineOf(entity.worldMatrix);

    this._potentials.push(potential);
};

Raycaster.prototype._findClosest = function()
{
    var set = this._potentials;
    var len = set.length;
    var hitData = new IntersectionData();
    var worldRay = this._ray;
    var localRay = this._localRay;

    for (var i = 0; i < len; ++i) {
        var elm = set[i];

        // we can stop searching, everything will be farther from now on
        if (elm.closestDistanceSqr > hitData.t * hitData.t)
            break;

        localRay.transformFrom(worldRay, elm.objectMatrix);

        if (this._testMesh(localRay, elm.meshInstance.mesh, hitData)) {
            hitData.entity = elm.meshInstance.entity;
            hitData.component = elm.meshInstance;
        }

    }

    if (hitData.entity) {
        var worldMatrix = hitData.entity.worldMatrix;
		worldMatrix.transformPoint(hitData.point, hitData.point);
		worldMatrix.transformNormal(hitData.faceNormal, hitData.faceNormal);
	}

    return hitData;
};

Raycaster.prototype._testMesh = function(ray, mesh, hitData)
{
    // to we need to closest position from the others?
    var dir = ray.direction;
    var origin = ray.origin;
    var oX = origin.x, oY = origin.y, oZ = origin.z;
    var dirX = dir.x, dirY = dir.y, dirZ = dir.z;
    var attrib = mesh.getVertexAttributeByName("hx_position");
    var vertices = mesh.getVertexData(attrib.streamIndex);
    var indices = mesh.getIndexData();
    var stride = mesh.getVertexStride(attrib.streamIndex);
    var numIndices = indices.length;
    var offset = attrib.offset;
    var updated = false;

    for (var i = 0; i < numIndices; i += 3) {
        var i1 = indices[i] * stride + offset;
        var i2 = indices[i + 1] * stride + offset;
        var i3 = indices[i + 2] * stride + offset;
        var x0 = vertices[i1], y0 = vertices[i1 + 1], z0 = vertices[i1 + 2];
        var x1 = vertices[i2], y1 = vertices[i2 + 1], z1 = vertices[i2 + 2];
        var x2 = vertices[i3], y2 = vertices[i3 + 1], z2 = vertices[i3 + 2];
        var dx1 = x1 - x0, dy1 = y1 - y0, dz1 = z1 - z0;
        var dx2 = x2 - x0, dy2 = y2 - y0, dz2 = z2 - z0;

        // unnormalized face normal
        var nx = dy1*dz2 - dz1*dy2;
        var ny = dz1*dx2 - dx1*dz2;
        var nz = dx1*dy2 - dy1*dx2;
        // var rcpLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        // nx *= rcpLen;
        // ny *= rcpLen;
        // nz *= rcpLen;
        var dot = nx * dirX + ny * dirY + nz * dirZ;

        // face pointing away from the ray, assume it's invisible
        if (dot >= 0) continue;

        // triangle plane through point:
        var d = -(nx * x0 + ny * y0 + nz * z0);

        // perpendicular distance origin to plane
        var t = (nx * oX + ny * oY + nz * oZ + d);

        if (t < 0) continue;

        t /= -dot;

        // behind ray or too far, no need to test if inside
        if (t >= hitData.t) continue;

        var px = t * dirX + oX, py = t * dirY + oY, pz = t * dirZ + oZ;

        var dpx = px - x0, dpy = py - y0, dpz = pz - z0;
        var dot11 = dx1 * dx1 + dy1 * dy1 + dz1 * dz1;
        var dot22 = dx2 * dx2 + dy2 * dy2 + dz2 * dz2;
        var dot12 = dx1 * dx2 + dy1 * dy2 + dz1 * dz2;
        var denom = dot11 * dot22 - dot12 * dot12;

        // degenerate triangles
        if (denom === 0.0) continue;

        var dotp1 = dpx * dx1 + dpy * dy1 + dpz * dz1;
        var dotp2 = dpx * dx2 + dpy * dy2 + dpz * dz2;

        var rcpDenom = 1.0 / denom;

        var v = (dot22 * dotp1 - dot12 * dotp2) * rcpDenom;
        var w = (dot11 * dotp2 - dot12 * dotp1) * rcpDenom;
        var u = 1.0 - v - w;

        if ((u >= 0) && (v >= 0) && (w <= 1.0)) {
            hitData.faceNormal.set(nx, ny, nz, 0.0);
            hitData.point.set(px, py, pz, 1.0);
            hitData.barycentric.set(u, v, w, 0.0);
            hitData.mesh = mesh;
            hitData.t = t;
            hitData.faceIndex = i;
            updated = true;
        }
    }

	hitData.faceNormal.normalize();
    return updated;
};

Raycaster.prototype._sortPotentialFunc = function(a, b)
{
    return a.closestDistanceSqr - b.closestDistanceSqr;
};

export {IntersectionData, Raycaster};