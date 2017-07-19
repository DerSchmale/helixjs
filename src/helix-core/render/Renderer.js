import {Color} from "../core/Color";
import {RenderCollector} from "./RenderCollector";
import {ApplyGammaShader, CopyChannelsShader} from "./UtilShaders";
import {Texture2D} from "../texture/Texture2D";
import {MaterialPass} from "../material/MaterialPass";
import {RectMesh} from "../mesh/RectMesh";
import {_HX_, TextureFormat, TextureFilter, TextureWrapMode, META, capabilities, Comparison, CullMode} from "../Helix";
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

/**
 * @classdesc
 * Renderer performs the actual rendering of a {@linkcode Scene} as viewed by a {@linkcode Camera} to the screen.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Renderer()
{
    this._width = 0;
    this._height = 0;

    this._gammaApplied = false;

    this._copyTextureShader = new CopyChannelsShader("xyzw", true);
    this._applyGamma = new ApplyGammaShader();

    this._camera = null;
    this._scene = null;
    this._depthBuffer = this._createDepthBuffer();
    this._hdrBack = new Renderer.HDRBuffers(this._depthBuffer);
    this._hdrFront = new Renderer.HDRBuffers(this._depthBuffer);
    this._renderCollector = new RenderCollector();
    this._gbuffer = new GBuffer(this._depthBuffer);
    this._backgroundColor = Color.BLACK.clone();
    //this._previousViewProjection = new Matrix4x4();
    this._debugMode = Renderer.DebugRenderMode.NONE;
    this._renderAmbientShader = new DeferredAmbientShader();
    this._ssaoTexture = null;
}

/**
 * A collection of debug render modes to inspect some steps in the render pipeline.
 * @enum
 */
Renderer.DebugRenderMode = {
    NONE: 0,
    SSAO: 1,
    GBUFFER_ALBEDO: 2,
    // TODO: Put back normal, depth, roughness, metallicness, normalSpecular back in
    GBUFFER_NORMAL_DEPTH: 3,
    GBUFFER_SPECULAR: 4,
    LIGHT_ACCUMULATION: 5
};

/**
 * @ignore
 */
Renderer.HDRBuffers = function(depthBuffer)
{
    this.texture = new Texture2D();
    this.texture.filter = TextureFilter.BILINEAR_NOMIP;
    this.texture.wrapMode = TextureWrapMode.CLAMP;
    this.fbo = new FrameBuffer(this.texture);
    this.fboDepth = new FrameBuffer(this.texture, depthBuffer);
};

Renderer.HDRBuffers.prototype =
{
    resize: function(width, height)
    {
        this.texture.initEmpty(width, height, TextureFormat.RGBA, capabilities.HDR_FORMAT);
        this.fbo.init();
        this.fboDepth.init();
    }
};

