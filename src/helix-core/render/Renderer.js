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
import {RenderPath} from "./RenderPath";
import {SpotLight} from "../light/SpotLight";

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

    this._depthPrePass = false;
    this._gammaApplied = false;

    this._copyTextureShader = new CopyChannelsShader("xyzw", true);
    this._applyGamma = new ApplyGammaShader();

    this._camera = null;
    this._scene = null;
    this._depthBuffer = this._createDepthBuffer();
    this._hdrBack = new Renderer.HDRBuffers(this._depthBuffer);
    this._hdrFront = new Renderer.HDRBuffers(this._depthBuffer);
    this._renderCollector = new RenderCollector();
    this._normalDepthBuffer = new Texture2D();
    this._normalDepthBuffer.filter = TextureFilter.BILINEAR_NOMIP;
    this._normalDepthBuffer.wrapMode = TextureWrapMode.CLAMP;
    this._normalDepthFBO = new FrameBuffer(this._normalDepthBuffer, this._depthBuffer);

    this._backgroundColor = Color.BLACK.clone();
    //this._previousViewProjection = new Matrix4x4();
    this._debugMode = Renderer.DebugMode.NONE;
    this._ssaoTexture = null;
}

/**
 * A collection of debug render modes to inspect some steps in the render pipeline.
 * @enum
 */
Renderer.DebugMode = {
    NONE: 0,
    SSAO: 1,
    NORMAL_DEPTH: 2
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
     * One of {Renderer.DebugMode}
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
     * Defines whether or not a depth pre-pass needs to be performed when rendering. This may improve rendering by
     * spending less time calculating lighting on invisible fragments.
     */
    get depthPrepass()
    {
        return this._depthPrepass;
    },

    set depthPrepass(value)
    {
        this._depthPrepass = value;
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
        if (value instanceof Color)
            this._backgroundColor.copyFrom(value);
        else
            this._backgroundColor.set(value);
    },

    /**
     * The Camera currently being used for rendering.
     */
    get camera()
    {
        return this._camera;
    },

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

        GL.setClearColor(Color.BLACK);

        GL.setDepthMask(true);
        GL.setColorMask(true);

        this._renderNormalDepth();
        this._renderAO();

        GL.setRenderTarget(this._hdrFront.fboDepth);
        GL.setClearColor(this._backgroundColor);
        GL.clear();

        if (this._depthPrepass) {
            GL.setColorMask(false);
            RenderUtils.renderPass(this, MaterialPass.NORMAL_DEPTH_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_FIXED));
            RenderUtils.renderPass(this, MaterialPass.NORMAL_DEPTH_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC));
            GL.setColorMask(true);
        }

        this._renderOpaque();
        this._renderTransparent();

        this._swapHDRFrontAndBack();
        this._renderEffects(dt);

        GL.setColorMask(true);

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
    _renderOpaque: function()
    {
        RenderUtils.renderPass(this, MaterialPass.BASE_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_FIXED));

        var list = this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC);
        if (list.length === 0) return;

        RenderUtils.renderPass(this, MaterialPass.BASE_PASS, list);

        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        for (var i = 0; i < numLights; ++i) {
            var light = lights[i];

            // I don't like type checking, but lighting support is such a core thing...
            // maybe we can work in a more plug-in like light system
            if (light instanceof LightProbe) {
                RenderUtils.renderPass(this, MaterialPass.LIGHT_PROBE_PASS, list, light);
            }
            else if (light instanceof DirectionalLight) {
                // if non-global, do intersection tests
                var passType = light.castShadows? MaterialPass.DIR_LIGHT_SHADOW_PASS : MaterialPass.DIR_LIGHT_PASS;

                // PASS IN LIGHT AS DATA, so the material can update it
                RenderUtils.renderPass(this, passType, list, light);
            }
            else if (light instanceof PointLight) {
                // cannot just use renderPass, need to do intersection tests
                var passType = light.castShadows? MaterialPass.POINT_LIGHT_SHADOW_PASS : MaterialPass.POINT_LIGHT_PASS;
                this._renderLightPassIfIntersects(light, passType, list);
            }
            else if (light instanceof SpotLight) {
                var passType = light.castShadows? MaterialPass.SPOT_LIGHT_SHADOW_PASS : MaterialPass.SPOT_LIGHT_PASS;
                this._renderLightPassIfIntersects(light, passType, list);
            }
        }
    },

    _renderTransparent: function()
    {
        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        var list = this._renderCollector.getTransparentRenderList();

        // transparents need to be rendered one-by-one, not light by light
        var numItems = list.length;
        for (var r = 0; r < numItems; ++r) {

            var renderItem = list[r];

            this._renderSingleItem(MaterialPass.BASE_PASS, renderItem);

            var material = renderItem.material;

            // these won't have the correct pass
            if (material._renderPath !== RenderPath.FORWARD_DYNAMIC) continue;

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
                else if (light instanceof SpotLight) {
                    // cannot just use renderPass, need to do intersection tests
                    this._renderLightPassIfIntersects(light, MaterialPass.SPOT_LIGHT_PASS, list);
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
        var mesh = meshInstance._mesh;
        GL.drawElements(pass._elementType, mesh._numIndices, 0, mesh._indexType);
    },

    /**
     * @ignore
     * @private
     */
    _renderNormalDepth: function()
    {
        var rc = this._renderCollector;
        var dynamic = rc.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC);
        var fixed = rc.getOpaqueRenderList(RenderPath.FORWARD_FIXED);

        if (rc.needsNormalDepth) {
            GL.setRenderTarget(this._normalDepthFBO);
            GL.setClearColor(Color.BLUE);
            GL.clear();
            RenderUtils.renderPass(this, MaterialPass.NORMAL_DEPTH_PASS, dynamic);
            RenderUtils.renderPass(this, MaterialPass.NORMAL_DEPTH_PASS, fixed);
            GL.setClearColor(Color.BLACK);
        }
    },

    /**
     * @ignore
     * @private
     */
    _renderAO: function()
    {
        var ssao = META.OPTIONS.ambientOcclusion;
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
    _renderToScreen: function (renderTarget)
    {
        GL.setRenderTarget(renderTarget);
        GL.clear();

        if (this._debugMode) {
            var tex;
            switch (this._debugMode) {
                case Renderer.DebugMode.NORMAL_DEPTH:
                    tex = this._normalDepthBuffer;
                    break;
                case Renderer.DebugMode.SSAO:
                    tex = this._ssaoTexture;
                    break;
                default:
                    // nothing
            }
            this._copyTextureShader.execute(RectMesh.DEFAULT, tex);
            return;
        }

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
            this._normalDepthBuffer.initEmpty(width, height);
            this._normalDepthFBO.init();
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
    }
};

export { Renderer };