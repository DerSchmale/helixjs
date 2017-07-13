import {DirectionalLight} from "../light/DirectionalLight";
import {TextureFilter, TextureWrapMode, META} from "../Helix";
import {Color} from "../core/Color";
import {Matrix4x4} from "../math/Matrix4x4";
import {BoundingAABB} from "../scene/BoundingAABB";
import {MaterialPass} from "../material/MaterialPass";
import {CascadeShadowCasterCollector} from "./CascadeShadowCasterCollector";
import {OrthographicOffCenterCamera} from "../camera/OrthographicOffCenterCamera";
import {GL} from "../core/GL";
import {Float4} from "../math/Float4";
import {RectMesh} from "../mesh/RectMesh";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {FrameBuffer} from "../texture/FrameBuffer";
import {Rect} from "../core/Rect";
import {Texture2D} from "../texture/Texture2D";
import {RenderUtils} from "./RenderUtils";

/**
 * @ignore
 * @param light
 * @param shadowMapSize
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CascadeShadowMapRenderer(light, shadowMapSize)
{
    this._light = light;
    this._shadowMapSize = shadowMapSize || 1024;
    this._shadowMapInvalid = true;
    this._fboFront = null;
    this._fboBack = null;
    this._depthBuffer = null;   // only used if depth textures aren't supported

    this._shadowMap = this._createShadowBuffer();
    this._shadowBackBuffer = DirectionalLight.SHADOW_FILTER.blurShader? this._createShadowBuffer() : null;

    this._shadowMatrices = [ new Matrix4x4(), new Matrix4x4(), new Matrix4x4(), new Matrix4x4() ];
    this._transformToUV = [ new Matrix4x4(), new Matrix4x4(), new Matrix4x4(), new Matrix4x4() ];
    this._inverseLightMatrix = new Matrix4x4();
    this._splitRatios = null;
    this._splitDistances = null;
    this._shadowMapCameras = null;
    this._collectorCamera = new OrthographicOffCenterCamera();
    this._minZ = 0;
    this._numCullPlanes = 0;
    this._cullPlanes = [];
    this._localBounds = new BoundingAABB();
    this._casterCollector = new CascadeShadowCasterCollector();

    this._initSplitProperties();
    this._initCameras();

    this._viewports = [];
};

CascadeShadowMapRenderer.prototype =
{
    get shadowMapSize()
    {
        return this._shadowMapSize;
    },

    set shadowMapSize(value)
    {
        if (this._shadowMapSize === value) return;
        this._shadowMapSize = value;
        this._invalidateShadowMap();
    },

    render: function(viewCamera, scene)
    {
        if (this._shadowMapInvalid)
            this._initShadowMap();

        this._inverseLightMatrix.inverseAffineOf(this._light.worldMatrix);
        this._updateCollectorCamera(viewCamera);
        this._updateSplits(viewCamera);
        this._updateCullPlanes(viewCamera);
        this._collectShadowCasters(scene);
        this._updateCascadeCameras(viewCamera, this._casterCollector.getBounds());

        GL.setRenderTarget(this._fboFront);
        var gl = GL.gl;

        var passType = MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS;
        GL.setClearColor(Color.WHITE);
        GL.clear();

        var numCascades = META.OPTIONS.numShadowCascades;

        for (var cascadeIndex = 0; cascadeIndex < numCascades; ++cascadeIndex) {
            var viewport = this._viewports[cascadeIndex];
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
            RenderUtils.renderPass(this, passType, this._casterCollector.getRenderList(cascadeIndex));
        }

        if (DirectionalLight.SHADOW_FILTER.blurShader)
            this._blur();

        GL.setRenderTarget();

        GL.setClearColor(Color.BLACK);
    },

    _updateCollectorCamera: function(viewCamera)
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

        this._minZ = min.z;

        this._collectorCamera.matrix.copyFrom(this._light.worldMatrix);
        this._collectorCamera._invalidateWorldMatrix();
        this._collectorCamera.setBounds(min.x, max.x + 1, max.y + 1, min.y);
        this._collectorCamera._setRenderTargetResolution(this._shadowMap._width, this._shadowMap._height);
    },

    _updateSplits: function(viewCamera)
    {
        return function(viewCamera) {
            var nearDist = viewCamera.nearDistance;
            var frustumRange = viewCamera.farDistance - nearDist;
            var numCascades = META.OPTIONS.numShadowCascades;

            for (var i = 0; i < numCascades; ++i) {
                var z = nearDist + this._splitRatios[i] * frustumRange;
                this._splitDistances[i] = -z;
            }
        }
    }(),

    _updateCascadeCameras: function(viewCamera, bounds)
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
            var farRatio = this._splitRatios[cascade];
            var camera = this._shadowMapCameras[cascade];

            camera.matrix = this._light.worldMatrix;

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
            min.z = Math.max(this._minZ, min.z);

            var left = Math.max(min.x, minBound.x);
            var right = Math.min(max.x, maxBound.x);
            var bottom = Math.max(min.y, minBound.y);
            var top = Math.min(max.y, maxBound.y);

            var width = right - left;
            var height = top - bottom;

            width = Math.ceil(width / scaleSnap) * scaleSnap;
            height = Math.ceil(height / scaleSnap) * scaleSnap;
            width = Math.max(width, scaleSnap);
            height = Math.max(height, scaleSnap);

            // snap to pixels
            var offsetSnapX = this._shadowMap._width / width * .5;
            var offsetSnapY = this._shadowMap._height / height * .5;

            left = Math.floor(left * offsetSnapX) / offsetSnapX;
            bottom = Math.floor(bottom * offsetSnapY) / offsetSnapY;
            right = left + width;
            top = bottom + height;

            var softness = DirectionalLight.SHADOW_FILTER.softness ? DirectionalLight.SHADOW_FILTER.softness : .1;

            camera.setBounds(left - softness, right + softness, top + softness, bottom - softness);

            // cannot clip nearDistance to frustum, because casters in front may cast into this frustum
            camera.nearDistance = -maxBound.z;
            camera.farDistance = -min.z;

            camera._setRenderTargetResolution(this._shadowMap._width, this._shadowMap._height);

            this._shadowMatrices[cascade].multiply(this._transformToUV[cascade], camera.viewProjectionMatrix);
        }
    },

    _updateCullPlanes: function(viewCamera)
    {
        var frustum = this._collectorCamera.frustum;
        var planes = frustum._planes;

        for (var i = 0; i < 4; ++i)
            this._cullPlanes[i] = planes[i];

        this._numCullPlanes = 4;

        frustum = viewCamera.frustum;
        planes = frustum._planes;

        var dir = this._light.direction;

        for (var j = 0; j < 6; ++j) {
            var plane = planes[j];

            // view frustum planes facing away from the light direction mark a boundary beyond which no shadows need to be known
            if (Float4.dot3(plane, dir) > 0.001)
                this._cullPlanes[this._numCullPlanes++] = plane;
        }
    },

    _collectShadowCasters: function(scene)
    {
        // this._casterCollector.setSplitPlanes(this._splitPlanes);
        this._casterCollector.setCullPlanes(this._cullPlanes, this._numCullPlanes);
        this._casterCollector.setRenderCameras(this._shadowMapCameras);
        this._casterCollector.collect(this._collectorCamera, scene);
    },

    get splitDistances()
    {
        return this._splitDistances;
    },

    /**
     * The ratios that define every cascade's split distance. Reset when numCascades change. 1 is at the far plane, 0 is at the near plane.
     * @param r1
     * @param r2
     * @param r3
     * @param r4
     */
    setSplitRatios: function(r1, r2, r3, r4)
    {
        this._splitRatios[0] = r1;
        this._splitRatios[1] = r2;
        this._splitRatios[2] = r3;
        this._splitRatios[3] = r4;
    },

    getShadowMatrix: function(cascade)
    {
        return this._shadowMatrices[cascade];
    },

    _invalidateShadowMap: function()
    {
        this._shadowMapInvalid = true;
    },

    _initShadowMap: function()
    {
        var numCascades = META.OPTIONS.numShadowCascades;
        var numMapsW = numCascades > 1? 2 : 1;
        var numMapsH = Math.ceil(numCascades / 2);

        var texWidth = this._shadowMapSize * numMapsW;
        var texHeight = this._shadowMapSize * numMapsH;

        this._shadowMap.initEmpty(texWidth, texHeight, DirectionalLight.SHADOW_FILTER.getShadowMapFormat(), DirectionalLight.SHADOW_FILTER.getShadowMapDataType());
        if (!this._depthBuffer) this._depthBuffer = new WriteOnlyDepthBuffer();
        if (!this._fboFront) this._fboFront = new FrameBuffer(this._shadowMap, this._depthBuffer);

        this._depthBuffer.init(texWidth, texHeight, false);
        this._fboFront.init();
        this._shadowMapInvalid = false;

        if (this._shadowBackBuffer) {
            this._shadowBackBuffer.initEmpty(texWidth, texHeight, DirectionalLight.SHADOW_FILTER.getShadowMapFormat(), DirectionalLight.SHADOW_FILTER.getShadowMapDataType());
            if (!this._fboBack) this._fboBack = new FrameBuffer(this._shadowBackBuffer, this._depthBuffer);
            this._fboBack.init();
        }

        this._viewports = [];
        this._viewports.push(new Rect(0, 0, this._shadowMapSize, this._shadowMapSize));
        this._viewports.push(new Rect(this._shadowMapSize, 0, this._shadowMapSize, this._shadowMapSize));
        this._viewports.push(new Rect(0, this._shadowMapSize, this._shadowMapSize, this._shadowMapSize));
        this._viewports.push(new Rect(this._shadowMapSize, this._shadowMapSize, this._shadowMapSize, this._shadowMapSize));

        this._initViewportMatrices(1.0 / numMapsW, 1.0 / numMapsH);
    },

    _initSplitProperties: function()
    {
        var ratio = 1.0;
        this._splitRatios = [];
        this._splitDistances = [];
        this._splitPlanes = [];

        for (var i = META.OPTIONS.numShadowCascades - 1; i >= 0; --i)
        {
            this._splitRatios[i] = ratio;
            this._splitPlanes[i] = new Float4();
            this._splitDistances[i] = 0;
            ratio *= .5;
        }
    },

    _initCameras: function()
    {
        this._shadowMapCameras = [];
        for (var i = 0; i < META.OPTIONS.numShadowCascades; ++i)
        {
            this._shadowMapCameras[i] = new OrthographicOffCenterCamera();
        }
    },

    _initViewportMatrices: function(scaleW, scaleH)
    {
        var halfVec = new Float4(.5,.5,.5);
        for (var i = 0; i < 4; ++i) {
            // transform [-1, 1] to [0 - 1] (also for Z)
            this._transformToUV[i].fromScale(.5);
            this._transformToUV[i].appendTranslation(halfVec);

            // transform to tiled size
            this._transformToUV[i].appendScale(scaleW, scaleH, 1.0);
        }

        this._transformToUV[1].appendTranslation(new Float4(0.5, 0.0, 0.0));
        this._transformToUV[2].appendTranslation(new Float4(0.0, 0.5, 0.0));
        this._transformToUV[3].appendTranslation(new Float4(0.5, 0.5, 0.0));
    },

    _createShadowBuffer: function()
    {
        var tex = new Texture2D();
        //tex.filter = TextureFilter.NEAREST_NOMIP;
        // while filtering doesn't actually work on encoded values, it looks much better this way since at least it can filter
        // the MSB, which is useful for ESM etc
        tex.filter = TextureFilter.BILINEAR_NOMIP;
        tex.wrapMode = TextureWrapMode.CLAMP;
        return tex;
    },

    _blur: function()
    {
        var shader = DirectionalLight.SHADOW_FILTER.blurShader;

        for (var i = 0; i < DirectionalLight.SHADOW_FILTER.numBlurPasses; ++i) {
            GL.setRenderTarget(this._fboBack);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._shadowMap, 1.0 / this._shadowMapSize, 0.0);

            GL.setRenderTarget(this._fboFront);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._shadowBackBuffer, 0.0, 1.0 / this._shadowMapSize);
        }
    }
};

export { CascadeShadowMapRenderer };