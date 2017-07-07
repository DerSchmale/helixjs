import {Color} from "../core/Color";
import {RenderCollector} from "./RenderCollector";
import {ApplyGammaShader, CopyChannelsShader} from "./UtilShaders";
import {Texture2D} from "../texture/Texture2D";
import {MaterialPass} from "../material/MaterialPass";
import {RectMesh} from "../mesh/RectMesh";
import {_HX_, TextureFormat, TextureFilter, TextureWrapMode, META} from "../Helix";
import {FrameBuffer} from "../texture/FrameBuffer";
import {GL} from "../core/GL";
import {RenderUtils} from "./RenderUtils";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {DirectionalLight} from "../light/DirectionalLight";

function ForwardRenderer()
{
    this._width = 0;
    this._height = 0;

    this._gammaApplied = false;

    this._copyTextureShader = new CopyChannelsShader("xyzw", true);
    this._applyGamma = new ApplyGammaShader();

    // devices with high resolution (retina etc)
    this._scale = 1.0; // > 1.0? .5 : 1.0;

    this._camera = null;
    this._scene = null;
    this._depthBuffer = this._createDepthBuffer();
    this._hdrBack = new ForwardRenderer.HDRBuffers(this._depthBuffer);
    this._hdrFront = new ForwardRenderer.HDRBuffers(this._depthBuffer);
    this._renderCollector = new RenderCollector();
    this._normalDepthTexture = null;
    this._normalDepthFBO = null;
    this._ssaoTexture = this._createDummySSAOTexture();
    this._aoEffect = null;
    this._backgroundColor = Color.BLACK.clone();
    //this._previousViewProjection = new Matrix4x4();
    this._depthPrepass = true;
    this._debugMode = ForwardRenderer.DebugRenderMode.NONE;
}

ForwardRenderer.DebugRenderMode = {
    NONE: 0,
    SSAO: 1
};

ForwardRenderer.HDRBuffers = function(depthBuffer)
{
    this.texture = new Texture2D();
    this.texture.filter = TextureFilter.BILINEAR_NOMIP;
    this.texture.wrapMode = TextureWrapMode.CLAMP;
    this.fbo = new FrameBuffer(this.texture);
    this.fboDepth = new FrameBuffer(this.texture, depthBuffer);
};

ForwardRenderer.HDRBuffers.prototype =
{
    dispose: function()
    {
        this.texture.dispose();
        this.fbo.dispose();
        this.fboDepth.dispose();
    },

    resize: function(width, height)
    {
        this.texture.initEmpty(width, height, TextureFormat.RGBA, _HX_.HDR_FORMAT);
        this.fbo.init();
        this.fboDepth.init();
    }
};

