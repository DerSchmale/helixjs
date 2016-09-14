HX.ForwardRenderer = function ()
{
    this._width = 0;
    this._height = 0;

    this._gammaApplied = false;

    this._copyTextureToScreen = new HX.CopyChannelsShader("xyzw", true);
    this._applyGamma = new HX.ApplyGammaShader();

    if (HX.EXT_DEPTH_TEXTURE) {
        this._linearizeDepthShader = new HX.LinearizeDepthShader();
        this._linearDepthFBO = null;
    }

    // devices with high resolution (retina etc)
    this._scale = 1.0; // > 1.0? .5 : 1.0;

    this._camera = null;
    this._scene = null;
    this._depthBuffer = this._createDepthBuffer();
    this._hdrBack = new HX.ForwardRenderer.HDRBuffers(this._depthBuffer);
    this._hdrFront = new HX.ForwardRenderer.HDRBuffers(this._depthBuffer);
    this._normalDepthTexture = new HX.Texture2D();
    this._normalDepthTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this._normalDepthTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._normalDepthFBO = new HX.FrameBuffer(this._normalDepthTexture, this._depthBuffer);
    this._renderCollector = new HX.RenderCollector();
    //this._previousViewProjection = new HX.Matrix4x4();
    this._depthPrepass = true;
};

HX.ForwardRenderer.HDRBuffers = function(depthBuffer)
{
    this.texture = new HX.Texture2D();
    this.texture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this.texture.wrapMode = HX.TextureWrapMode.CLAMP;
    this.fbo = new HX.FrameBuffer(this.texture);
    this.fboDepth = new HX.FrameBuffer(this.texture, depthBuffer);
};

HX.ForwardRenderer.HDRBuffers.prototype =
{
    dispose: function()
    {
        this.texture.dispose();
        this.fbo.dispose();
        this.fboDepth.dispose();
    },

    resize: function(width, height)
    {
        this.texture.initEmpty(width, height, HX_GL.RGBA, HX.HDR_FORMAT);
        this.fbo.init();
        this.fboDepth.init();
    }
};

HX.ForwardRenderer.prototype =
{
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
    },

    get localReflections()
    {
        return this._ssrEffect;
    },

    set localReflections(value)
    {
        this._ssrEffect = value;
        this._ssrTexture = this._ssrEffect? this._ssrEffect.getSSRTexture() : null;
    },

    /**
     * It's not recommended changing render targets if they have different sizes (so splitscreen should be fine). Otherwise, use different renderer instances.
     * @param camera
     * @param scene
     * @param dt
     * @param renderTarget (optional)
     */
    render: function (camera, scene, dt, renderTarget)
    {
        var renderTargetStackSize = HX._renderTargetStack.length;
        this._gammaApplied = HX.GAMMA_CORRECT_LIGHTS;
        this._camera = camera;
        this._scene = scene;

        this._aoTexture = this._aoEffect ? this._aoEffect.getAOTexture() : null;

        this._updateSize(renderTarget);

        camera._setRenderTargetResolution(this._width, this._height);
        this._renderCollector.collect(camera, scene);

        this._renderShadowCasters();

        var opaqueStaticLit = this._renderCollector.getOpaqueStaticRenderList();

        this._renderNormalDepth(opaqueStaticLit);

        HX.pushRenderTarget(this._hdrFront.fboDepth);
            HX.clear();
            // TODO: Need to render dynamically lit opaques too
            this._renderDepthPrepass(opaqueStaticLit);
            this._renderStatics(opaqueStaticLit);
            this._renderEffects(dt);
        HX.popRenderTarget();
        this._renderToScreen(renderTarget);

        //this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);

        HX.setBlendState();
        HX.setDepthMask(true);

        if (HX._renderTargetStack.length > renderTargetStackSize) throw new Error("Unpopped render targets!");
        if (HX._renderTargetStack.length < renderTargetStackSize) throw new Error("Overpopped render targets!");
    },

    _renderDepthPrepass: function(list)
    {
        if (!this._depthPrepass) return;
        HX_GL.colorMask(false, false, false, false);
        this._renderPass(HX.MaterialPass.NORMAL_DEPTH_PASS, list);
        HX_GL.colorMask(true, true, true, true);
    },

    _renderStatics: function(list)
    {
        this._renderPass(HX.MaterialPass.BASE_PASS, list);
    },

    _renderNormalDepth: function(list)
    {
        if (!this._renderCollector.needsNormalDepth) return;
        HX.pushRenderTarget(this._normalDepthFBO);
        // furthest depth and alpha must be 1, the rest 0
        HX.setClearColor(HX.Color.BLUE);
        HX.clear();
        this._renderPass(HX.MaterialPass.NORMAL_DEPTH_PASS, list);
        HX.setClearColor(HX.Color.BLACK);
        HX.popRenderTarget(this._normalDepthFBO);
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

    _renderPass: function (passType, renderItems)
    {
        HX.RenderUtils.renderPass(this, passType, renderItems);
    },

    _renderToScreen: function (renderTarget)
    {
        HX.pushRenderTarget(renderTarget);
        HX.clear();

        // TODO: render directly to screen if last post process effect?
        if (this._gammaApplied)
            this._copyTextureToScreen.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);
        else
            this._applyGamma.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);

        HX.popRenderTarget();
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
            width = Math.floor(HX.TARGET_CANVAS.width * this._scale);
            height = Math.floor(HX.TARGET_CANVAS.height * this._scale);
        }
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this._depthBuffer.init(this._width, this._height, true);
            this._hdrBack.resize(this._width, this._height);
            this._hdrFront.resize(this._width, this._height);
            this._normalDepthTexture.initEmpty(width, height);
            this._normalDepthFBO.init();
        }
    },

    // allows effects to ping pong on the renderer's own buffers
    _swapHDRFrontAndBack: function()
    {
        var tmp = this._hdrBack;
        this._hdrBack = this._hdrFront;
        this._hdrFront = tmp;

        HX.popRenderTarget();
        HX.pushRenderTarget(this._hdrFront.fbo);
    },

    _createDepthBuffer: function()
    {
        /*if (HX.EXT_DEPTH_TEXTURE) {
            this._depthBuffer = new HX.Texture2D();
            this._depthBuffer.filter = HX.TextureFilter.BILINEAR_NOMIP;
            this._depthBuffer.wrapMode = HX.TextureWrapMode.CLAMP;
        }
        else {*/
            return new HX.WriteOnlyDepthBuffer();
    }
};