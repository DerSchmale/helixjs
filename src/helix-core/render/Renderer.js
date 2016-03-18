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
    this._applyAlphaTransparency = new HX.CopyWithSeparateAlpha();
    this._applyGamma = new HX.ApplyGammaShader();
    this._gammaApplied = false;
    this._linearizeDepthShader = new HX.LinearizeDepthShader();

    this._renderCollector = new HX.RenderCollector();
    this._gbufferFBO = null;
    this._linearDepthFBO = null;
    this._depthBuffer = null;
    this._aoEffect = null;
    this._aoTexture = null;
    this._ssrEffect = null;

    this._createGBuffer();

    this._hdrBack = new HX.Renderer.HDRBuffers(this._depthBuffer);
    this._hdrFront = new HX.Renderer.HDRBuffers(this._depthBuffer);

    this._debugMode = HX.DebugRenderMode.DEBUG_NONE;
    this._camera = null;

    this._stencilWriteState = new HX.StencilState(0, HX.Comparison.ALWAYS, HX.StencilOp.KEEP, HX.StencilOp.KEEP, HX.StencilOp.REPLACE);
    this._stencilReadState = new HX.StencilState(0, HX.Comparison.EQUAL, HX.StencilOp.KEEP, HX.StencilOp.KEEP, HX.StencilOp.KEEP);

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
        this.texture.initEmpty(width, height, HX.GL.RGBA, HX.HDR_FORMAT);
        this.fbo.init();
        this.fboDepth.init();
    }
};

