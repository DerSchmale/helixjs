import {Entity} from "../entity/Entity";
import {Matrix4x4} from "../math/Matrix4x4";
import {Frustum} from "./Frustum";
import {BoundingVolume} from "../scene/BoundingVolume";
import {Ray} from "../math/Ray";
import {META} from "../Helix";
import {Float4} from "../math/Float4";

/**
 * @classdesc
 * Camera is an abstract base class for camera objects.
 *
 * @constructor
 *
 * @property {number} nearDistance The minimum distance to be able to render. Anything closer gets cut off.
 * @property {number} farDistance The maximum distance to be able to render. Anything farther gets cut off.
 * @property {Matrix4x4} viewProjectionMatrix The matrix transforming coordinates from world space to the camera's homogeneous projective space.
 * @property {Matrix4x4} viewMatrix The matrix transforming coordinates from world space to the camera's local coordinate system (eye space).
 * @property {Matrix4x4} projectionMatrix The matrix transforming coordinates from eye space to the camera's homogeneous projective space.
 * @property {Matrix4x4} inverseViewProjectionMatrix The matrix that transforms from the homogeneous projective space to world space.
 * @property {Matrix4x4} inverseProjectionMatrix The matrix that transforms from the homogeneous projective space to view space.
 *
 * @see {@linkcode PerspectiveCamera}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Camera()
{
    Entity.call(this);

    this._renderTargetWidth = 0;
    this._renderTargetHeight = 0;
    this._viewProjectionMatrixInvalid = true;
    this._viewProjectionMatrix = new Matrix4x4();
    this._inverseProjectionMatrix = new Matrix4x4();
    this._inverseViewProjectionMatrix = new Matrix4x4();
    this._projectionMatrix = new Matrix4x4();
    this._viewMatrix = new Matrix4x4();
    this._projectionMatrixDirty = true;
	this._clusterPlanesDirty = true;
    this._nearDistance = .1;
    this._farDistance = 1000;
    this._frustum = new Frustum();

    this.position.set(0.0, -1.0, 0.0);
}

Camera.prototype = Object.create(Entity.prototype, {
    nearDistance: {
        get: function() {
            return this._nearDistance;
        },

        set: function(value) {
            if (this._nearDistance === value) return;
            this._nearDistance = value;
            this._invalidateProjectionMatrix();
        }
    },

    farDistance: {
        get: function() {
            return this._farDistance;
        },

        set: function(value) {
            if (this._farDistance === value) return;
            this._farDistance = value;
            this._invalidateProjectionMatrix();
        }
    },

    // all x's are positive (point to the right)
    clusterPlanesW: {
        get: function() {
			if (this._viewProjectionMatrixInvalid)
				this._updateViewProjectionMatrix();

            if (this._clusterPlanesDirty)
                this._updateClusterPlanes();

            return this._clusterPlanesW;
        }
    },

	// all z's are positive
    clusterPlanesH: {
        get: function() {
            if (this._projectionMatrixDirty)
				this._updateProjectionMatrix();

            if (this._clusterPlanesDirty)
                this._updateClusterPlanes();

            return this._clusterPlanesH;
        }
    },

    viewProjectionMatrix: {
        get: function() {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._viewProjectionMatrix;
        }
    },

    viewMatrix: {
        get: function()
        {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._viewMatrix;
        }
    },

    projectionMatrix: {
        get: function()
        {
            if (this._projectionMatrixDirty)
                this._updateProjectionMatrix();

            return this._projectionMatrix;
        }
    },

    inverseViewProjectionMatrix: {
        get: function()
        {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._inverseViewProjectionMatrix;
        }
    },

    inverseProjectionMatrix: {
        get: function()
        {
            if (this._projectionMatrixDirty)
                this._updateProjectionMatrix();

            return this._inverseProjectionMatrix;
        }
    },

    frustum: {
        get: function()
        {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._frustum;
        }
    }
});

/**
 * Returns a ray in world space at the given coordinates.
 * @param x The x-coordinate in NDC [-1, 1] range.
 * @param y The y-coordinate in NDC [-1, 1] range.
 */
Camera.prototype.getRay = function(x, y)
{
    var ray = new Ray();
    var dir = ray.direction;
    dir.set(x, y, 1, 1);
    this.inverseProjectionMatrix.transform(dir, dir);
    dir.homogeneousProject();
    this.worldMatrix.transformVector(dir, dir);
    dir.normalize();
    this.worldMatrix.getColumn(3, ray.origin);
    return ray;
};

