/**
 * The debug render mode to inspect properties in the GBuffer, the lighting accumulation buffer, AO, etc.
 */
HX.DebugRenderMode = {
    DEBUG_NONE: 0,
    DEBUG_COLOR: 1,
    DEBUG_NORMALS: 2,
    DEBUG_METALLICNESS: 3,
    DEBUG_SPECULAR_NORMAL_REFLECTION: 4,
    DEBUG_ROUGHNESS: 5,
    DEBUG_DEPTH: 6,
    DEBUG_LIGHT_ACCUM: 7,
    DEBUG_AO: 8,
    DEBUG_SSR: 9
};


/**
 * Renderer is the main renderer for drawing a Scene to the screen.
 *
 * GBUFFER LAYOUT:
 * 0: COLOR: (color.XYZ, transparency when using transparencyMode, otherwise reserved)
 * 1: NORMALS: (normals.XYZ, unused, or normals.xy, depth.zw if depth texture not supported)
 * 2: REFLECTION: (roughness, normalSpecularReflection, metallicness, extra depth precision if depth texture not supported and max precision is requested)
 * 3: LINEAR DEPTH: (not explicitly written to by user), 0 - 1 linear depth encoded as RGBA
 *
 * @constructor
 */
HX.Renderer = function ()
{
    this._width = 0;
    this._height = 0;

    this._scale = 1.0;

    // TODO: How many of these can be single instances?
    this._copyAmbient = new HX.MultiplyColorCopyShader();
    this._reproject = new HX.ReprojectShader();
    this._copyTexture = new HX.CopyChannelsShader();
    this._copyTextureToScreen = new HX.CopyChannelsShader("xyzw", true);
    this._copyXChannel = new HX.CopyChannelsShader("x");
    this._copyYChannel = new HX.CopyChannelsShader("y");
    this._copyZChannel = new HX.CopyChannelsShader("z");
    this._copyWChannel = new HX.CopyChannelsShader("w");
    this._debugDepth = new HX.DebugDepthShader();
    this._debugNormals = new HX.DebugNormalsShader();
    this._applyGamma = new HX.ApplyGammaShader();
    this._gammaApplied = false;

    if (HX.EXT_DEPTH_TEXTURE) {
        this._linearizeDepthShader = new HX.LinearizeDepthShader();
        this._linearDepthFBO = null;
    }

    this._renderCollector = new HX.RenderCollector();
    this._gbufferFBO = null;

    this._depthBuffer = null;
    this._aoEffect = null;
    this._aoTexture = null;
    this._ssrEffect = null;

    this._createGBuffer();

    this._hdrBack = new HX.Renderer.HDRBuffers(this._depthBuffer);
    this._hdrFront = new HX.Renderer.HDRBuffers(this._depthBuffer);

    this._debugMode = HX.DebugRenderMode.DEBUG_NONE;
    this._camera = null;

    this._previousViewProjection = new HX.Matrix4x4();
};

HX.Renderer.HDRBuffers = function(depthBuffer)
{
    this.texture = new HX.Texture2D();
    this.texture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this.texture.wrapMode = HX.TextureWrapMode.CLAMP;
    this.fbo = new HX.FrameBuffer(this.texture);
    this.fboDepth = new HX.FrameBuffer(this.texture, depthBuffer);
};

HX.Renderer.HDRBuffers.prototype =
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

