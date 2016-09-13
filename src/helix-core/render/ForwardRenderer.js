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
    this._renderCollector = new HX.RenderCollector();
    this._previousViewProjection = new HX.Matrix4x4();
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

        HX.pushRenderTarget(this._hdrFront.fboDepth);
            HX.clear();
            this._renderStatics(this._renderCollector.getOpaqueStaticRenderList());

            this._composite(renderTarget, dt);
        HX.popRenderTarget(this._hdrFront.fboDepth);

        this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);

        HX.setBlendState();
        HX.setDepthMask(true);

        if (HX._renderTargetStack.length > renderTargetStackSize) throw new Error("Unpopped render targets!");
        if (HX._renderTargetStack.length < renderTargetStackSize) throw new Error("Overpopped render targets!");
    },

    _renderStatics: function(list)
    {
        this._renderPass(HX.MaterialPass.BASE_PASS, list);
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

    _composite: function (renderTarget, dt)
    {
        var effects = this._renderCollector._effects;

        if (effects && effects.length > 0) {
            HX.pushRenderTarget(this._hdrFront.fbo);
            this._renderEffects(dt, effects);
            HX.popRenderTarget();
        }

        HX.pushRenderTarget(renderTarget);
        HX.clear();

        // TODO: render directly to screen if last post process effect?
        // OR, provide toneMap property on camera, which gets special treatment
        if (this._gammaApplied)
            this._copyTextureToScreen.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);
        else
            this._applyGamma.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);

        HX.popRenderTarget();
    },

    _renderEffects: function (dt, effects)
    {
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