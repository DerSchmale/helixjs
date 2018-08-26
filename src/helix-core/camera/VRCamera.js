import {Camera} from "./Camera";
import {META} from "../Helix";
import {Frustum} from "./Frustum";
import {Matrix4x4} from "../math/Matrix4x4";

var swapMatrix = new Matrix4x4(
    [
        1, 0, 0, 0,
        0, 0, -1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
    ]);

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VRDummyCamera()
{
    Camera.call(this);
    this._projectionMatrixDirty = false;
}

VRDummyCamera.prototype = Object.create(Camera.prototype);

VRDummyCamera.prototype._updateProjectionMatrix = function() {};
VRDummyCamera.prototype._invalidateProjectionMatrix = function() {};

VRDummyCamera.prototype.updateMatrices = function(viewMatrix, projectionMatrix)
{
    // WebVR uses Y up, Z out of screen
    this._viewMatrix.set(viewMatrix);
    this._viewMatrix.prepend(swapMatrix);

    this._projectionMatrix.set(projectionMatrix);
    // this._projectionMatrix.swapColums(1, 2);
    this._projectionMatrixDirty = false;

    // the first frame may contain invalid data (all 0s)
    if (this._matrix.inverseAffineOf(this._viewMatrix))
        this._applyMatrix();
};

/**
 * @classdesc
 *
 * VRCamera provides a camera to use with {@linkcode VRRenderer}.
 *
 * @property {Boolean} useRoomScale If true, the view matrices will be transformed to match the VR room scale.
 * @property {Matrix4x4} worldMatrixLeft The left eye's world matrix.
 * @property {Matrix4x4} worldMatrixRight The right eye's world matrix.
 *
 * @see VRRenderer
 */
function VRCamera()
{
    VRDummyCamera.call(this);
    this._cameraLeft = new VRDummyCamera();
    this._cameraRight = new VRDummyCamera();
    this.attach(this._cameraLeft);
    this.attach(this._cameraRight);

    this._frameData = new VRFrameData();
}

VRCamera.prototype = Object.create(VRDummyCamera.prototype, {
    worldMatrixLeft: {
        get: function() {
            return this._cameraLeft.worldMatrix;
        }
    },

    worldMatrixRight: {
        get: function() {
            return this._cameraRight.worldMatrix;
        }
    }
});

/**
 * @ignore
 */
VRCamera.prototype._updateVR = function()
{
    META.VR_DISPLAY.getFrameData(this._frameData);
    this._cameraLeft.updateMatrices(this._frameData.leftViewMatrix, this._frameData.leftProjectionMatrix, this.useRoomScale);
    this._cameraRight.updateMatrices(this._frameData.rightViewMatrix, this._frameData.rightProjectionMatrix, this.useRoomScale);

    var frustumLeft = this._cameraLeft.frustum;
    var frustumRight = this._cameraRight.frustum;
    var planes = this._frustum.planes;
    var corners = this._frustum.corners;
    var planesLeft = frustumLeft.planes;
    var planesRight = frustumRight.planes;
    var cornersLeft = frustumLeft.corners;
    var cornersRight = frustumRight.corners;

    // use all the left cam's planes, except the RIGHT plane
    planes[Frustum.PLANE_LEFT] = planesLeft[Frustum.PLANE_LEFT];
    planes[Frustum.PLANE_RIGHT] = planesRight[Frustum.PLANE_RIGHT];
    planes[Frustum.PLANE_TOP] = planesLeft[Frustum.PLANE_TOP];
    planes[Frustum.PLANE_BOTTOM] = planesLeft[Frustum.PLANE_BOTTOM];
    planes[Frustum.PLANE_NEAR] = planesLeft[Frustum.PLANE_NEAR];
    planes[Frustum.PLANE_FAR] = planesLeft[Frustum.PLANE_FAR];

    corners[0] = cornersLeft[0];
    corners[1] = cornersRight[1];
    corners[2] = cornersRight[2];
    corners[3] = cornersLeft[3];
    corners[4] = cornersLeft[4];
    corners[5] = cornersRight[5];
    corners[6] = cornersRight[6];
    corners[7] = cornersLeft[7];

    // this camera should only be used for culling, so make sure frustum doesn't get re-updated
    this._viewProjectionMatrixInvalid = false;
    this._projectionMatrixDirty = false;
};

/**
 * @ignore
 */
VRCamera.prototype.toString = function()
{
    return "[VRCamera(name=" + this._name + ")]";
};

export { VRCamera };