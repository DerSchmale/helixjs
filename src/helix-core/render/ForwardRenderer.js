HX.ForwardRenderer = function ()
{
    this._width = 0;
    this._height = 0;

    this._gammaApplied = false;

    this._copyTextureShader = new HX.CopyChannelsShader("xyzw", true);
    this._applyGamma = new HX.ApplyGammaShader();

    // devices with high resolution (retina etc)
    this._scale = 1.0; // > 1.0? .5 : 1.0;

    this._camera = null;
    this._scene = null;
    this._depthBuffer = this._createDepthBuffer();
    this._hdrBack = new HX.ForwardRenderer.HDRBuffers(this._depthBuffer);
    this._hdrFront = new HX.ForwardRenderer.HDRBuffers(this._depthBuffer);
    this._renderCollector = new HX.RenderCollector();
    this._normalDepthTexture = null;
    this._normalDepthFBO = null;
    this._ssaoTexture = this._createDummySSAOTexture();
    this._aoEffect = null;
    this._backgroundColor = HX.Color.BLACK.clone();
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
    get backgroundColor()
    {
        return this._backgroundColor;
    },

    set backgroundColor(value)
    {
        this._backgroundColor = new HX.Color(value);
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
        this._gammaApplied = HX.GAMMA_CORRECT_LIGHTS;
        this._camera = camera;
        this._scene = scene;


        this._updateSize(renderTarget);

        camera._setRenderTargetResolution(this._width, this._height);
        this._renderCollector.collect(camera, scene);

        this._renderShadowCasters();

        var opaqueStaticLit = this._renderCollector.getOpaqueStaticRenderList();
        var transparentStaticLit = this._renderCollector.getTransparentStaticRenderList();

        HX.setClearColor(HX.Color.BLACK);

        HX.setDepthMask(true);
        this._renderNormalDepth(opaqueStaticLit);
        this._renderAO();

        HX.setRenderTarget(this._hdrFront.fboDepth);
        HX.setClearColor(this._backgroundColor);
        HX.clear();
        this._renderDepthPrepass(opaqueStaticLit);

        this._renderStatics(opaqueStaticLit);
        // TODO: Render dynamic lit opaques here

        // THIS IS EXTREMELY INEFFICIENT ON SOME PLATFORMS
        if (this._renderCollector.needsBackbuffer)
            this._copyToBackBuffer();

        this._renderStatics(transparentStaticLit);
        // TODO: Render dynamic lit transparents here

        this._swapHDRFrontAndBack();
        this._renderEffects(dt);

        this._renderToScreen(renderTarget);

        //this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);

        HX.setBlendState();
        HX.setDepthMask(true);
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
        HX.setClearColor(this._backgroundColor);
        this._renderPass(HX.MaterialPass.BASE_PASS, list);
    },

    _renderNormalDepth: function(list)
    {
        if (!this._renderCollector.needsNormalDepth && !this._aoEffect) return;
        if (!this._normalDepthTexture) this._initNormalDepth();
        HX.setRenderTarget(this._normalDepthFBO);
        // furthest depth and alpha must be 1, the rest 0
        HX.setClearColor(HX.Color.BLUE);
        HX.clear();
        this._renderPass(HX.MaterialPass.NORMAL_DEPTH_PASS, list);
        HX.setClearColor(HX.Color.BLACK);
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

    _renderPass: function (passType, renderItems)
    {
        HX.RenderUtils.renderPass(this, passType, renderItems);
    },

    _renderToScreen: function (renderTarget)
    {
        HX.setRenderTarget(renderTarget);
        HX.clear();

        // TODO: render directly to screen if last post process effect?
        if (this._gammaApplied)
            this._copyTextureShader.execute(HX.RectMesh.DEFAULT, this._hdrBack.texture);
        else
            this._applyGamma.execute(HX.RectMesh.DEFAULT, this._hdrBack.texture);
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
            width = Math.floor(HX.TARGET_CANVAS.width * this._scale);
            height = Math.floor(HX.TARGET_CANVAS.height * this._scale);
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
            return new HX.WriteOnlyDepthBuffer();
    },

    _initNormalDepth: function()
    {
        this._normalDepthTexture = new HX.Texture2D();
        this._normalDepthTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
        this._normalDepthTexture.wrapMode = HX.TextureWrapMode.CLAMP;
        this._normalDepthTexture.initEmpty(this._width, this._height);

        this._normalDepthFBO = new HX.FrameBuffer(this._normalDepthTexture, this._depthBuffer);
        this._normalDepthFBO.init();
    },

    _createDummySSAOTexture: function()
    {
        var data = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
        var tex = new HX.Texture2D();
        tex.uploadData(data, 1, 1, true);
        HX.Texture2D.DEFAULT.filter = HX.TextureFilter.NEAREST_NOMIP;
    },

    _copyToBackBuffer: function()
    {
        HX.setRenderTarget(this._hdrBack.fbo);
        HX.clear();
        this._copyTextureShader.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);
        HX.setRenderTarget(this._hdrFront.fboDepth);
        // DO NOT CLEAR. This can be very slow on tiled gpu architectures such as PowerVR
    }
};