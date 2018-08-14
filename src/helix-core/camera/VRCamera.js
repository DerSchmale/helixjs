import {Float4} from "../math/Float4";
import {Camera} from "./Camera";
import {META} from "../Helix";
import {Frustum} from "./Frustum";
import {Matrix4x4} from "../math/Matrix4x4";

var swapMatrix = new Matrix4x4(
    [
        0, 0, 1, 0,
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
    ]);

/**
 * @ignore
 * @constructor
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

    this._matrix.inverseOf(this._viewMatrix);
    this._applyMatrix();
};

/**
 * @ignore
 */
function VRCamera()
{
    VRDummyCamera.call(this);
    this.cameraLeft = new VRDummyCamera();
    this.cameraRight = new VRDummyCamera();
    this.attach(this.cameraLeft);
    this.attach(this.cameraRight);

    this._frameData = new VRFrameData();
}

VRCamera.prototype = Object.create(VRDummyCamera.prototype);

VRCamera.prototype.update = function(srcCamera)
{
    var dir = new Float4();

    return function (srcCamera) {
        // the only thing we'd like to keep from the world matrix is the position and the rotation about the Z axis
        var worldMatrix = srcCamera.worldMatrix;
        worldMatrix.getColumn(3, this.position);
        // use the forward vector to figure out direction
        worldMatrix.getColumn(1, dir);
        dir.z = 0;
        dir.add(this.position);
        this.lookAt(dir);

        META.VR_DISPLAY.getFrameData(this._frameData);
        this.cameraLeft.updateMatrices(this._frameData.leftViewMatrix, this._frameData.leftProjectionMatrix);
        this.cameraRight.updateMatrices(this._frameData.rightViewMatrix, this._frameData.rightProjectionMatrix);

        var frustumLeft = this.cameraLeft.frustum;
        var frustumRight = this.cameraRight.frustum;
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
    }
}();

/**
 * @ignore
 */
VRCamera.prototype.toString = function()
{
    return "[VRCamera(name=" + this._name + ")]";
};






export { VRCamera };