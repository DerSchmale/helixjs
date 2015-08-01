/**
 *
 * @constructor
 */
HX.Frustum = function()
{
    this._planes = new Array(6);
    this._corners = new Array(8);

    for (var i = 0; i < 6; ++i)
        this._planes[i] = new HX.Float4();

    for (var i = 0; i < 8; ++i)
        this._corners[i] = new HX.Float4();
}

HX.Frustum.PLANE_LEFT = 0;
HX.Frustum.PLANE_RIGHT = 1;
HX.Frustum.PLANE_BOTTOM = 2;
HX.Frustum.PLANE_TOP = 3;
HX.Frustum.PLANE_NEAR = 4;
HX.Frustum.PLANE_FAR = 5;

HX.Frustum.CLIP_SPACE_CORNERS = [	new HX.Float4(-1.0, -1.0, -1.0, 1.0),
                                    new HX.Float4(1.0, -1.0, -1.0, 1.0),
                                    new HX.Float4(1.0, 1.0, -1.0, 1.0),
                                    new HX.Float4(-1.0, 1.0, -1.0, 1.0),
                                    new HX.Float4(-1.0, -1.0, 1.0, 1.0),
                                    new HX.Float4(1.0, -1.0, 1.0, 1.0),
                                    new HX.Float4(1.0, 1.0, 1.0, 1.0),
                                    new HX.Float4(-1.0, 1.0, 1.0, 1.0)
                                ];

HX.Frustum.prototype =
{
    getPlanes: function() { return this._planes; },
    getCorners: function() { return this._corners; },

    update: function(projection, inverseProjection)
    {
        this._updatePlanes(projection);
        this._updateCorners(inverseProjection);
    },

    _updatePlanes: function(projection)
    {
        var r1 = projection.getRow(0);
        var r2 = projection.getRow(1);
        var r3 = projection.getRow(2);
        var r4 = projection.getRow(3);

        this._planes[HX.Frustum.PLANE_LEFT].sum(r4, r1);
        this._planes[HX.Frustum.PLANE_RIGHT].difference(r4, r1);
        this._planes[HX.Frustum.PLANE_BOTTOM].sum(r4, r2);
        this._planes[HX.Frustum.PLANE_TOP].difference(r4, r2);
        this._planes[HX.Frustum.PLANE_NEAR].sum(r4, r3);
        this._planes[HX.Frustum.PLANE_FAR].difference(r4, r3);

        for (var i = 0; i < 6; ++i)
            this._planes[i].normalizeAsPlane();
    },

    _updateCorners: function(inverseProjection)
    {
        for (var i = 0; i < 8; ++i) {
            var corner = this._corners[i];
            inverseProjection.transformTo(HX.Frustum.CLIP_SPACE_CORNERS[i], corner);
            corner.scale(1.0 / corner.w);
        }
    }
};

/**
 *
 * @constructor
 */
HX.Camera = function()
{
    HX.SceneNode.call(this);

    this._renderTargetWidth = 0;
    this._renderTargetHeight = 0;
    this._viewProjectionMatrixInvalid = true;
    this._viewProjectionMatrix = new HX.Matrix4x4();
    this._inverseProjectionMatrix = new HX.Matrix4x4();
    this._inverseViewProjectionMatrix = new HX.Matrix4x4();
    this._projectionMatrix = new HX.Matrix4x4();
    this._viewMatrix = new HX.Matrix4x4();
    this._projectionMatrixDirty = true;
    this._nearDistance = .1;
    this._farDistance = 1000;
    this._frustum = new HX.Frustum();

    this.position.set(0.0, 0.0, 1.0);
};

HX.Camera.prototype = Object.create(HX.SceneNode.prototype);

HX.Camera.prototype.getViewProjectionMatrix = function ()
{
    if (this._viewProjectionMatrixInvalid)
        this._updateViewProjectionMatrix();

    return this._viewProjectionMatrix;
};

/**
 * Frustum is in world space
 */
HX.Camera.prototype.getFrustum = function ()
{
    if (this._viewProjectionMatrixInvalid)
        this._updateViewProjectionMatrix();

    return this._frustum;
};

HX.Camera.prototype.getInverseViewProjectionMatrix = function ()
{
    if (this._viewProjectionMatrixInvalid)
        this._updateViewProjectionMatrix();

    return this._inverseViewProjectionMatrix;
};

