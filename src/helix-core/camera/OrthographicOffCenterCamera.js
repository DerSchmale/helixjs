import {Camera} from "./Camera";
import {PerspectiveCamera} from "./PerspectiveCamera";

/**
 * @classdesc
 * Only used for things like shadow map rendering.
 *
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function OrthographicOffCenterCamera()
{
    Camera.call(this);
    this._left = -1;
    this._right = 1;
    this._top = 1;
    this._bottom = -1;
}

OrthographicOffCenterCamera.prototype = Object.create(Camera.prototype);

OrthographicOffCenterCamera.prototype.setBounds = function(left, right, top, bottom)
{
    this._left = left;
    this._right = right;
    this._top = top;
    this._bottom = bottom;
    this._invalidateProjectionMatrix();
};

OrthographicOffCenterCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.fromOrthographicOffCenterProjection(this._left, this._right, this._top, this._bottom, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};

/**
 * @ignore
 */
OrthographicOffCenterCamera.prototype.copyTo = function(target)
{
	Camera.prototype.copyTo.call(this, target);
	target.setBounds(this._left, this._right, this._top, this._bottom);
};

/**
 * @inheritDoc
 */
OrthographicOffCenterCamera.prototype.clone = function()
{
	var clone = new OrthographicOffCenterCamera();
	this.copyTo(clone);
	return clone;
};

export { OrthographicOffCenterCamera };