HX.Renderer.prototype =
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

    get debugMode()
    {
        return this._debugMode;
    },

    set debugMode(value)
    {
        this._debugMode = value;
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

        this._renderToGBuffer();

        if (HX.EXT_DEPTH_TEXTURE)
            this._linearizeDepth();

        if (this._aoEffect !== null)
            this._aoEffect.render(this, 0);

        this._renderLightAccumulation();

        if (this._ssrEffect)
            this._ssrEffect.render(this, dt);

        this._renderToScreen(renderTarget, dt);

        this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);

        HX.setBlendState();
        HX.setDepthMask(true);

        if (HX._renderTargetStack.length > renderTargetStackSize) throw new Error("Unpopped render targets!");
        if (HX._renderTargetStack.length < renderTargetStackSize) throw new Error("Overpopped render targets!");
    },

    _renderShadowCasters: function ()
    {
        var casters = this._renderCollector._shadowCasters;
        var len = casters.length;

        for (var i = 0; i < len; ++i)
            casters[i].render(this._camera, this._scene)
    },

    _renderToGBuffer: function ()
    {
        if (HX.EXT_DRAW_BUFFERS)
            this._renderToGBufferMRT();
        else
            this._renderToGBufferMultiPass();
    },

    _renderToGBufferMRT: function ()
    {
        HX.pushRenderTarget(this._gbufferFBO);
        HX.clear();
        this._renderPass(HX.MaterialPass.GEOMETRY_PASS);
        HX.popRenderTarget();
    },

    _renderToGBufferMultiPass: function ()
    {
        var clearMask = HX_GL.COLOR_BUFFER_BIT | HX_GL.DEPTH_BUFFER_BIT | HX_GL.STENCIL_BUFFER_BIT;

        var len = this._gbufferSingleFBOs.length;
        for (var i = 0; i < len; ++i) {
            HX.pushRenderTarget(this._gbufferSingleFBOs[i]);
            HX.clear(clearMask);
            this._renderPass(i);
            HX.popRenderTarget();
        }
    },

    _linearizeDepth: function ()
    {
        HX.pushRenderTarget(this._linearDepthFBO);
        HX.clear();
        this._linearizeDepthShader.execute(HX.RectMesh.DEFAULT, this._depthBuffer, this._camera);
        HX.popRenderTarget(this._linearDepthFBO);
    },

    _renderEffect: function (effect, dt)
    {
        this._gammaApplied = this._gammaApplied || effect._outputsGamma;
        effect.render(this, dt);
    },

    _renderToScreen: function (renderTarget, dt)
    {
        HX.setBlendState(null);

        if (this._debugMode === HX.DebugRenderMode.DEBUG_NONE)
            this._composite(renderTarget, dt);
        else
            this._renderDebug(renderTarget);
    },

    _renderDebug: function(renderTarget)
    {
        HX.pushRenderTarget(renderTarget);
        if (renderTarget) HX.clear();

        switch (this._debugMode) {
            case HX.DebugRenderMode.DEBUG_COLOR:
                this._copyTexture.execute(HX.RectMesh.DEFAULT, this._gbuffer[0]);
                break;
            case HX.DebugRenderMode.DEBUG_NORMALS:
                this._debugNormals.execute(HX.RectMesh.DEFAULT, this._gbuffer[1]);
                break;
            case HX.DebugRenderMode.DEBUG_METALLICNESS:
                this._copyZChannel.execute(HX.RectMesh.DEFAULT, this._gbuffer[2]);
                break;
            case HX.DebugRenderMode.DEBUG_SPECULAR_NORMAL_REFLECTION:
                this._copyYChannel.execute(HX.RectMesh.DEFAULT, this._gbuffer[2]);
                break;
            case HX.DebugRenderMode.DEBUG_ROUGHNESS:
                this._copyXChannel.execute(HX.RectMesh.DEFAULT, this._gbuffer[2]);
                break;
            case HX.DebugRenderMode.DEBUG_DEPTH:
                this._debugDepth.execute(HX.RectMesh.DEFAULT, this._gbuffer[3]);
                break;
            case HX.DebugRenderMode.DEBUG_LIGHT_ACCUM:
                this._applyGamma.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);
                break;
            case HX.DebugRenderMode.DEBUG_AO:
                if (this._aoEffect)
                    this._applyGamma.execute(HX.RectMesh.DEFAULT, this._aoEffect.getAOTexture());
                break;
            case HX.DebugRenderMode.DEBUG_SSR:
                if (this._ssrEffect)
                    this._applyGamma.execute(HX.RectMesh.DEFAULT, this._ssrTexture);
                break;
        }

        HX.popRenderTarget();
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

    _renderLightAccumulation: function ()
    {
        HX.pushRenderTarget(this._hdrFront.fbo);
        HX.clear();

        this._renderGlobalIllumination();
        this._renderDirectLights();
        HX.popRenderTarget();
    },

    _renderDirectLights: function ()
    {
        var lights = this._renderCollector.getLights();
        var len = lights.length;

        var i = 0;

        // renderBatch returns the first unrendered light, depending on type or properties, etc
        // so it's just a matter of calling it until i == len
        while (i < len)
            i = lights[i].renderBatch(lights, i, this);
    },

    _renderGlobalIllumination: function ()
    {
        if (this._renderCollector._globalSpecularProbe)
            this._renderCollector._globalSpecularProbe.render(this);

        if (this._ssrTexture) {
            HX.setBlendState(HX.BlendState.ALPHA);
            this._reproject.execute(HX.RectMesh.DEFAULT, this._ssrTexture, this._gbuffer[3], this._camera, this._previousViewProjection);
        }

        HX.setBlendState(HX.BlendState.ADD);
        this._copyAmbient.execute(HX.RectMesh.DEFAULT, this._gbuffer[0], this._renderCollector.ambientColor);

        if (this._renderCollector._globalIrradianceProbe)
            this._renderCollector._globalIrradianceProbe.render(this);

        if (this._aoTexture) {
            HX.setBlendState(HX.BlendState.MULTIPLY);
            this._copyTexture.execute(HX.RectMesh.DEFAULT, this._aoTexture);
            HX.setBlendState(HX.BlendState.ADD);
        }
    },

    _renderPass: function (passType, renderItems)
    {
        renderItems = renderItems || this._renderCollector.getOpaqueRenderList(passType);

        HX.RenderUtils.renderPass(this, passType, renderItems);
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

    _createGBuffer: function ()
    {
        if (HX.EXT_DEPTH_TEXTURE) {
            this._depthBuffer = new HX.Texture2D();
            this._depthBuffer.filter = HX.TextureFilter.BILINEAR_NOMIP;
            this._depthBuffer.wrapMode = HX.TextureWrapMode.CLAMP;
        }
        else {
            this._depthBuffer = new HX.ReadOnlyDepthBuffer();
        }

        this._gbuffer = [];

        // 0 = albedo
        // 1 = normals
        // 2 = specular
        // 3 = linear depth
        for (var i = 0; i < 4; ++i) {
            this._gbuffer[i] = new HX.Texture2D();
            this._gbuffer[i].filter = HX.TextureFilter.BILINEAR_NOMIP;
            this._gbuffer[i].wrapMode = HX.TextureWrapMode.CLAMP;
        }

        this._gbufferSingleFBOs = [];

        this._createGBufferFBO();

        if (HX.EXT_DEPTH_TEXTURE)
            this._linearDepthFBO = new HX.FrameBuffer(this._gbuffer[3], null);
    },

    _createGBufferFBO: function ()
    {
        if (HX.EXT_DRAW_BUFFERS) {
            var targets = [this._gbuffer[0], this._gbuffer[1], this._gbuffer[2]];

            if (!HX.EXT_DEPTH_TEXTURE)
                targets[3] = this._gbuffer[3];

            this._gbufferFBO = new HX.FrameBuffer(targets, this._depthBuffer);
        }
        else {
            var numFBOs = HX.EXT_DEPTH_TEXTURE? 3 : 4;
            for (var i = 0; i < numFBOs; ++i) {
                this._gbufferSingleFBOs[i] = new HX.FrameBuffer([this._gbuffer[i]], this._depthBuffer);
            }
        }
    },

    _updateGBuffer: function (width, height)
    {
        if (HX.EXT_DEPTH_TEXTURE)
            this._depthBuffer.initEmpty(width, height, HX_GL.DEPTH_STENCIL, HX.EXT_DEPTH_TEXTURE.UNSIGNED_INT_24_8_WEBGL);
        else
            this._depthBuffer.init(width, height);

        for (var i = 0; i < this._gbuffer.length; ++i) {
            this._gbuffer[i].initEmpty(width, height, HX_GL.RGBA, HX_GL.UNSIGNED_BYTE);
        }

        this._updateGBufferFBO();

        if (this._linearDepthFBO)
            this._linearDepthFBO.init();
    },

    _updateGBufferFBO: function ()
    {
        if (HX.EXT_DRAW_BUFFERS)
            this._gbufferFBO.init();
        else {
            for (var i = 0; i < this._gbufferSingleFBOs.length; ++i)
                this._gbufferSingleFBOs[i].init();
        }
    },

    dispose: function ()
    {
        this._applyGamma.dispose();
        this._copyTexture.dispose();
        this._copyXChannel.dispose();
        this._copyYChannel.dispose();
        this._copyZChannel.dispose();
        this._copyWChannel.dispose();

        this._hdrBack.dispose();
        this._hdrFront.dispose();

        for (var i = 0; i < this._gbuffer.length; ++i)
            this._gbuffer[i].dispose();

        for (var i = 0; i < this._gbufferSingleFBOs.length; ++i)
            this._gbufferSingleFBOs[i].dispose();

        if (this._gbufferFBO)
            this._gbufferFBO.dispose();
    },

    // allows effects to ping pong on the renderer's own buffers
    _swapHDRFrontAndBack: function(depthStencil)
    {
        var tmp = this._hdrBack;
        this._hdrBack = this._hdrFront;
        this._hdrFront = tmp;
        HX.popRenderTarget();
        if (depthStencil)
            HX.pushRenderTarget(this._hdrFront.fboDepth);
        else
            HX.pushRenderTarget(this._hdrFront.fbo);
    },

    _updateSize: function (renderTarget)
    {
        var width, height;
        if (renderTarget) {
            width = renderTarget.width;
            height = renderTarget.height;
        }
        else {
            width = HX.TARGET_CANVAS.width * this._scale;
            height = HX.TARGET_CANVAS.height * this._scale;
        }
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this._updateGBuffer(this._width, this._height);
            this._hdrBack.resize(this._width, this._height);
            this._hdrFront.resize(this._width, this._height);
        }
    }
};