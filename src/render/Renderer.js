HX.DebugRenderMode = {
    DEBUG_NONE: 0,
    DEBUG_COLOR: 1,
    DEBUG_NORMALS: 2,
    DEBUG_METALLICNESS: 3,
    DEBUG_SPECULAR_NORMAL_REFLECTION: 4,
    DEBUG_ROUGHNESS: 5,
    DEBUG_DEPTH: 6,
    DEBUG_LIGHT_ACCUM: 7,
    DEBUG_AO: 8
};

/**
 *
 * @constructor
 */
HX.Renderer = function()
{
};

HX.Renderer.prototype =
{
    constructor: HX.Renderer,


    /**
     * Renders a scene with a given camera. IMPORTANT: Helix does not clear the canvas. This may be useful to have 3D content
     * on top of a 2D gpu-based interface.
     * @param camera
     * @param scene
     */
    render: function (camera, scene, dt)
    {

    },

    dispose: function()
    {

    },

    _renderPass: function (passType, renderItems)
    {
        var len = renderItems.length;
        var activeShader = null;
        var activePass = null;
        var lastMesh = null;

        for(var i = 0; i < len; ++i) {
            var renderItem = renderItems[i];
            var meshInstance = renderItem.meshInstance;
            var pass = renderItem.pass;
            var shader = pass._shader;

            if (shader !== activeShader) {
                shader.updateRenderState();
                activeShader = shader;
            }

            if (pass !== activePass) {
                this._switchPass(activePass, pass);
                activePass = pass;

                lastMesh = null;    // need to reset mesh data too
            }

            if (lastMesh != meshInstance._mesh) {
                meshInstance.updateRenderState(passType);
                lastMesh = meshInstance._mesh;
            }

            renderItem.draw();
        }

        if (activePass && activePass._blending) HX.GL.disable(HX.GL.BLEND);
    },

    _switchPass: function(oldPass, newPass)
    {
        // clean up old pass
        if (!oldPass || oldPass._cullMode !== oldPass._cullMode) {
            if (newPass._cullMode === null)
                HX.GL.disable(HX.GL.CULL_FACE);
            else {
                HX.GL.enable(HX.GL.CULL_FACE);
                HX.GL.cullFace(newPass._cullMode);
            }
        }

        if (!oldPass || oldPass._blending !== oldPass._blending) {
            if (newPass._blending) {
                HX.GL.enable(HX.GL.BLEND);
                HX.GL.blendFunc(newPass._blendSource, newPass._blendDest);
                HX.GL.blendEquation(newPass._blendOperator);
            }
            else
                HX.GL.disable(HX.GL.BLEND);
        }

        newPass.updateRenderState();
    }
};

/**
 * GBUFFER LAYOUT:
 * 0: COLOR: (color.XYZ, unused)
 * 1: NORMALS: (normals.XYZ, unused, or normals.xy, depth.zw)
 * 2: REFLECTION: (roughness, normalSpecularReflection, metallicness, unused)
 * 3: LINEAR DEPTH: (not explicitly written to by user), 0 - 1 linear depth encoded as RGBA
 *
 * DEPTH STENCIL:
 * Stencil can be used for certain post passes (fe: skin rendering) if stencil value is the same
 * Then just render post-pass with the given stencil
 *
 *
 * @constructor
 */
HX.ScreenRenderer = function()
{
    HX.Renderer.call(this);

    this._viewportX = 0;
    this._viewportY = 0;
    this._viewportWidth = 0;
    this._viewportHeight = 0;

    this._copyTexture = new HX.CopyChannelsShader();
    this._copyXChannel = new HX.CopyChannelsShader("x");
    this._copyYChannel = new HX.CopyChannelsShader("y");
    this._copyZChannel = new HX.CopyChannelsShader("z");
    this._copyWChannel = new HX.CopyChannelsShader("w");
    this._debugDepth = new HX.DebugDepthShader();
    this._debugNormals = new HX.DebugNormalsShader();
    this._applyGamma = new HX.ApplyGammaShader();
    this._gammaApplied = false;
    this._linearizeDepthShader = new HX.LinearizeDepthShader();
    this._rectMesh = HX.RectMesh.create({alignment: HX.PlanePrimitive.ALIGN_XY});

    this._renderCollector = new HX.RenderCollector();
    this._gbufferFBO = null;
    this._linearDepthFBO = null;
    this._hdrSourceIndex = 0;
    this._hdrTargets = null;
    this._hdrTargetsDepth = null;
    this._depthBuffer = null;
    this._aoEffect = null;
    this._localReflections = null;
    this._passSourceTexture = null;

    this._createGBuffer();
    this._createHDRBuffers();

    this._debugMode = HX.DebugRenderMode.DEBUG_NONE;
    this._camera = null;
};

