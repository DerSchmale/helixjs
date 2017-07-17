import {Entity} from "../entity/Entity";
import {Matrix4x4} from "../math/Matrix4x4";
import {Frustum} from "./Frustum";
import {BoundingVolume} from "../scene/BoundingVolume";
import {Ray} from "../math/Ray";
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
    this._nearDistance = .1;
    this._farDistance = 1000;
    this._frustum = new Frustum();

    this.position.set(0.0, 0.0, 1.0);
}

Camera.prototype = Object.create(Entity.prototype, {
    nearDistance: {
        get: function() {
            return this._nearDistance;
        },

        set: function(value) {
            this._nearDistance = value;
            this._invalidateProjectionMatrix();
        }
    },

    farDistance: {
        get: function() {
            return this._farDistance;
        },

        set: function(value) {
            this._farDistance = value;
            this._invalidateProjectionMatrix();
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
    dir.set(x, y, -1, 1);
    this.inverseProjectionMatrix.transform(dir, dir);
    dir.homogeneousProject();
    this.viewMatrix.transformVector(dir, dir);
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
Camera.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @ignore
 */
Camera.prototype.toString = function()
{
    return "[Camera(name=" + this._name + ")]";
};

export { Camera };