/**
 * @ignore
 * @param width
 * @param height
 * @private
 */
Camera.prototype._setRenderTargetResolution = function(width, height)
{
    this._renderTargetWidth = width;
    this._renderTargetHeight = height;
};

/**
 * @ignore
 */
Camera.prototype._invalidateViewProjectionMatrix = function()
{
    this._viewProjectionMatrixInvalid = true;
};

/**
 * @ignore
 */
Camera.prototype._invalidateWorldMatrix = function()
{
    Entity.prototype._invalidateWorldMatrix.call(this);
    this._invalidateViewProjectionMatrix();
};

/**
 * @ignore
 */
Camera.prototype._updateViewProjectionMatrix = function()
{
    this._viewMatrix.inverseAffineOf(this.worldMatrix);
    this._viewProjectionMatrix.multiply(this.projectionMatrix, this._viewMatrix);
    this._inverseProjectionMatrix.inverseOf(this._projectionMatrix);
    this._inverseViewProjectionMatrix.inverseOf(this._viewProjectionMatrix);
    this._frustum.update(this._viewProjectionMatrix, this._inverseViewProjectionMatrix);
    this._viewProjectionMatrixInvalid = false;
};

/**
 * @ignore
 */
Camera.prototype._invalidateProjectionMatrix = function()
{
    this._projectionMatrixDirty = true;
    this._clusterPlanesDirty = true;
    this._invalidateViewProjectionMatrix();
};

/**
 * @ignore
 */
Camera.prototype._updateProjectionMatrix = function()
{
    throw new Error("Abstract method!");
};

/**
 * @ignore
 */
Camera.prototype._updateBounds = function()
{
    this._bounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @ignore
 */
Camera.prototype.toString = function()
{
    return "[Camera(name=" + this._name + ")]";
};

/**
 * @ignore
 * @private
 */
Camera.prototype._initClusterPlanes = function()
{
	this._clusterPlanesW = [];
	this._clusterPlanesH = [];

	for (var i = 0; i <= META.OPTIONS.numLightingCellsX; ++i) {
		this._clusterPlanesW[i] = new Float4();
    }

	for (i = 0; i <= META.OPTIONS.numLightingCellsY; ++i) {
		this._clusterPlanesH[i] = new Float4();
	}
};

/**
 * @ignore
 * @private
 */
Camera.prototype._updateClusterPlanes = function()
{
	var v1 = new Float4();
	var v2 = new Float4();
	var v3 = new Float4();

    return function() {
        if (!this._clusterPlanesDirty) return;

        var ex = 2.0 / META.OPTIONS.numLightingCellsX;
        var ey = 2.0 / META.OPTIONS.numLightingCellsY;

        var p;

        if (!this._clusterPlanesW)
            this._initClusterPlanes();

        var unproj = this._inverseProjectionMatrix;

		var x = -1.0;
        for (var i = 0; i <= META.OPTIONS.numLightingCellsX; ++i) {
            v1.set(x, 0.0, 0.0, 1.0);
            v2.set(x, 0.0, 1.0, 1.0);
            v3.set(x, 1.0, 0.0, 1.0);

			unproj.projectPoint(v1, v1);
			unproj.projectPoint(v2, v2);
			unproj.projectPoint(v3, v3);

            this._clusterPlanesW[i].planeFromPoints(v1, v2, v3);

			x += ex;
        }

        var y = -1.0;
        for (i = 0; i <= META.OPTIONS.numLightingCellsY; ++i) {
			p = this._clusterPlanesH[i];

			v1.set(0.0, y, 0.0, 1.0);
			v2.set(1.0, y, 0.0, 1.0);
			v3.set(0.0, y, 1.0, 1.0);

			unproj.projectPoint(v1, v1);
			unproj.projectPoint(v2, v2);
			unproj.projectPoint(v3, v3);

			this._clusterPlanesH[i].planeFromPoints(v1, v2, v3);

			y += ey;
		}

		this._clusterPlanesDirty = false;
    }
}();

/**
 * @ignore
 */
Camera.prototype.copyFrom = function(src)
{
	Entity.prototype.copyFrom.call(this, src);
	this.nearDistance = src.nearDistance;
	this.farDistance = src.farDistance;
};

/**
 * @ignore
 */
Camera.prototype.acceptVisitorPost = function(visitor)
{
    Entity.prototype.acceptVisitor.call(this, visitor);
};

// don't want effects etc to be added unless it's the render camera (which is handled by acceptVisitorPost)
Camera.prototype.acceptVisitor = function(visitor)
{
    return;
};


export { Camera };