HX.ScreenRenderer.prototype = Object.create(HX.Renderer.prototype);

HX.ScreenRenderer.prototype.setDebugMode = function(value)
{
    this._debugMode = value;
};

HX.ScreenRenderer.prototype.getAmbientOcclusion = function()
{
    return this._aoEffect;
};

HX.ScreenRenderer.prototype.setAmbientOcclusion = function(value)
{
    this._aoEffect = value;
    this._aoEffect.setMesh(this._rectMesh);
};

HX.ScreenRenderer.prototype.setLocalReflections = function(value)
{
    this._localReflections = value;
    this._localReflections.setMesh(this._rectMesh);
};

HX.ScreenRenderer.prototype.setViewportRect = function(x, y, width, height)
{
    if (this._viewportWidth != width || this._viewportHeight != height) {
        this._updateGBuffer(width, height);
        this._updateHDRBuffers(width, height);
    }

    this._viewportX = 0;
    this._viewportY = 0;
    this._viewportWidth = width;
    this._viewportHeight = height;
};

HX.ScreenRenderer.prototype.render = function(camera, scene, dt)
{
    this._gammaApplied = false;
    this._passSourceTexture = null;
    this._hdrSourceIndex = 0;
    this._camera = camera;
    this._scene = scene;

    HX.GL.enable(HX.GL.DEPTH_TEST);
    HX.GL.enable(HX.GL.CULL_FACE);
    HX.GL.cullFace(HX.GL.BACK);
    HX.GL.depthFunc(HX.GL.LESS);

    camera._setRenderTargetResolution(this._viewportWidth, this._viewportHeight);
    this._renderCollector.collect(camera, scene);

    this._renderShadowCasters();

    HX.GL.viewport(this._viewportX, this._viewportY, this._viewportWidth, this._viewportHeight);
    this._renderToGBuffer();
    this._linearizeDepth();

    HX.GL.disable(HX.GL.BLEND);
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    if (this._aoEffect != null)
        this._renderEffect(this._aoEffect, dt);

    HX.GL.viewport(this._viewportX, this._viewportY, this._viewportWidth, this._viewportHeight);
    this._renderToScreen(dt);
};

HX.ScreenRenderer.prototype._renderShadowCasters = function()
{
    HX.GL.colorMask(false, false, false, false);

    var casters = this._renderCollector.getShadowCasters();
    var len = casters.length;

    for (var i = 0; i < len; ++i) {
        casters[i].render(this._camera, this._scene)
    }

    HX.GL.colorMask(true, true, true, true);
};

HX.ScreenRenderer.prototype._renderToGBuffer = function()
{
    throw "Abstract method";
};

HX.ScreenRenderer.prototype._linearizeDepth = function()
{
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    HX.setRenderTarget(this._linearDepthFBO);
    this._linearizeDepthShader.execute(this._rectMesh, HX.EXT_DEPTH_TEXTURE? this._depthBuffer : this._gbuffer[1], this._camera)
}

HX.ScreenRenderer.prototype._renderEffect = function(effect, dt)
{
    this._gammaApplied = this._gammaApplied || effect._outputsGamma;
    this._hdrSourceIndex = effect.render(this, dt);
};