HX.Renderer.prototype =
{
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

    render: function (camera, scene, dt)
    {
        var renderTargetStackSize = HX._renderTargetStack.length;
        var stencilStackSize = HX._stencilStateStack.length;
        this._gammaApplied = HX.GAMMA_CORRECT_LIGHTS;
        this._camera = camera;
        this._scene = scene;

        this._aoTexture = this._aoEffect ? this._aoEffect.getAOTexture() : null;

        this._updateSize();

        camera._setRenderTargetResolution(this._width, this._height);
        this._renderCollector.collect(camera, scene);

        this._renderShadowCasters();

        HX.pushRenderTarget(this._hdrFront.fboDepth);
        {
            this._renderOpaques();

            this._renderPostPass(HX.MaterialPass.POST_LIGHT_PASS);
            this._renderPostPass(HX.MaterialPass.POST_PASS, true);

            // don't use AO for transparents
            if (this._aoTexture) this._aoTexture = null;

            this._renderTransparents();
        }
        HX.popRenderTarget();

        if (this._ssrEffect != null)
            this._ssrEffect.render(this, dt);

        this._renderToScreen(dt);

        this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);

        if (HX._renderTargetStack.length > renderTargetStackSize) throw new Error("Unpopped render targets!");
        if (HX._renderTargetStack.length < renderTargetStackSize) throw new Error("Overpopped render targets!");
        if (HX._stencilStateStack.length > stencilStackSize) throw new Error("Unpopped stencil states!");
        if (HX._stencilStateStack.length < stencilStackSize) throw new Error("Overpopped stencil states!");
    },

    _renderShadowCasters: function ()
    {
        var casters = this._renderCollector.getShadowCasters();
        var len = casters.length;

        for (var i = 0; i < len; ++i) {
            casters[i].render(this._camera, this._scene)
        }
    },

    _renderOpaques: function ()
    {
        HX.pushStencilState(this._stencilWriteState);

        HX.setClearColor(HX.Color.BLACK);

        this._renderToGBuffer();

        HX.popStencilState();

        this._linearizeDepth();

        // only render AO for non-transparents
        if (this._aoEffect !== null)
            this._aoEffect.render(this, 0);

        // no other lighting models are currently supported, but can't shade lightingModel 0, which is unlit:
        var lightingModelID = 1;
        this._stencilReadState.reference = lightingModelID << 4;

        HX.pushStencilState(this._stencilReadState);

        this._renderLightAccumulation();

        HX.popStencilState();
    },

    _renderTransparents: function ()
    {
        var renderLists = [];

        var passIndices = HX.EXT_DRAW_BUFFERS
            ? [HX.MaterialPass.GEOMETRY_PASS]
            : [HX.MaterialPass.GEOMETRY_COLOR_PASS, HX.MaterialPass.GEOMETRY_NORMAL_PASS, HX.MaterialPass.GEOMETRY_SPECULAR_PASS];
        var numPassTypes = passIndices.length;

        for (var j = 0; j < numPassTypes; ++j) {
            renderLists[j] = this._renderCollector.getTransparentRenderList(passIndices[j]);
        }

        var baseList = renderLists[0];
        var len = baseList.length;

        // TODO: Should we render all transparent objects with the same transparency mode?
        for (var i = 0; i < len; ++i) {
            this._swapHDRFrontAndBack(true);
            var material = baseList[i].material;
            var transparencyMode = material._transparencyMode;
            var stencilValue = (material._lightingModelID << 4) | transparencyMode;
            this._stencilWriteState.reference = stencilValue;

            HX.pushStencilState(this._stencilWriteState);

            if (HX.EXT_DRAW_BUFFERS)
                HX.pushRenderTarget(this._gbufferFBO);

            for (var j = 0; j < numPassTypes; ++j) {

                if (!HX.EXT_DRAW_BUFFERS)
                    HX.pushRenderTarget(this._gbufferSingleFBOs[j]);

                var passType = passIndices[j];
                var renderItem = renderLists[j][i];

                var meshInstance = renderItem.meshInstance;
                var pass = renderItem.pass;

                pass._shader.updateRenderState(renderItem.camera, renderItem);
                pass.updateRenderState(this);
                meshInstance.updateRenderState(passType);

                HX.drawElements(pass._elementType, meshInstance._mesh.numIndices, 0);

                if (!HX.EXT_DRAW_BUFFERS)
                    HX.popRenderTarget();
            }

            if (HX.EXT_DRAW_BUFFERS)
                HX.popRenderTarget();

            HX.popStencilState();

            this._stencilReadState.reference = stencilValue;
            HX.pushStencilState(this._stencilReadState);

            this._linearizeDepth();

            this._renderLightAccumulation();
            this._swapHDRFrontAndBack(true);

            switch (transparencyMode) {
                case HX.TransparencyMode.ADDITIVE:
                    HX.setBlendState(HX.BlendState.ADD_WITH_ALPHA);
                    break;
                case HX.TransparencyMode.ALPHA:
                    HX.setBlendState(HX.BlendState.ALPHA);
                    break;
            }

            this._applyAlphaTransparency.execute(HX.RectMesh.DEFAULT, this._hdrBack.texture, this._gbuffer[0]);

            HX.popStencilState(this._stencilReadState);
        }
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
        var clearMask = HX.GL.COLOR_BUFFER_BIT | HX.GL.DEPTH_BUFFER_BIT | HX.GL.STENCIL_BUFFER_BIT;
        var passIndices = [HX.MaterialPass.GEOMETRY_COLOR_PASS, HX.MaterialPass.GEOMETRY_NORMAL_PASS, HX.MaterialPass.GEOMETRY_SPECULAR_PASS];

        for (var i = 0; i < 3; ++i) {
            HX.pushRenderTarget(this._gbufferSingleFBOs[i]);
            HX.clear(clearMask);
            this._renderPass(passIndices[i]);

            if (i == 0)
                clearMask = HX.GL.COLOR_BUFFER_BIT;

            HX.popRenderTarget();
        }
    },

    _linearizeDepth: function ()
    {
        HX.pushRenderTarget(this._linearDepthFBO);
        var depthTexture, depthTexture2;
        if (HX.EXT_DEPTH_TEXTURE) {
            depthTexture = this._depthBuffer;
        }
        else {
            depthTexture = this._gbuffer[1];
            // we keep the smallest precision in specular buffer
            depthTexture2 = this._gbuffer[2];
        }
        this._linearizeDepthShader.execute(HX.RectMesh.DEFAULT, depthTexture, this._camera, depthTexture2);
        HX.popRenderTarget(this._linearDepthFBO);
    },

    _renderEffect: function (effect, dt)
    {
        this._gammaApplied = this._gammaApplied || effect._outputsGamma;
        effect.render(this, dt);
    },

    _renderToScreen: function (dt)
    {
        HX.setBlendState(null);
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
                    this._copyTexture.execute(HX.RectMesh.DEFAULT, this._aoEffect.getAOTexture());
                break;
            case HX.DebugRenderMode.DEBUG_SSR:
                if (this._ssrEffect)
                    this._applyGamma.execute(HX.RectMesh.DEFAULT, this._ssrTexture);
                break;
            default:
                this._composite(dt);
        }
    },

    _composite: function (dt)
    {
        HX.pushRenderTarget(this._hdrFront.fbo);
            this._renderEffects(dt, this._renderCollector._effects);
        HX.popRenderTarget();

        // TODO: render directly to screen if last post process effect?
        // OR, provide toneMap property on camera, which gets special treatment
        if (this._gammaApplied)
            this._copyTextureToScreen.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);
        else
            this._applyGamma.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);
    },

    _renderLightAccumulation: function ()
    {
        HX.GL.depthMask(false);

        HX.clear(HX.GL.COLOR_BUFFER_BIT);

        this._renderGlobalIllumination();
        this._renderDirectLights();

        HX.GL.depthMask(true);
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

    _copySource: function ()
    {
        HX.pushRenderTarget(this._hdrBack.fbo);
        HX.setBlendState(null);
        this._copyTexture.execute(HX.RectMesh.DEFAULT, this._hdrFront.texture);
        HX.popRenderTarget();
    },

    _renderPostPass: function (passType, copySource)
    {
        var opaqueList = this._renderCollector.getOpaqueRenderList(passType);
        var transparentList = this._renderCollector.getTransparentRenderList(passType);

        if (opaqueList.length === 0 && transparentList.length === 0)
            return;

        if (copySource)
            this._copySource();

        this._renderPass(passType, this._renderCollector.getOpaqueRenderList(passType));
        this._renderPass(passType, this._renderCollector.getTransparentRenderList(passType));
    },

    _renderEffects: function (dt, effects)
    {
        if (!effects || effects.length == 0)
            return;

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

        for (var i = 0; i < 4; ++i) {
            this._gbuffer[i] = new HX.Texture2D();
            this._gbuffer[i].filter = HX.TextureFilter.BILINEAR_NOMIP;
            this._gbuffer[i].wrapMode = HX.TextureWrapMode.CLAMP;
        }

        this._gbufferSingleFBOs = [];

        for (var i = 0; i < 3; ++i)
            this._gbufferSingleFBOs[i] = new HX.FrameBuffer([this._gbuffer[i]], this._depthBuffer);

        this._createGBufferFBO();
        this._linearDepthFBO = new HX.FrameBuffer(this._gbuffer[3], null);
    },

    _createGBufferFBO: function ()
    {
        if (HX.EXT_DRAW_BUFFERS) {
            var targets = [this._gbuffer[0], this._gbuffer[1], this._gbuffer[2]];
            this._gbufferFBO = new HX.FrameBuffer(targets, this._depthBuffer);
        }
    },

    _updateGBuffer: function (width, height)
    {
        if (HX.EXT_DEPTH_TEXTURE)
            this._depthBuffer.initEmpty(width, height, HX.GL.DEPTH_STENCIL, HX.EXT_DEPTH_TEXTURE.UNSIGNED_INT_24_8_WEBGL);
        else
            this._depthBuffer.init(width, height);

        for (var i = 0; i < this._gbuffer.length; ++i) {
            this._gbuffer[i].initEmpty(width, height, HX.GL.RGBA, HX.GL.UNSIGNED_BYTE);
        }

        for (var i = 0; i < this._gbufferSingleFBOs.length; ++i)
            this._gbufferSingleFBOs[i].init();

        this._updateGBufferFBO();
        this._linearDepthFBO.init();
    },

    _updateGBufferFBO: function ()
    {
        if (HX.EXT_DRAW_BUFFERS)
            this._gbufferFBO.init();
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

    _updateSize: function ()
    {
        if (this._width !== HX.TARGET_CANVAS.clientWidth || this._height !== HX.TARGET_CANVAS.clientHeight) {
            this._width = HX.TARGET_CANVAS.clientWidth;
            this._height = HX.TARGET_CANVAS.clientHeight;
            this._updateGBuffer(this._width, this._height);
            this._hdrBack.resize(this._width, this._height);
            this._hdrFront.resize(this._width, this._height);
        }
    }
};