import {Color} from "../core/Color";
import {RenderCollector} from "./RenderCollector";
import {ApplyGammaShader, CopyChannelsShader} from "./UtilShaders";
import {Texture2D} from "../texture/Texture2D";
import {MaterialPass} from "../material/MaterialPass";
import {RectMesh} from "../mesh/RectMesh";
import {TextureFormat, TextureFilter, TextureWrapMode, META, capabilities} from "../Helix";
import {FrameBuffer} from "../texture/FrameBuffer";
import {GL} from "../core/GL";
import {RenderUtils} from "./RenderUtils";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {DirectionalLight} from "../light/DirectionalLight";
import {PointLight} from "../light/PointLight";
import {LightProbe} from "../light/LightProbe";
import {RenderPath} from "./RenderPath";
import {SpotLight} from "../light/SpotLight";
import {ShadowAtlas} from "./ShadowAtlas";
import {CascadeShadowMapRenderer} from "./CascadeShadowMapRenderer";
import {OmniShadowMapRenderer} from "./OmniShadowMapRenderer";
import {SpotShadowMapRenderer} from "./SpotShadowMapRenderer";
import {Float4} from "../math/Float4";
import {Matrix4x4} from "../math/Matrix4x4";
import {MathX} from "../math/MathX";
import {TextureCube} from "../texture/TextureCube";
import {UniformBuffer} from "../core/UniformBuffer";

/**
 * @classdesc
 * Renderer performs the actual rendering of a {@linkcode Scene} as viewed by a {@linkcode Camera} to the screen.
 *
 * @param {RenderTarget} [renderTarget] An optional render target for the Renderer to draw to.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Renderer(renderTarget)
{
    this._renderTarget = renderTarget || null;
    this._width = 0;
    this._height = 0;

    this._depthPrepass = false;
    this._gammaApplied = false;

    this._copyTextureShader = new CopyChannelsShader("xyzw", true);
    this._applyGamma = new ApplyGammaShader();

    this._camera = null;
    this._activeCamera = null;
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

    this._cascadeShadowRenderer = new CascadeShadowMapRenderer();
    this._omniShadowRenderer = new OmniShadowMapRenderer();
    this._spotShadowRenderer = new SpotShadowMapRenderer();
    this._shadowAtlas = new ShadowAtlas(!!META.OPTIONS.shadowFilter.blurShader);
    this._shadowAtlas.resize(2048, 2048);

    if (capabilities.WEBGL_2) {
		var size = 16 + META.OPTIONS.maxDirLights * 320 + META.OPTIONS.maxLightProbes * 16 + META.OPTIONS.maxPointSpotLights * 224;
		this._diffuseProbeArray = [];
		this._specularProbeArray = [];
		this._lightingUniformBuffer = new UniformBuffer(size);
		this._lightingDataView = new DataView(new ArrayBuffer(size));
		// these will contain all the indices into the light buffer
        // reserve space for every cell AND the count inside them!
		this._numCells = META.OPTIONS.numLightingCellsX * META.OPTIONS.numLightingCellsY;
		this._cellStride = META.OPTIONS.maxPointSpotLights + 1;

		// this throws errors
		this._lightingCellsUniformBuffer = new UniformBuffer(this._numCells * this._cellStride * 4);
		this._cellData = new Int32Array(this._numCells * this._cellStride);

		for (var i = 0; i < size; ++i)
		    this._lightingDataView.setInt8(i, 0);

		// if we want to test the layout of the uniform buffer as defined in the shader:
		/*var material = new BasicMaterial({ lightingModel: LightingModel.GGX });
		var pass = material.getPass(MaterialPass.BASE_PASS);
		this._lightingUniformBuffer = pass.createUniformBufferFromShader("hx_lights");
		this._lightingCellsUniformBuffer = pass.createUniformBufferFromShader("hx_lightingCells");
		console.log(this._lightingCellsUniformBuffer);*/
    }
}

/**
 * A collection of debug render modes to inspect some steps in the render pipeline.
 * @enum
 */