HX.ScreenRenderer.prototype._renderToScreen = function(dt)
{
    switch (this._debugMode) {
        case HX.DebugRenderMode.DEBUG_COLOR:
            HX.setRenderTarget(null);
            this._copyTexture.execute(this._rectMesh, this._gbuffer[0]);
            break;
        case HX.DebugRenderMode.DEBUG_NORMALS:
            HX.setRenderTarget(null);
            this._debugNormals.execute(this._rectMesh, this._gbuffer[1]);
            break;
        case HX.DebugRenderMode.DEBUG_METALLICNESS:
            HX.setRenderTarget(null);
            this._copyXChannel.execute(this._rectMesh, this._gbuffer[2]);
            break;
        case HX.DebugRenderMode.DEBUG_SPECULAR_NORMAL_REFLECTION:
            HX.setRenderTarget(null);
            this._copyYChannel.execute(this._rectMesh, this._gbuffer[2]);
            break;
        case HX.DebugRenderMode.DEBUG_ROUGHNESS:
            HX.setRenderTarget(null);
            this._copyZChannel.execute(this._rectMesh, this._gbuffer[2]);
            break;
        case HX.DebugRenderMode.DEBUG_DEPTH:
            HX.setRenderTarget(null);
            this._debugDepth.execute(this._rectMesh, this._gbuffer[3]);
            break;
        case HX.DebugRenderMode.DEBUG_LIGHT_ACCUM:
            this._renderLightAccumulation();
            HX.setRenderTarget(null);
            this._applyGamma.execute(this._rectMesh, this._hdrBuffers[0]);
            break;
        case HX.DebugRenderMode.DEBUG_AO:
            HX.setRenderTarget(null);
            this._copyWChannel.execute(this._rectMesh, this._aoEffect.getAOTexture());
            break;
        default:
            this._renderLightAccumulation(dt);

            this._renderPostPass(this._hdrTargetsDepth[this._hdrSourceIndex], HX.MaterialPass.PRE_EFFECT_PASS);
            this._renderEffects(dt, this._renderCollector._effects);
            this._renderPostPass(this._hdrTargetsDepth[this._hdrSourceIndex], HX.MaterialPass.POST_PASS);
            this._renderEffects(dt, this._camera._effects);

            HX.setRenderTarget(null);

            // TODO: render directly to screen if last post process effect?
            // OR, provide toneMap property on camera, which gets special treatment
            if (this._gammaApplied)
                this._copyTexture.execute(this._rectMesh, this._hdrBuffers[this._hdrSourceIndex]);
            else
                this._applyGamma.execute(this._rectMesh, this._hdrBuffers[this._hdrSourceIndex]);
    }
};

HX.ScreenRenderer.prototype._renderLightAccumulation = function(dt)
{
    HX.GL.enable(HX.GL.BLEND);
    HX.GL.blendFunc(HX.GL.ONE, HX.GL.ONE);
    HX.GL.blendEquation(HX.GL.FUNC_ADD);

    HX.setRenderTarget(this._hdrTargets[this._hdrSourceIndex]);
    HX.clear();

    this._renderLights();
    this._renderGI(dt);

    HX.GL.disable(HX.GL.BLEND);
};

HX.ScreenRenderer.prototype._renderLights = function()
{
    var lights = this._renderCollector.getLights();
    var len = lights.length;
    var activeType = undefined;

    var i = 0;
    var camera = this._camera;
    var gbuffer = this._gbuffer;
    var occlusion = this._aoEffect? this._aoEffect.getAOTexture() : null;

    while (i < len) {
        var light = lights[i];

        if (light._type !== activeType) {
            light.activate(camera, gbuffer, occlusion);
            activeType = light._type;
        }

        i = light.renderBatch(lights, i, camera, gbuffer, occlusion);
    }
};

HX.ScreenRenderer.prototype._renderGI = function(dt)
{
    var occlusion = this._aoEffect? this._aoEffect.getAOTexture() : null;

    HX.GL.disable(HX.GL.CULL_FACE);

    if (this._renderCollector._globalIrradianceProbe)
        this._renderCollector._globalIrradianceProbe.render(this._camera, this._gbuffer, occlusion);

    if (this._localReflections != null) {
        HX.GL.disable(HX.GL.BLEND);
        this._renderEffect(this._localReflections, dt);
        HX.setRenderTarget(this._hdrTargets[this._hdrSourceIndex]);
        HX.GL.enable(HX.GL.BLEND);
    }

    // dest alpha contains amount of GI already present
    HX.GL.blendFunc(HX.GL.DST_ALPHA, HX.GL.ONE);

    if (this._renderCollector._globalSpecularProbe)
        this._renderCollector._globalSpecularProbe.render(this._camera, this._gbuffer, occlusion);
};

HX.ScreenRenderer.prototype._renderPass = function(passType, renderItems)
{
    renderItems = renderItems || this._renderCollector.getRenderList(passType);

    HX.Renderer.prototype._renderPass.call(this, passType, renderItems);
};

HX.ScreenRenderer.prototype._renderPostPass = function(target, passType)
{
    if (this._renderCollector.getRenderList(passType).length == 0)
        return;

    // TODO: only perform this if any pass in the list has a hx_source slot
    this._copySource();

    HX.GL.enable(HX.GL.CULL_FACE);
    HX.GL.enable(HX.GL.DEPTH_TEST);
    HX.GL.depthFunc(HX.GL.LEQUAL);

    HX.setRenderTarget(target);
    this._renderPass(passType);
};