ForwardRenderer.prototype =
{
    get debugMode()
    {
        return this._debugMode;
    },

    set debugMode(value)
    {
        this._debugMode = value;
    },

    get backgroundColor()
    {
        return this._backgroundColor;
    },

    set backgroundColor(value)
    {
        this._backgroundColor = new Color(value);
    },

    get depthPrepass()
    {
        return this._depthPrepass;
    },

    set depthPrepass(value)
    {
        this._depthPrepass = value;
    },

    get scale()
    {
        return this._scale;
    },

    set scale(value)
    {
        this._scale = value;
    },

    get camera()
    {
        return this._camera;
    },

    get ambientOcclusion()
    {
        return this._aoEffect;
    },

    set ambientOcclusion(value)
    {
        this._aoEffect = value;
        if (!this._aoEffect) this._ssaoTexture = this._createDummySSAOTexture();
    },

    /*get localReflections()
    {
        return this._ssrEffect;
    },

    set localReflections(value)
    {
        this._ssrEffect = value;
        this._ssrTexture = this._ssrEffect? this._ssrEffect.getSSRTexture() : null;
    },*/

    /**
     * It's not recommended changing render targets if they have different sizes (so splitscreen should be fine). Otherwise, use different renderer instances.
     * @param camera
     * @param scene
     * @param dt
     * @param renderTarget (optional)
     */
    render: function (camera, scene, dt, renderTarget)
    {
        this._gammaApplied = _HX_.GAMMA_CORRECT_LIGHTS;
        this._camera = camera;
        this._scene = scene;


        this._updateSize(renderTarget);

        camera._setRenderTargetResolution(this._width, this._height);
        this._renderCollector.collect(camera, scene);

        this._renderShadowCasters();

        var opaqueStaticLit = this._renderCollector.getOpaqueStaticRenderList();
        var opaqueDynamicLit = this._renderCollector.getOpaqueDynamicRenderList();
        var transparentStaticLit = this._renderCollector.getTransparentStaticRenderList();
        var transparentDynamicLit = this._renderCollector.getTransparentDynamicRenderList();

        GL.setClearColor(Color.BLACK);

        GL.setDepthMask(true);
        this._renderNormalDepth(opaqueStaticLit, opaqueDynamicLit);
        this._renderAO();

        GL.setRenderTarget(this._hdrFront.fboDepth);
        GL.setClearColor(this._backgroundColor);
        GL.clear();

        this._renderDepthPrepass(opaqueStaticLit);
        this._renderDepthPrepass(opaqueDynamicLit);

        this._renderStatics(opaqueStaticLit);
        this._renderDynamics(opaqueDynamicLit);

        // TODO: Render dynamic lit opaques here

        // THIS IS EXTREMELY INEFFICIENT ON SOME (TILED HIERARCHY) PLATFORMS
        if (this._renderCollector.needsBackbuffer)
            this._copyToBackBuffer();

        this._renderStatics(transparentStaticLit);
        // TODO: Render dynamic lit transparents here

        this._swapHDRFrontAndBack();
        this._renderEffects(dt);

        this._renderToScreen(renderTarget);

        //this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);

        GL.setBlendState();
        GL.setDepthMask(true);
    },

    _renderDepthPrepass: function(list)
    {
        if (!this._depthPrepass) return;
        var gl = GL.gl;
        gl.colorMask(false, false, false, false);
        this._renderPass(MaterialPass.NORMAL_DEPTH_PASS, list);
        gl.colorMask(true, true, true, true);
    },

    _renderStatics: function(list)
    {
        this._renderPass(MaterialPass.BASE_PASS, list);
    },

    _renderDynamics: function(list)
    {
        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        for (var i = 0; i < numLights; ++i) {
            var light = lights[i];

            // I don't like type checking, but lighting support is such a core thing...
            // maybe we can work in a more plug-in like light system
            if (light instanceof DirectionalLight) {
                var passType = light.castShadows? MaterialPass.DIR_LIGHT_SHADOW_PASS : MaterialPass.DIR_LIGHT_PASS;

                // PASS IN LIGHT AS DATA, so the material can update it
                this._renderPass(passType, list, light);
            }
        }
    },

    _renderNormalDepth: function(list1, list2)
    {
        if (!this._renderCollector.needsNormalDepth && !this._aoEffect) return;
        if (!this._normalDepthTexture) this._initNormalDepth();
        GL.setRenderTarget(this._normalDepthFBO);
        // furthest depth and alpha must be 1, the rest 0
        GL.setClearColor(Color.BLUE);
        GL.clear();
        this._renderPass(MaterialPass.NORMAL_DEPTH_PASS, list1);
        this._renderPass(MaterialPass.NORMAL_DEPTH_PASS, list2);
        GL.setClearColor(Color.BLACK);
    },

    _renderAO: function()
    {
        if (this._aoEffect) {
            this._ssaoTexture = this._aoEffect.getAOTexture();
            this._aoEffect.render(this, 0);
        }
    },

    _renderShadowCasters: function ()
    {
        var casters = this._renderCollector._shadowCasters;
        var len = casters.length;

        for (var i = 0; i < len; ++i)
            casters[i].render(this._camera, this._scene)
    },

    _renderEffect: function (effect, dt)
    {
        this._gammaApplied = this._gammaApplied || effect._outputsGamma;
        effect.render(this, dt);
    },

    _renderPass: function (passType, renderItems, data)
    {
        RenderUtils.renderPass(this, passType, renderItems, data);
    },

    _renderToScreen: function (renderTarget)
    {
        GL.setRenderTarget(renderTarget);
        GL.clear();

        if (this._debugMode === ForwardRenderer.DebugRenderMode.SSAO) {
            this._copyTextureShader.execute(RectMesh.DEFAULT, this._ssaoTexture);
            return;
        }

        // TODO: render directly to screen if last post process effect?
        if (this._gammaApplied)
            this._copyTextureShader.execute(RectMesh.DEFAULT, this._hdrBack.texture);
        else
            this._applyGamma.execute(RectMesh.DEFAULT, this._hdrBack.texture);
    },

    _renderEffects: function (dt)
    {
        var effects = this._renderCollector._effects;
        if (!effects) return;

        var len = effects.length;

        for (var i = 0; i < len; ++i) {
            var effect = effects[i];
            if (effect.isSupported()) {
                this._renderEffect(effect, dt);
                this._swapHDRFrontAndBack();
            }
        }
    },

    _updateSize: function (renderTarget)
    {
        var width, height;
        if (renderTarget) {
            width = renderTarget.width;
            height = renderTarget.height;
        }
        else {
            width = Math.floor(META.TARGET_CANVAS.width * this._scale);
            height = Math.floor(META.TARGET_CANVAS.height * this._scale);
        }
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this._depthBuffer.init(this._width, this._height, true);
            this._hdrBack.resize(this._width, this._height);
            this._hdrFront.resize(this._width, this._height);
            if (this._normalDepthTexture) {
                this._normalDepthTexture.initEmpty(width, height);
                this._normalDepthFBO.init();
            }
        }
    },

    // allows effects to ping pong on the renderer's own buffers
    _swapHDRFrontAndBack: function()
    {
        var tmp = this._hdrBack;
        this._hdrBack = this._hdrFront;
        this._hdrFront = tmp;
    },

    _createDepthBuffer: function()
    {
        /*if (HX.EXT_DEPTH_TEXTURE) {
            this._depthBuffer = new HX.Texture2D();
            this._depthBuffer.filter = HX.TextureFilter.BILINEAR_NOMIP;
            this._depthBuffer.wrapMode = HX.TextureWrapMode.CLAMP;
        }
        else {*/
            return new WriteOnlyDepthBuffer();
    },

    _initNormalDepth: function()
    {
        this._normalDepthTexture = new Texture2D();
        this._normalDepthTexture.filter = TextureFilter.BILINEAR_NOMIP;
        this._normalDepthTexture.wrapMode = TextureWrapMode.CLAMP;
        this._normalDepthTexture.initEmpty(this._width, this._height);

        this._normalDepthFBO = new FrameBuffer(this._normalDepthTexture, this._depthBuffer);
        this._normalDepthFBO.init();
    },

    _createDummySSAOTexture: function()
    {
        var data = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
        var tex = new Texture2D();
        tex.filter = TextureFilter.NEAREST_NOMIP;
        tex.uploadData(data, 1, 1, true);
        return tex;
    },

    _copyToBackBuffer: function()
    {
        GL.setRenderTarget(this._hdrBack.fbo);
        GL.clear();
        this._copyTextureShader.execute(RectMesh.DEFAULT, this._hdrFront.texture);
        GL.setRenderTarget(this._hdrFront.fboDepth);
        // DO NOT CLEAR. This can be very slow on tiled gpu architectures such as PowerVR
    }
};

export { ForwardRenderer };