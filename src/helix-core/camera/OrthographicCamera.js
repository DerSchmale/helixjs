import {Camera} from "./Camera";

/**
 * @extends Camera
 *
 * @classdesc
 * OrthographicCamera is a Camera used for rendering with orthographic projection.
 *
 * @property {number} height The height of the projection. Width is calculated based on aspect ratio.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function OrthographicCamera()
{
    Camera.call(this);

    this._height = 10.0;
    this._aspectRatio = 1;
}


OrthographicCamera.prototype = Object.create(Camera.prototype, {
	height: {
        get: function()
        {
            return this._height;
        },
        set: function(value)
        {
            if (this._height === value) return;
            this._height = value;
            this._invalidateProjectionMatrix();
        }
    }
});

/**
 * @ignore
 */
OrthographicCamera.prototype._setAspectRatio = function(value)
{
    if (this._aspectRatio === value) return;

    this._aspectRatio = value;
    this._invalidateProjectionMatrix();
};

/**
 * @ignore
 */
OrthographicCamera.prototype._setRenderTargetResolution = function(width, height)
{
    Camera.prototype._setRenderTargetResolution.call(this, width, height);
    this._setAspectRatio(width / height);
};

/**
 * @ignore
 */
OrthographicCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.fromOrthographicProjection(this._height * this._aspectRatio, this._height, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};


/**
 * @ignore
 */
OrthographicCamera.prototype.copyFrom = function(src)
{
	Camera.prototype.copyFrom.call(this, src);
	this.height = src.height;
};

/**
 * @inheritDoc
 */
OrthographicCamera.prototype.clone = function()
{
	var clone = new OrthographicCamera();
	clone.copyFrom(this);
	return clone;
};

export { OrthographicCamera };