HX.Camera.prototype.getInverseProjectionMatrix = function()
{
    if (this._projectionMatrixDirty)
        this._updateProjectionMatrix();

    return this._inverseProjectionMatrix;
};

HX.Camera.prototype.getProjectionMatrix = function()
{
    if (this._projectionMatrixDirty)
        this._updateProjectionMatrix();

    return this._projectionMatrix;
};

HX.Camera.prototype.getViewMatrix = function()
{
    if (this._viewProjectionMatrixInvalid)
        this._updateViewProjectionMatrix();

    return this._viewMatrix;
};

HX.Camera.prototype.getNearDistance = function()
{
    return this._nearDistance;
};

HX.Camera.prototype.setNearDistance = function(value)
{
    this._nearDistance = value;
    this._invalidateProjectionMatrix();
};

HX.Camera.prototype.getFarDistance = function()
{
    return this._farDistance;
};

HX.Camera.prototype.setFarDistance = function(value)
{
    this._farDistance = value;
    this._invalidateProjectionMatrix();
};

HX.Camera.prototype._setRenderTargetResolution = function(width, height)
{
    this._renderTargetWidth = width;
    this._renderTargetHeight = height;
};

HX.Camera.prototype._invalidateViewProjectionMatrix = function()
{
    this._viewProjectionMatrixInvalid = true;
};

HX.Camera.prototype._invalidateWorldTransformationMatrix = function()
{
    HX.SceneNode.prototype._invalidateWorldTransformationMatrix.call(this);
    this._invalidateViewProjectionMatrix();
};

HX.Camera.prototype._updateViewProjectionMatrix = function()
{
    this._viewMatrix.inverseAffineOf(this.getWorldMatrix());
    this._viewProjectionMatrix.product(this.getProjectionMatrix(), this._viewMatrix);
    this._inverseProjectionMatrix.inverseOf(this._projectionMatrix);
    this._inverseViewProjectionMatrix.inverseOf(this._viewProjectionMatrix);
    this._frustum.update(this._viewProjectionMatrix, this._inverseViewProjectionMatrix);
    this._viewProjectionMatrixInvalid = false;
};

HX.Camera.prototype._invalidateProjectionMatrix = function()
{
    this._projectionMatrixDirty = true;
    this._invalidateViewProjectionMatrix();
};

HX.Camera.prototype._updateProjectionMatrix = function()
{
    throw "Abstract method!";
};

HX.Camera.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @constructor
 */
HX.PerspectiveCamera = function ()
{
    HX.Camera.call(this);

    this._vFOV = 1.047198;  // radians!
    this._aspectRatio = 0;
};

HX.PerspectiveCamera.prototype = Object.create(HX.Camera.prototype);

// radians!
HX.PerspectiveCamera.prototype.getVerticalFOV = function()
{
    return this._vFOV;
};

HX.PerspectiveCamera.prototype.setVerticalFOV = function(value)
{
    this._nearDistance = value;
    this._invalidateProjectionMatrix();
};

HX.PerspectiveCamera.prototype._setAspectRatio = function(value)
{
    if (this._aspectRatio == value) return;

    this._aspectRatio = value;
    this._invalidateProjectionMatrix();
};

HX.PerspectiveCamera.prototype._setRenderTargetResolution = function(width, height)
{
    HX.Camera.prototype._setRenderTargetResolution.call(this, width, height);
    this._setAspectRatio(width / height);
};

HX.PerspectiveCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.perspectiveProjection(this._vFOV, this._aspectRatio, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};

/**
 * @constructor
 */
HX.OrthographicOffCenterCamera = function ()
{
    HX.Camera.call(this);
    this._left = -1;
    this._right = 1;
    this._top = 1;
    this._bottom = -1;
};

HX.OrthographicOffCenterCamera.prototype = Object.create(HX.Camera.prototype);

HX.OrthographicOffCenterCamera.prototype.setBounds = function(left, right, top, bottom)
{
    this._left = left;
    this._right = right;
    this._top = top;
    this._bottom = bottom;
    this._invalidateProjectionMatrix();
};

HX.OrthographicOffCenterCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.orthographicOffCenterProjection(this._left, this._right, this._top, this._bottom, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};