Renderer.prototype =
{
    /**
     * One of {Renderer.DebugRenderMode}
     */
    get debugMode()
    {
        return this._debugMode;
    },

    set debugMode(value)
    {
        this._debugMode = value;
    },

    /**
     * The background {@linkcode Color}.
     */
    get backgroundColor()
    {
        return this._backgroundColor;
    },

    set backgroundColor(value)
    {
        this._backgroundColor = new Color(value);
    },

    /**
     * The Camera currently being used for rendering.
     */
    get camera()
    {
        return this._camera;
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
     * Renders the scene through a camera.
     * It's not recommended changing render targets if they have different sizes (so splitscreen should be fine). Otherwise, use different renderer instances.
     * @param camera The {@linkcode Camera} from which to view the scene.
     * @param scene The {@linkcode Scene} to render.
     * @param dt The milliseconds passed since last frame.
     * @param [renderTarget] An optional {@linkcode FrameBuffer} object to render to.
     */
    render: function (camera, scene, dt, renderTarget)
    {
        this._gammaApplied = _HX_.GAMMA_CORRECT_LIGHTS;
        this._camera = camera;
        this._scene = scene;

        this._updateSize(renderTarget);

        camera._setRenderTargetResolution(this._width, this._height);
        this._renderCollector.collect(camera, scene);

        this._ambientColor = this._renderCollector._ambientColor;

        this._renderShadowCasters();

        var opaqueList = this._renderCollector.getOpaqueRenderList();
        var transparentList = this._renderCollector.getTransparentRenderList();

        GL.setClearColor(Color.BLACK);

        GL.setDepthMask(true);
        this._renderGBuffer(opaqueList);
        this._renderAO();

        if (this._renderCollector.needsGBuffer)
            this._renderDeferredLighting(opaqueList);

        if (this._debugMode !== Renderer.DebugRenderMode.LIGHT_ACCUMULATION) {
            GL.setRenderTarget(this._hdrFront.fboDepth);
            GL.setClearColor(this._backgroundColor);
            GL.clear();

            this._renderForwardLit(opaqueList);

            // THIS IS EXTREMELY INEFFICIENT ON SOME (TILED HIERARCHY) PLATFORMS
            if (this._renderCollector.needsBackbuffer)
                this._copyToBackBuffer();

            this._renderForwardTransparent(transparentList);

            this._swapHDRFrontAndBack();
            this._renderEffects(dt);

        }

        this._renderToScreen(renderTarget);

        GL.setBlendState();
        GL.setDepthMask(true);

        // for the future, if we ever need back-projection
        //this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);
    },

    /**
     * @ignore
     * @private
     */
    _renderForwardLit: function(list)
    {
        this._renderPass(MaterialPass.BASE_PASS, list);

        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        for (var i = 0; i < numLights; ++i) {
            var light = lights[i];

            // I don't like type checking, but lighting support is such a core thing...
            // maybe we can work in a more plug-in like light system
            if (light instanceof LightProbe) {
                this._renderPass(MaterialPass.LIGHT_PROBE_PASS, list, light);
            }
            else if (light instanceof DirectionalLight) {
                // if non-global, do intersection tests
                var passType = light.castShadows? MaterialPass.DIR_LIGHT_SHADOW_PASS : MaterialPass.DIR_LIGHT_PASS;

                // PASS IN LIGHT AS DATA, so the material can update it
                this._renderPass(passType, list, light);
            }
            else if (light instanceof PointLight) {
                // cannot just use renderPass, need to do intersection tests
                this._renderLightPassIfIntersects(light, MaterialPass.POINT_LIGHT_PASS, list);
            }
        }
    },

    _renderForwardTransparent: function(list)
    {
        var lights = this._renderCollector.getLights();
        var numLights = lights.length;


        // transparents need to be rendered one-by-one, not light by light
        var len = list.length;
        for (var r = 0; r < len; ++r) {

            var renderItem = list[r];

            this._renderSingleItem(MaterialPass.BASE_PASS, renderItem);

            for (var i = 0; i < numLights; ++i) {
                var light = lights[i];

                // I don't like type checking, but lighting support is such a core thing...
                // maybe we can work in a more plug-in like light system
                if (light instanceof LightProbe) {
                    this._renderSingleItem(MaterialPass.LIGHT_PROBE_PASS, renderItem, light);
                }
                else if (light instanceof DirectionalLight) {
                    // if non-global, do intersection tests
                    var passType = light.castShadows? MaterialPass.DIR_LIGHT_SHADOW_PASS : MaterialPass.DIR_LIGHT_PASS;
                    this._renderSingleItem(passType, renderItem, light);
                }
                else if (light instanceof PointLight) {
                    // cannot just use renderPass, need to do intersection tests
                    this._renderLightPassIfIntersects(light, MaterialPass.POINT_LIGHT_PASS, list);
                }
            }
        }

        GL.setBlendState();
    },

    /**
     * @ignore
     * @private
     */
    _renderLightPassIfIntersects: function(light, passType, renderList)
    {
        var lightBound = light.worldBounds;
        var len = renderList.length;
        for (var r = 0; r < len; ++r) {
            var renderItem = renderList[r];
            var material = renderItem.material;
            var pass = material.getPass(passType);
            if (!pass) continue;

            if (lightBound.intersectsBound(renderItem.worldBounds))
                this._renderSingleItem(passType, renderItem, light);
        }
    },

    _renderSingleItem: function(passType, renderItem, light)
    {
        var pass = renderItem.material.getPass(passType);
        if (!pass) return;
        var meshInstance = renderItem.meshInstance;
        pass.updatePassRenderState(renderItem.camera, this, light);
        pass.updateInstanceRenderState(renderItem.camera, renderItem, light);
        meshInstance.updateRenderState(passType);
        GL.drawElements(pass._elementType, meshInstance._mesh.numIndices, 0);
    },

    /**
     * @ignore
     * @private
     */
    _renderGBuffer: function(list)
    {
        if (this._renderCollector.needsGBuffer) {
            if (capabilities.GBUFFER_MRT) {
                GL.setRenderTarget(this._gbuffer.mrt);
                // this is just so the linear depth value will be correct
                GL.setClearColor(Color.BLUE);
                GL.clear();
                this._renderPass(MaterialPass.GBUFFER_PASS, list);
            }
            else {
                this._renderGBufferPlane(list, GBuffer.ALBEDO, MaterialPass.GBUFFER_ALBEDO_PASS, Color.BLACK);
                this._renderGBufferPlane(list, GBuffer.NORMAL_DEPTH, MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, Color.BLUE);
                this._renderGBufferPlane(list, GBuffer.SPECULAR, MaterialPass.GBUFFER_SPECULAR_PASS, Color.BLACK);
            }
            GL.setClearColor(Color.BLACK);
        }
        else if (this._renderCollector.needsNormalDepth || HX.META.OPTIONS.ambientOcclusion) {
            // otherwise, we might just need normalDepth
            this._renderGBufferPlane(list, GBuffer.NORMAL_DEPTH, MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, Color.BLUE);
            GL.setClearColor(Color.BLACK);
        }
    },

    /**
     * @ignore
     * @private
     */
    _renderGBufferPlane: function(list, plane, passType, clearColor)
    {
        GL.setRenderTarget(this._gbuffer.fbos[plane]);
        // furthest depth and alpha must be 1, the rest 0
        GL.setClearColor(clearColor);
        GL.clear();
        this._renderPass(passType, list);
    },

    /**
     * @ignore
     * @private
     */
    _renderDeferredLighting: function()
    {
        if (!this._renderCollector._needsGBuffer) return;
        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        // for some reason, this doesn't get cleared?
        GL.setRenderTarget(this._hdrFront.fbo);
        GL.clear();
        GL.setBlendState(BlendState.ADD);
        GL.setDepthTest(Comparison.DISABLED);

        var ambient =  this._ambientColor;
        if (ambient.r !== 0 || ambient.g !== 0 || ambient.b !== 0) {
            this._renderAmbientShader.execute(this, ambient);
        }

        for (var i = 0; i < numLights; ++i) {
            lights[i].renderDeferredLighting(this);
        }

        this._swapHDRFrontAndBack();
        GL.setBlendState();
    },

    /**
     * @ignore
     * @private
     */
    _renderAO: function()
    {
        var ssao = HX.META.OPTIONS.ambientOcclusion;
        if (ssao) {
            this._ssaoTexture = ssao.getAOTexture();
            ssao.render(this, 0);
        }
    },

    /**
     * @ignore
     * @private
     */
    _renderShadowCasters: function ()
    {
        var casters = this._renderCollector._shadowCasters;
        var len = casters.length;

        for (var i = 0; i < len; ++i)
            casters[i].render(this._camera, this._scene)
    },

    /**
     * @ignore
     * @private
     */
    _renderEffect: function (effect, dt)
    {
        this._gammaApplied = this._gammaApplied || effect._outputsGamma;
        effect.render(this, dt);
    },

    /**
     * @ignore
     * @private
     */
    _renderPass: function (passType, renderItems, data)
    {
        RenderUtils.renderPass(this, passType, renderItems, data);
    },

    /**
     * @ignore
     * @private
     */
    _renderToScreen: function (renderTarget)
    {
        GL.setRenderTarget(renderTarget);
        GL.clear();

        if (this._debugMode) {
            var tex;
            switch (this._debugMode) {
                case Renderer.DebugRenderMode.GBUFFER_ALBEDO:
                    tex = this._gbuffer.textures[0];
                    break;
                case Renderer.DebugRenderMode.GBUFFER_NORMAL_DEPTH:
                    tex = this._gbuffer.textures[1];
                    break;
                case Renderer.DebugRenderMode.GBUFFER_SPECULAR:
                    tex = this._gbuffer.textures[2];
                    break;
                case Renderer.DebugRenderMode.SSAO:
                    tex = this._ssaoTexture;
                    break;
                case Renderer.DebugRenderMode.LIGHT_ACCUMULATION:
                    tex = this._hdrBack.texture;
                    break;
                default:
                    // nothing
            }
            this._copyTextureShader.execute(RectMesh.DEFAULT, tex);
            return;
        }

        // TODO: render directly to screen if last post process effect?
        if (this._gammaApplied)
            this._copyTextureShader.execute(RectMesh.DEFAULT, this._hdrBack.texture);
        else
            this._applyGamma.execute(RectMesh.DEFAULT, this._hdrBack.texture);
    },

    /**
     * @ignore
     * @private
     */
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

    /**
     * @ignore
     * @private
     */
    _updateSize: function (renderTarget)
    {
        var width, height;
        if (renderTarget) {
            width = renderTarget.width;
            height = renderTarget.height;
        }
        else {
            width = META.TARGET_CANVAS.width;
            height = META.TARGET_CANVAS.height;
        }

        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this._depthBuffer.init(this._width, this._height, true);
            this._hdrBack.resize(this._width, this._height);
            this._hdrFront.resize(this._width, this._height);
            this._gbuffer.resize(this._width, this._height);
        }
    },

    /**
     * @ignore
     */
    _swapHDRFrontAndBack: function()
    {
        var tmp = this._hdrBack;
        this._hdrBack = this._hdrFront;
        this._hdrFront = tmp;
    },

    /**
     * @ignore
     * @private
     */
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

    /**
     * @ignore
     * @private
     */
    _copyToBackBuffer: function()
    {
        GL.setRenderTarget(this._hdrBack.fbo);
        GL.clear();
        this._copyTextureShader.execute(RectMesh.DEFAULT, this._hdrFront.texture);
        GL.setRenderTarget(this._hdrFront.fboDepth);
        // DO NOT CLEAR. This can be very slow on tiled gpu architectures such as PowerVR
    }
};

export { Renderer };