HX.ScreenRenderer.prototype._copySource = function()
{
    var source = this._hdrBuffers[this._hdrSourceIndex];
    var hdrTarget = 1 - this._hdrSourceIndex;
    HX.setRenderTarget(this._hdrTargets[hdrTarget]);
    HX.GL.disable(HX.GL.BLEND);
    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);
    this._copyTexture.execute(this._rectMesh, source);
    this._passSourceTexture = this._hdrBuffers[hdrTarget];
}

HX.ScreenRenderer.prototype._renderEffects = function(dt, effects)
{
    if (!effects || effects.length == 0)
        return;

    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    var len = effects.length;

    for (var i = 0; i < len; ++i) {
        var effect = effects[i];
        if (effect.isSupported()) {
            effect.setMesh(this._rectMesh);
            this._renderEffect(effect, dt);
        }
    }
};

HX.ScreenRenderer.prototype._createGBuffer = function()
{
    if (HX.EXT_DEPTH_TEXTURE) {
        this._depthBuffer = new HX.Texture2D();
        this._depthBuffer.setFilter(HX.TextureFilter.BILINEAR_NOMIP);
        this._depthBuffer.setWrapMode(HX.TextureWrapMode.CLAMP);
    }
    else {
        this._depthBuffer = new HX.ReadOnlyDepthBuffer();
    }

    this._gbuffer = [];

    for (var i = 0; i < 4; ++i) {
        this._gbuffer[i] = new HX.Texture2D();
        this._gbuffer[i].setFilter(HX.TextureFilter.BILINEAR_NOMIP);
        this._gbuffer[i].setWrapMode(HX.TextureWrapMode.CLAMP);
    }

    this._gbufferSingleFBOs = [];

    for (var i = 0; i < 3; ++i)
        this._gbufferSingleFBOs[i] = new HX.FrameBuffer([ this._gbuffer[i] ], this._depthBuffer);

    this._createGBufferFBO();
    this._linearDepthFBO = new HX.FrameBuffer(this._gbuffer[3], null);
};

HX.ScreenRenderer.prototype._createGBufferFBO = function()
{
    throw "Abstract method";
};

HX.ScreenRenderer.prototype._createHDRBuffers = function ()
{
    this._hdrBuffers = [ new HX.Texture2D(), new HX.Texture2D() ];
    this._hdrTargets = [ ];

    for (var i = 0; i < this._hdrBuffers.length; ++i) {
        this._hdrBuffers[i].setFilter(HX.TextureFilter.BILINEAR_NOMIP);
        this._hdrBuffers[i].setWrapMode(HX.TextureWrapMode.CLAMP);
        this._hdrTargets[i] = new HX.FrameBuffer([ this._hdrBuffers[i] ]);
    }

    this._hdrTargetsDepth = [];
    this._hdrTargetsDepth[0] = new HX.FrameBuffer([ this._hdrBuffers[0] ], this._depthBuffer);
    this._hdrTargetsDepth[1] = new HX.FrameBuffer([ this._hdrBuffers[1] ], this._depthBuffer);
};

HX.ScreenRenderer.prototype._updateGBuffer = function (width, height)
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
};

HX.ScreenRenderer.prototype._updateGBufferFBO = function()
{
    throw "Abstract method";
};

HX.ScreenRenderer.prototype._updateHDRBuffers = function(width, height)
{
    for (var i = 0; i < this._hdrBuffers.length; ++i) {
        this._hdrBuffers[i].initEmpty(width, height, HX.GL.RGBA, HX.HDR_FORMAT);
        this._hdrTargets[i].init();
        this._hdrTargetsDepth[i].init();
    }
};

HX.ScreenRenderer.prototype.dispose = function()
{
    this._applyGamma.dispose();
    this._copyTexture.dispose();
    this._copyXChannel.dispose();
    this._copyYChannel.dispose();
    this._copyZChannel.dispose();
    this._copyWChannel.dispose();
    this._rectMesh.dispose();

    for (var i = 0; i < this._hdrBuffers.length; ++i) {
        this._hdrBuffers[i].dispose();
        this._hdrTargets[i].dispose();
        this._hdrTargetsDepth[i].dispose();
    }

    for (var i = 0; i < this._gbuffer.length; ++i)
        this._gbuffer[i].dispose();

    for (var i = 0; i < this._gbufferFBO.length; ++i)
        this._gbufferFBO[i].dispose();
};

HX.ScreenRenderer.prototype._switchPass = function(oldPass, newPass)
{
    HX.Renderer.prototype._switchPass.call(this, oldPass, newPass);
    newPass.assignGBuffer(this._gbuffer);
    if (this._passSourceTexture) {
        newPass.setTexture("hx_source", this._passSourceTexture);
    }
};