Renderer.DebugMode = {
    NONE: 0,
    SSAO: 1,
    NORMAL_DEPTH: 2,
    SHADOW_MAP: 3
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
     * The size of the shadow atlas texture.
     */
    get shadowMapSize()
    {
        return this._shadowAtlas.width;
    },

    set shadowMapSize(value)
    {
        this._shadowAtlas.resize(value, value);
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

    get renderTarget()
    {
        return this._renderTarget;
    },

    set renderTarget(value)
    {
        this._renderTarget = value;
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
     */
    render: function (camera, scene, dt)
    {
        this._camera = camera;
        this._scene = scene;

        this._updateSize(this._renderTarget);
        camera._setRenderTargetResolution(this._width, this._height);

        this._renderCollector.collect(camera, scene);

		this._ambientColor = this._renderCollector._ambientColor;

		this._renderShadowCasters();

		this._renderView(camera, scene, dt);

		this._renderToScreen();

		GL.setBlendState();
		GL.setDepthMask(true);
    },

    _renderView: function(camera, scene, dt)
    {
        this._gammaApplied = false;
        this._activeCamera = camera;
        this._scene = scene;

        if (capabilities.WEBGL_2)
            camera._updateClusterPlanes();

        GL.setDepthMask(true);
        GL.setColorMask(true);

        this._renderNormalDepth();
        this._renderAO();

        GL.setRenderTarget(this._hdrFront.fboDepth);
        GL.setClearColor(this._backgroundColor);
        GL.clear();

        this._renderDepthPrepass();

        if (capabilities.WEBGL_2)
            this._renderClustered();
        else {
            this._renderForward();
        }

        this._swapHDRFrontAndBack();
        this._renderEffects(dt);

        GL.setColorMask(true);

        // for the future, if we ever need back-projection
        //this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);
    },

    /**
     * @ignore
     * @private
     */
    _renderDepthPrepass: function ()
    {
        if (!this._depthPrepass) return;

        GL.lockColorMask(false);
        RenderUtils.renderPass(this, this._activeCamera, MaterialPass.NORMAL_DEPTH_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_FIXED));
        RenderUtils.renderPass(this, this._activeCamera, MaterialPass.NORMAL_DEPTH_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC));
        GL.unlockColorMask(true);
    },

    _renderClustered: function()
    {
        var lights = this._renderCollector.getLights();
        var numLights = lights.length;
        var data = this._lightingDataView;
        var cells = this._cellData;
        var camera = this._camera;
        var maxDirLights = META.OPTIONS.maxDirLights, maxProbes = META.OPTIONS.maxLightProbes, maxPoints = META.OPTIONS.maxPointSpotLights;
		var dirLightStride = 320, probeStride = 16, pointStride = 224;
		var dirLightOffset = 16;
		var probeOffset = maxDirLights * dirLightStride + dirLightOffset;
		var pointOffset = maxProbes * probeStride + probeOffset;
        var numDirLights = 0, numPointLights = 0, numProbes = 0;
        var numCells = META.OPTIONS.numLightingCellsX * META.OPTIONS.numLightingCellsY;
        var cellStride = this._cellStride;
        var i;

        for (i = 0; i < numCells; ++i) {
            // reset light counts to 0
			cells[i * cellStride] = 0;
		}

        for (i = 0; i < maxProbes; ++i) {
            this._diffuseProbeArray[i] = TextureCube.DEFAULT;
            this._specularProbeArray[i] = TextureCube.DEFAULT;
        }

        for (i = 0; i < numLights; ++i) {
            var light = lights[i];

            if (light instanceof DirectionalLight && numDirLights < maxDirLights) {
                this.writeDirectionalLight(light, camera, data, dirLightOffset);

                dirLightOffset += dirLightStride;
                ++numDirLights;
            }
            else if (light instanceof LightProbe && numProbes < maxProbes) {
                this.writeLightProbe(light, data, probeOffset);

                if (light.diffuseTexture)
                    this._diffuseProbeArray[numProbes] = light.diffuseTexture;

                if (light.specularTexture)
                    this._specularProbeArray[numProbes] = light.specularTexture;

                probeOffset += probeStride;
                ++numProbes;
            }
            else if (light instanceof PointLight && numPointLights < maxPoints) {
                this.writePointSpotLight(light, camera, data, pointOffset, false, cells, numPointLights);

                pointOffset += pointStride;
                ++numPointLights;
            }
            else if (light instanceof SpotLight && numPointLights < maxPoints) {
                this.writePointSpotLight(light, camera, data, pointOffset, true, cells, numPointLights);

                pointOffset += pointStride;
                ++numPointLights;
            }
        }

        data.setInt32(0, numDirLights, true);
        data.setInt32(4, numProbes, true);
        data.setInt32(8, numPointLights, true);

        this._lightingUniformBuffer.uploadData(this._lightingDataView);
        this._lightingCellsUniformBuffer.uploadData(this._cellData);

        RenderUtils.renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_FIXED));
        RenderUtils.renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC));

		if (this._renderCollector.needsBackbuffer)
			this._copyBackbuffer();

        RenderUtils.renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getTransparentRenderList(RenderPath.FORWARD_FIXED));
        RenderUtils.renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getTransparentRenderList(RenderPath.FORWARD_DYNAMIC));
    },

    /**
     * @ignore
     * @private
     */
    writePointSpotLight: function(light, camera, target, offset, isSpot, cells, index)
    {
        var pos = new Float4();
        var dir = new Float4();
        var matrix = new Matrix4x4();
        return function(light, camera, target, offset, isSpot, cells, index)
        {
            var o;
            var col = light._scaledIrradiance;
            var lightMatrix = light.entity.worldMatrix;
            var viewMatrix = camera.viewMatrix;
            target.setFloat32(offset, col.r, true);
            target.setFloat32(offset + 4, col.g, true);
            target.setFloat32(offset + 8, col.b, true);

            target.setFloat32(offset + 12, light.radius, true);

			lightMatrix.getColumn(3, pos);
			viewMatrix.transformPoint(pos, pos);
            target.setFloat32(offset + 16, pos.x, true);
            target.setFloat32(offset + 20, pos.y, true);
            target.setFloat32(offset + 24, pos.z, true);

            target.setFloat32(offset + 28, 1.0 / light.radius, true);

            if (isSpot) {
				lightMatrix.getColumn(1, dir);
				viewMatrix.transformVector(dir, dir);
				target.setFloat32(offset + 32, dir.x, true);
				target.setFloat32(offset + 36, dir.y, true);
				target.setFloat32(offset + 40, dir.z, true);

                target.setUint32(offset + 112, 1, true);
                target.setFloat32(offset + 120, light._cosOuter, true);
                target.setFloat32(offset + 124, 1.0 / Math.max((light._cosInner - light._cosOuter), .00001), true);
            }
            else {
                target.setUint32(offset + 112, 0, true);
            }

            target.setUint32(offset + 116, light.castShadows? 1 : 0, true);

            if (light.castShadows) {
                target.setFloat32(offset + 44, light.depthBias, true);

                var m;

                if (isSpot) {
                    matrix.multiply(light._shadowMatrix, camera.worldMatrix);
                    m = matrix._m;

                    var tile = light._shadowTile;
                    target.setFloat32(offset + 128, tile.x, true);
                    target.setFloat32(offset + 132, tile.y, true);
                    target.setFloat32(offset + 136, tile.z, true);
                    target.setFloat32(offset + 140, tile.w, true);
                }
                else {
                    m = camera.worldMatrix._m;

                    o = offset + 128;
                    for (var face = 0; face < 6; ++face) {
                        tile = light._shadowTiles[face];
                        target.setFloat32(o, tile.x, true);
                        target.setFloat32(o + 4, tile.y, true);
                        target.setFloat32(o + 8, tile.z, true);
                        target.setFloat32(o + 12, tile.w, true);
                        o += 16;
                    }
                }

                o = offset + 48;

                for (var l = 0; l < 16; ++l) {
                    target.setFloat32(o, m[l], true);
                    o += 4;
                }

            }

            if (isSpot)
				viewMatrix.transformPoint(light.entity.worldBounds.center, pos);

            this.assignToCells(light, camera, index, pos, cells, isSpot? dir : null);
		}
    }(),

	assignToCells: function(light, camera, index, viewPos, cells, dir)
    {
    	var p = new Float4();
    	return function(light, camera, index, viewPos, cells, dir) {
			var cellStride = this._cellStride;
			var bounds = light.entity.worldBounds;
			var radius = bounds.getRadius();

			var nx = META.OPTIONS.numLightingCellsX;
			var ny = META.OPTIONS.numLightingCellsY;

			var planesW = camera._clusterPlanesW;
			var planesH = camera._clusterPlanesH;

			// should we project viewPos to NDC to figure out which frustum we're in?
			// then we don't need to calculate all of the above, only until it's considered "outside"
			camera.projectionMatrix.projectPoint(viewPos, p);

			var fX = Math.floor((p.x * .5 + .5) * nx);
			var fY = Math.floor((p.y * .5 + .5) * ny);
			if (fX < 0) fX = 0;
			else if (fX >= nx) fX = nx - 1;
			if (fY < 0) fY = 0;
			else if (fY >= ny) fY = ny - 1;

			// left and right plane distances1
			var minX = fX, maxX = fX;

			for (var x = fX; x >= 0; --x) {
				minX = x;
				if (planesW[x].dot4(viewPos) > radius) break;
			}

			for (x = fX + 1; x < nx; ++x) {
				maxX = x;
				if (-planesW[x + 1].dot4(viewPos) > radius) break;
			}

			var i, pi, c;
			for (var y = fY; y >= 0; --y) {
				for (x = minX; x <= maxX; ++x) {
					// TODO: Another test to check if the nearest corner actually falls inside the sphere
					i = x + y * nx;
					pi = i * cellStride;
					c = ++cells[pi];
					cells[pi + c] = index;
				}

				if (planesH[y].dot4(viewPos) > radius) break;
			}

			for (y = fY + 1; y < ny; ++y) {
				for (x = minX; x <= maxX; ++x) {
					// TODO: Another test to check if the nearest corner actually falls inside the sphere
					i = x + y * nx;
					pi = i * cellStride;
					c = ++cells[pi];
					cells[pi + c] = index;
				}

				if (-planesH[y + 1].dot4(viewPos) > radius) break;
			}
    	}
    }(),

    /**
     * @ignore
     * @private
     */
    writeLightProbe: function(light, target, offset)
    {
        target.setUint32(offset, light.diffuseTexture? 1: 0, true);

        var specularTex = light.specularTexture;
        if (specularTex) {
            target.setUint32(offset + 4, 1, true);
            var numMips = Math.floor(MathX.log2(specularTex.size));
            target.setFloat32(offset + 8, numMips, true);
        }
        else {
            target.setUint32(offset + 4, 0, true);
        }
    },

    /**
     * @ignore
     * @private
     */
    writeDirectionalLight: function(light, camera, target, offset)
    {
        var dir = new Float4();
        var matrix = new Matrix4x4();
        return function(light, camera, target, offset)
        {
            var col = light._scaledIrradiance;
            target.setFloat32(offset, col.r, true);
            target.setFloat32(offset + 4, col.g, true);
            target.setFloat32(offset + 8, col.b, true);

            camera.viewMatrix.transformVector(light.direction, dir);
            target.setFloat32(offset + 16, dir.x, true);
            target.setFloat32(offset + 20, dir.y, true);
            target.setFloat32(offset + 24, dir.z, true);

            target.setUint32(offset + 28, light.castShadows? 1 : 0, true);

            if (light.castShadows) {
                var numCascades = META.OPTIONS.numShadowCascades;
                var splits = light._cascadeSplitDistances;

                var m = matrix._m;
                var o = offset + 32;

                for (var j = 0; j < numCascades; ++j) {
                    matrix.multiply(light.getShadowMatrix(j), camera.worldMatrix);

                    for (var l = 0; l < 16; ++l) {
                        target.setFloat32(o, m[l], true);
                        o += 4;
                    }
                }

                target.setFloat32(offset + 288, splits[0], true);
                target.setFloat32(offset + 292, splits[1], true);
                target.setFloat32(offset + 296, splits[2], true);
                target.setFloat32(offset + 300, splits[3], true);
                target.setFloat32(offset + 304, light.depthBias, true);
                target.setFloat32(offset + 308, splits[numCascades - 1], true);
            }
        }
    }(),

	/**
	 * @ignore
	 * @private
	 */
	_copyBackbuffer: function()
	{
		GL.setRenderTarget(this._hdrBack.fbo);
		GL.clear();
		this._copyTextureShader.execute(RectMesh.DEFAULT, this._hdrFront.texture);
		GL.setRenderTarget(this._hdrFront.fboDepth);
	},

    /**
     * @ignore
     * @private
     */
    _renderForward: function()
    {
		this._renderForwardOpaque();

		if (this._renderCollector.needsBackbuffer)
			this._copyBackbuffer();

		this._renderForwardTransparent();
	},

	/**
     * @ignore
     * @private
     */
    _renderForwardOpaque: function()
    {
        RenderUtils.renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_FIXED));

        var list = this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC);
        if (list.length === 0) return;

        this._renderOpaqueDynamicMultipass(list);
    },

    _renderOpaqueDynamicMultipass: function(list)
    {
        RenderUtils.renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, list);

        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        for (var i = 0; i < numLights; ++i) {
            var light = lights[i];

            // I don't like type checking, but lighting support is such a core thing...
            // maybe we can work in a more plug-in like light system
            if (light instanceof LightProbe) {
                RenderUtils.renderPass(this, this._activeCamera, MaterialPass.LIGHT_PROBE_PASS, list, light);
            }
            else if (light instanceof DirectionalLight) {
                // PASS IN LIGHT AS DATA, so the material can update it
                RenderUtils.renderPass(this, this._activeCamera, MaterialPass.DIR_LIGHT_PASS, list, light);
            }
            else if (light instanceof PointLight) {
                // cannot just use renderPass, need to do intersection tests
                this._renderLightPassIfIntersects(light, MaterialPass.POINT_LIGHT_PASS, list);
            }
            else if (light instanceof SpotLight) {
                this._renderLightPassIfIntersects(light, MaterialPass.SPOT_LIGHT_PASS, list);
            }
        }
    },

    _renderForwardTransparent: function()
    {
        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        var list = this._renderCollector.getTransparentRenderList();

        // transparents need to be rendered one-by-one, not light by light
        var numItems = list.length;
        for (var r = 0; r < numItems; ++r) {

            var renderItem = list[r];

            this._renderSingleItemSingleLight(MaterialPass.BASE_PASS, renderItem);

            var material = renderItem.material;

            // these won't have the correct pass
            if (material._renderPath !== RenderPath.FORWARD_DYNAMIC) continue;

            for (var i = 0; i < numLights; ++i) {
                var light = lights[i];

                // I don't like type checking, but lighting support is such a core thing...
                // maybe we can work in a more plug-in like light system
                if (light instanceof LightProbe) {
                    this._renderSingleItemSingleLight(MaterialPass.LIGHT_PROBE_PASS, renderItem, light);
                }
                else if (light instanceof DirectionalLight) {
                    // if non-global, do intersection tests
                    var passType = light.castShadows? MaterialPass.DIR_LIGHT_SHADOW_PASS : MaterialPass.DIR_LIGHT_PASS;
                    this._renderSingleItemSingleLight(passType, renderItem, light);
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
        var lightBound = light.entity.worldBounds;
        var len = renderList.length;

        for (var r = 0; r < len; ++r) {
            var renderItem = renderList[r];
            var material = renderItem.material;
            var pass = material.getPass(passType);
            if (!pass) continue;

            if (lightBound.intersectsBound(renderItem.worldBounds))
                this._renderSingleItemSingleLight(passType, renderItem, light);
        }
    },

    _renderSingleItemSingleLight: function(passType, renderItem, light)
    {
        var pass = renderItem.material.getPass(passType);
        if (!pass) return;
        var meshInstance = renderItem.meshInstance;
        pass.updatePassRenderState(this._activeCamera, this, light);
        pass.updateInstanceRenderState(this._activeCamera, renderItem, light);
		meshInstance.updateRenderState(passType);
        var mesh = meshInstance._mesh;
        GL.drawElements(mesh._elementType, mesh._numIndices, 0, mesh._indexType);
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
            RenderUtils.renderPass(this, this._activeCamera, MaterialPass.NORMAL_DEPTH_PASS, dynamic, null);
            RenderUtils.renderPass(this, this._activeCamera, MaterialPass.NORMAL_DEPTH_PASS, fixed, null);
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
    _renderShadowCasters: function()
    {
        this._shadowAtlas.initRects(this._renderCollector.shadowPlaneBuckets, this._renderCollector.numShadowPlanes);

        var casters = this._renderCollector.getShadowCasters();
        var len = casters.length;

        GL.setRenderTarget(this._shadowAtlas.fbo);
        GL.setClearColor(Color.WHITE);
        GL.clear();

        for (var i = 0; i < len; ++i) {
            var light = casters[i];

            // TODO: Reintroduce light types, use lookup

            if (light instanceof DirectionalLight) {
                this._cascadeShadowRenderer.render(light, this._shadowAtlas, this._camera, this._scene);
            }
            else if (light instanceof PointLight) {
                this._omniShadowRenderer.render(light, this._shadowAtlas, this._camera, this._scene);
            }
            else if (light instanceof SpotLight) {
                this._spotShadowRenderer.render(light, this._shadowAtlas, this._camera, this._scene);
            }
        }

        this._shadowAtlas.blur();
    },

    /**
     * @ignore
     * @private
     */
    _renderEffect: function (effect, dt)
    {
        this._gammaApplied = this._gammaApplied || effect.outputsGamma;
        effect.render(this, dt);
    },

    /**
     * @ignore
     * @private
     */
    _renderToScreen: function ()
    {
        GL.setRenderTarget(this._renderTarget);
        GL.clear();

        if (this._debugMode) {
            var tex;
            switch (this._debugMode) {
                case Renderer.DebugMode.NORMAL_DEPTH:
                    tex = this._normalDepthBuffer;
                    break;
                case Renderer.DebugMode.SHADOW_MAP:
                    tex = this._shadowAtlas.texture;
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

        this._present();
    },

    /**
     * @ignore
	 * @private
     */
    _present: function()
    {
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
        var effects = this._renderCollector.getEffects();
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
    _updateSize: function ()
    {
        var width, height;
        if (this._renderTarget) {
            width = this._renderTarget.width;
            height = this._renderTarget.height;
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