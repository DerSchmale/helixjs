import {META} from "../Helix";
import {Color} from "../core/Color";
import {Matrix4x4} from "../math/Matrix4x4";
import {BoundingAABB} from "../scene/BoundingAABB";
import {MaterialPass} from "../material/MaterialPass";
import {CascadeShadowCasterCollector} from "./CascadeShadowCasterCollector";
import {OrthographicOffCenterCamera} from "../camera/OrthographicOffCenterCamera";
import {GL} from "../core/GL";
import {Float4} from "../math/Float4";
import {RenderUtils} from "./RenderUtils";

/**
 * @ignore
 * @param light
 * @param shadowMapSize
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CascadeShadowMapRenderer()
{
    this._inverseLightMatrix = new Matrix4x4();
    this._shadowMapCameras = null;
    this._collectorCamera = new OrthographicOffCenterCamera();
    this._maxY = 0;
    this._numCullPlanes = 0;
    this._cullPlanes = [];
    this._localBounds = new BoundingAABB();
    this._casterCollector = new CascadeShadowCasterCollector();

    this._initCameras();
}

CascadeShadowMapRenderer.prototype =
{
    render: function(light, atlas, viewCamera, scene)
    {
        this._inverseLightMatrix.inverseAffineOf(light.entity.worldMatrix);
        this._updateCollectorCamera(light, viewCamera);
        this._updateSplits(light, viewCamera);
        this._updateCullPlanes(light, viewCamera);
        this._collectShadowCasters(scene);
        this._updateCascadeCameras(light, atlas, viewCamera, this._casterCollector.getBounds());

        var passType = MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS;
        var numCascades = META.OPTIONS.numShadowCascades;

        var atlasSize = 1.0 / atlas.size;

        for (var c = 0; c < numCascades; ++c) {
            var rect = atlas.getNextRect();
            GL.setViewport(rect);

            var m = light._shadowMatrices[c];
            m.copyFrom(this._shadowMapCameras[c].viewProjectionMatrix);

            // can probably optimize all the calls above into a simpler multiplication/translation
            // TODO: Do the math

            // transform [-1, 1] to [0 - 1] (also for Z)
            m.appendScale(.5);
            m.appendTranslation(.5, .5, .5);
            // transform to tiled size
            m.appendScale(rect.width * atlasSize, rect.height * atlasSize, 1.0);
            m.appendTranslation(rect.x * atlasSize, rect.y * atlasSize, 0.0);

            RenderUtils.renderPass(this, passType, this._casterCollector.getRenderList(c));
        }
    },

    _updateCollectorCamera: function(light, viewCamera)
    {
        var corners = viewCamera.frustum._corners;
        var min = new Float4();
        var max = new Float4();
        var tmp = new Float4();

        this._inverseLightMatrix.transformPoint(corners[0], min);
        max.copyFrom(min);

        for (var i = 1; i < 8; ++i) {
            this._inverseLightMatrix.transformPoint(corners[i], tmp);
            min.minimize(tmp);
            max.maximize(tmp);
        }

        this._maxY = max.y;

        this._collectorCamera.matrix.copyFrom(light.entity.worldMatrix);
        this._collectorCamera._invalidateWorldMatrix();
        this._collectorCamera.setBounds(min.x, max.x + 1, max.z + 1, min.z);
    },

    _updateSplits: function(light, viewCamera)
    {
        var nearDist = viewCamera.nearDistance;
        var frustumRange = viewCamera.farDistance - nearDist;
        var numCascades = META.OPTIONS.numShadowCascades;
        var dists = light._cascadeSplitDistances;
        var ratios = light._cascadeSplitRatios;

        for (var i = 0; i < numCascades; ++i) {
            dists[i] = nearDist + ratios[i] * frustumRange;
        }
    },

    _updateCascadeCameras: function(light, atlas, viewCamera, bounds)
    {
        this._localBounds.transformFrom(bounds, this._inverseLightMatrix);

        var minBound = this._localBounds.minimum;
        var maxBound = this._localBounds.maximum;

        var scaleSnap = 1.0;	// always scale snap to a meter

        var localNear = new Float4();
        var localFar = new Float4();
        var min = new Float4();
        var max = new Float4();

        var corners = viewCamera.frustum.corners;

        // camera distances are suboptimal? need to constrain to local near too?

        var nearRatio = 0;
        var numCascades = META.OPTIONS.numShadowCascades
        for (var cascade = 0; cascade < numCascades; ++cascade) {
            var farRatio = light._cascadeSplitRatios[cascade];
            var camera = this._shadowMapCameras[cascade];

            camera.matrix = light.entity.worldMatrix;

            // figure out frustum bound
            for (var i = 0; i < 4; ++i) {
                var nearCorner = corners[i];
                var farCorner = corners[i + 4];

                var nx = nearCorner.x;
                var ny = nearCorner.y;
                var nz = nearCorner.z;
                var dx = farCorner.x - nx;
                var dy = farCorner.y - ny;
                var dz = farCorner.z - nz;
                localNear.x = nx + dx*nearRatio;
                localNear.y = ny + dy*nearRatio;
                localNear.z = nz + dz*nearRatio;
                localFar.x = nx + dx*farRatio;
                localFar.y = ny + dy*farRatio;
                localFar.z = nz + dz*farRatio;

                this._inverseLightMatrix.transformPoint(localNear, localNear);
                this._inverseLightMatrix.transformPoint(localFar, localFar);

                if (i === 0) {
                    min.copyFrom(localNear);
                    max.copyFrom(localNear);
                }
                else {
                    min.minimize(localNear);
                    max.maximize(localNear);
                }

                min.minimize(localFar);
                max.maximize(localFar);
            }

            nearRatio = farRatio;

            // do not render beyond range of view camera or scene depth
            max.y = Math.min(this._maxY, max.y);

            var left = Math.max(min.x, minBound.x);
            var right = Math.min(max.x, maxBound.x);
            var bottom = Math.max(min.z, minBound.z);
            var top = Math.min(max.z, maxBound.z);

            var width = right - left;
            var height = top - bottom;

            width = Math.ceil(width / scaleSnap) * scaleSnap;
            height = Math.ceil(height / scaleSnap) * scaleSnap;
            width = Math.max(width, scaleSnap);
            height = Math.max(height, scaleSnap);

            // snap to pixels
            var offsetSnapH = atlas.size / width * .5;
            var offsetSnapV = atlas.size / height * .5;

            left = Math.floor(left * offsetSnapH) / offsetSnapH;
            bottom = Math.floor(bottom * offsetSnapV) / offsetSnapV;
            right = left + width;
            top = bottom + height;

            var softness = META.OPTIONS.shadowFilter.softness ? META.OPTIONS.shadowFilter.softness : .002;

            camera.setBounds(left - softness, right + softness, top + softness, bottom - softness);

            // cannot clip nearDistance to frustum, because casters in front may cast into this frustum
            camera.nearDistance = minBound.y;
            camera.farDistance = max.y;
        }
    },

    _updateCullPlanes: function(light, viewCamera)
    {
        var frustum = this._collectorCamera.frustum;
        var planes = frustum._planes;

        for (var i = 0; i < 4; ++i)
            this._cullPlanes[i] = planes[i];

        this._numCullPlanes = 4;

        frustum = viewCamera.frustum;
        planes = frustum._planes;

        var dir = light.direction;

        for (var j = 0; j < 6; ++j) {
            var plane = planes[j];

            // view frustum planes facing away from the light direction mark a boundary beyond which no shadows need to be known
            if (plane.dot3(dir) > 0.001)
                this._cullPlanes[this._numCullPlanes++] = plane;
        }
    },

    _collectShadowCasters: function(scene)
    {
        this._casterCollector.setCullPlanes(this._cullPlanes, this._numCullPlanes);
        this._casterCollector.setRenderCameras(this._shadowMapCameras);
        this._casterCollector.collect(this._collectorCamera, scene);
    },

    _initCameras: function()
    {
        this._shadowMapCameras = [];
        for (var i = 0; i < META.OPTIONS.numShadowCascades; ++i)
        {
            this._shadowMapCameras[i] = new OrthographicOffCenterCamera();
        }
    }
};

export { CascadeShadowMapRenderer };