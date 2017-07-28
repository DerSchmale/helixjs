import {Color} from "../core/Color";
import {RenderCollector} from "./RenderCollector";
import {ApplyGammaShader, CopyChannelsShader} from "./UtilShaders";
import {Texture2D} from "../texture/Texture2D";
import {MaterialPass} from "../material/MaterialPass";
import {RectMesh} from "../mesh/RectMesh";
import {_HX_, TextureFormat, TextureFilter, TextureWrapMode, META, capabilities, Comparison} from "../Helix";
import {FrameBuffer} from "../texture/FrameBuffer";
import {GL} from "../core/GL";
import {RenderUtils} from "./RenderUtils";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {DirectionalLight} from "../light/DirectionalLight";
import {PointLight} from "../light/PointLight";
import {LightProbe} from "../light/LightProbe";
import {GBuffer} from "./GBuffer";
import {BlendState} from "./BlendState";
import {DeferredAmbientShader} from "../light/shaders/DeferredAmbientShader";
import {RenderPath} from "./RenderPath";
import {SpotLight} from "../light/SpotLight";
import {PerspectiveCamera} from "../camera/PerspectiveCamera";
import {SpotShadowCasterCollector} from "./SpotShadowCasterCollector";

/**
 * @ignore
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotShadowMapRenderer(light, shadowMapSize)
{
    this._light = light;
    this._shadowMapSize = shadowMapSize || 256;
    this._shadowMapInvalid = true;
    this._fboFront = null;
    this._fboBack = null;
    this._depthBuffer = null;   // only used if depth textures aren't supported

    // TODO: Some day, we might want to create a shadow atlas and dynamically assign regions, sized based on screen-size
    this._shadowMap = this._createShadowBuffer();
    this._blurShader = META.OPTIONS.spotShadowFilter.blurShader;
    this._shadowBackBuffer = this._blurShader? this._createShadowBuffer() : null;
    this._softness = META.OPTIONS.spotShadowFilter.softness ? META.OPTIONS.spotShadowFilter.softness : .002;

    this._casterCollector = new SpotShadowCasterCollector();

    this._camera = new PerspectiveCamera();
    this._camera.near = .01;
    this._scene = null;

}

SpotShadowMapRenderer.prototype =
{
    get shadowMatrix() {
        return this._camera.viewProjectionMatrix;
    },

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

    render: function (viewCamera, scene)
    {
        if (this._shadowMapInvalid)
            this._initShadowMap();

        var light = this._light;
        this._camera.verticalFOV = light.outerAngle;
        this._camera.far = light._radius;
        this._camera.matrix.copyFrom(light.worldMatrix);
        this._camera._invalidateWorldMatrix();

        this._casterCollector.collect(this._camera, scene);

        GL.setRenderTarget(this._fboFront);
        GL.setClearColor(Color.WHITE);
        GL.clear();

        RenderUtils.renderPass(this, MaterialPass.SPOT_LIGHT_SHADOW_MAP_PASS, this._casterCollector.getRenderList());

        GL.setColorMask(true);

        if (this._blurShader)
            this._blur();

        GL.setRenderTarget();
        GL.setClearColor(Color.BLACK);
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

    _invalidateShadowMap: function()
    {
        this._shadowMapInvalid = true;
    },

    _initShadowMap: function()
    {
        var size = this._shadowMapSize;

        this._shadowMap.initEmpty(size, size, META.OPTIONS.spotShadowFilter.getShadowMapFormat(), META.OPTIONS.spotShadowFilter.getShadowMapDataType());
        if (!this._depthBuffer) this._depthBuffer = new WriteOnlyDepthBuffer();
        if (!this._fboFront) this._fboFront = new FrameBuffer(this._shadowMap, this._depthBuffer);

        this._depthBuffer.init(size, size, false);
        this._fboFront.init();
        this._shadowMapInvalid = false;

        if (this._shadowBackBuffer) {
            this._shadowBackBuffer.initEmpty(size, size, META.OPTIONS.spotShadowFilter.getShadowMapFormat(), META.OPTIONS.spotShadowFilter.getShadowMapDataType());
            if (!this._fboBack) this._fboBack = new FrameBuffer(this._shadowBackBuffer, this._depthBuffer);
            this._fboBack.init();
        }
    },

    _blur: function()
    {
        var shader = this._blurShader;
        var numPasses = META.OPTIONS.spotShadowFilter.numBlurPasses;

        for (var i = 0; i < numPasses; ++i) {
            GL.setRenderTarget(this._fboBack);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._shadowMap, 1.0 / this._shadowMapSize, 0.0);

            GL.setRenderTarget(this._fboFront);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._shadowBackBuffer, 0.0, 1.0 / this._shadowMapSize);
        }
    }
};

export { SpotShadowMapRenderer };