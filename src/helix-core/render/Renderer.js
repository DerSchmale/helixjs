import {Color} from "../core/Color";
import {RenderCollector} from "./RenderCollector";
import {ApplyGammaShader, CopyChannelsShader, DebugDepthShader, DebugNormalsShader} from "./UtilShaders";
import {Texture2D} from "../texture/Texture2D";
import {MaterialPass} from "../material/MaterialPass";
import {TextureFormat, TextureFilter, TextureWrapMode, META, capabilities} from "../Helix";
import {FrameBuffer} from "../texture/FrameBuffer";
import {MathX} from "../math/MathX";
import {GL} from "../core/GL";
import {renderPass} from "./RenderUtils";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {DirectionalLight} from "../light/DirectionalLight";
import {PointLight} from "../light/PointLight";
import {RenderPath} from "./RenderPath";
import {SpotLight} from "../light/SpotLight";
import {ShadowAtlas} from "./ShadowAtlas";
import {CascadeShadowMapRenderer} from "./CascadeShadowMapRenderer";
import {OmniShadowMapRenderer} from "./OmniShadowMapRenderer";
import {SpotShadowMapRenderer} from "./SpotShadowMapRenderer";
import {Float4} from "../math/Float4";
import {Matrix4x4} from "../math/Matrix4x4";
import {UniformBuffer} from "../core/UniformBuffer";
import {TextureCube} from "../texture/TextureCube";

var probeObject = {};

/**
 * @classdesc
 * Renderer performs the actual rendering of a {@linkcode Scene} as viewed by a {@linkcode Camera} to the screen.
 *
 * @param {FrameBuffer} [renderTarget] An optional render target for the Renderer to draw to.
 *
 * @property depthPrepass Defines whether or not a depth pre-pass needs to be performed when rendering. This may improve
 * rendering by spending less time calculating lighting on invisible fragments.
 * @property skipEffects Indicates the output should not apply post-processing effects.
 * @property renderTarget A render target for the Renderer to draw to. If not provided, it will render to the backbuffer.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Renderer(renderTarget)
{
    this.renderTarget = renderTarget || null;
    this._width = 0;
    this._height = 0;

    this.skipEffects = false;
    this.depthPrepass = false;
    this._gammaApplied = false;

    this._copyTextureShader = new CopyChannelsShader("xyzw", true);
    this._applyGamma = new ApplyGammaShader();
	this._debugShader = null;

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
    this._debugMode = Renderer.DebugMode.NONE;
    this._ssaoTexture = null;

    this._cascadeShadowRenderer = new CascadeShadowMapRenderer();
    this._omniShadowRenderer = new OmniShadowMapRenderer();
    this._spotShadowRenderer = new SpotShadowMapRenderer();
    this._shadowAtlas = new ShadowAtlas(!!META.OPTIONS.shadowFilter.blurShader);
    this._shadowAtlas.resize(2048, 2048);

    if (capabilities.WEBGL_2) {
		var size = 16 + META.OPTIONS.maxDirLights * 320 + META.OPTIONS.maxPointSpotLights * 224 + META.OPTIONS.maxDiffuseProbes * 176 + META.OPTIONS.maxSpecularProbes * 32;
		this._lightingUniformBuffer = new UniformBuffer(size);
		this._lightingDataView = new DataView(new ArrayBuffer(size));
		// these will contain all the indices into the light buffer
        // reserve space for every cell AND the count inside them!
		this._numCells = META.OPTIONS.numLightingCellsX * META.OPTIONS.numLightingCellsY;
		this._cellStride = META.OPTIONS.maxPointSpotLights + 1;

		// this throws errors
		this._lightingCellsUniformBuffer = new UniformBuffer(this._numCells * this._cellStride * 4);
		this._cellData = new Int32Array(this._numCells * this._cellStride);

		this._specularProbeArray = [];

		for (var i = 0; i < size; ++i)
		    this._lightingDataView.setInt8(i, 0);

		// if we want to test the layout of the uniform buffer as defined in the shader:
		/*var material = new BasicMaterial({ lightingModel: LightingModel.GGX });
		var pass = material.getPass(MaterialPass.BASE_PASS);
		this._lightingUniformBuffer = pass.shader.createUniformBuffer("hx_lights");
		// this._lightingCellsUniformBuffer = pass.shader.createUniformBuffer("hx_lightingCells");
		console.log(this._lightingUniformBuffer);*/
    }
}

/**
 * A collection of debug render modes to inspect some steps in the render pipeline.
 * @enum
 */
Renderer.DebugMode = {
    NONE: 0,
    SSAO: 1,
    NORMALS: 2,
    DEPTH: 3,
    SHADOW_MAP: 4
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
        this.texture.initEmpty(width, height, TextureFormat.RGBA, capabilities.HDR_DATA_TYPE);
        this.fbo.init();
        this.fboDepth.init();
    }
};

Renderer.prototype =
{
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
	 * One of {Renderer.DebugMode}. Causes debug data to be rendered instead of the normal view.
	 */
	get debugMode()
	{
		return this._debugMode;
	},

	set debugMode(value)
	{
		if (value === this._debugMode) return;

		this._debugMode = value;

		if (value === Renderer.DebugMode.NORMALS)
			this._debugShader = new DebugNormalsShader();
		else if (value === Renderer.DebugMode.DEPTH)
			this._debugShader = new DebugDepthShader();
		else
			this._debugShader = this._copyTextureShader;
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

        this._updateSize(this.renderTarget);
        camera._setRenderTargetResolution(this._width, this._height);

        this._renderCollector.collect(camera, scene);

		this._ambientColor = this._renderCollector.ambientColor;

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

        GL.setDepthMask(true);
        GL.setColorMask(true);

        this._renderNormalDepth();
        this._renderAO();

        GL.setRenderTarget(this._hdrFront.fboDepth);
        GL.setClearColor(this._backgroundColor);
        GL.clear();

        this._renderDepthPrepass();

        if (capabilities.WEBGL_2)
            this._renderTiled();
        else
            this._renderForward();

        this._swapHDRFrontAndBack();

        if (!this.skipEffects)
            this._renderEffects(dt);

        GL.setColorMask(true);
    },

    /**
     * @ignore
     * @private
     */
    _renderDepthPrepass	: function ()
    {
        if (!this.depthPrepass) return;

        GL.lockColorMask(false);
        renderPass(this, this._activeCamera, MaterialPass.NORMAL_DEPTH_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_FIXED));
        renderPass(this, this._activeCamera, MaterialPass.NORMAL_DEPTH_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC));
        GL.unlockColorMask(true);
    },

    _renderTiled: function()
    {
        var lights = this._renderCollector.lights;
        var diffuseProbes = this._renderCollector.diffuseProbes;
        var specularProbes = this._renderCollector.specularProbes;
        var numLights = lights.length;
        var data = this._lightingDataView;
        var cells = this._cellData;
        var camera = this._camera;
        var maxDirLights = META.OPTIONS.maxDirLights, maxPoints = META.OPTIONS.maxPointSpotLights;
        var maxDiffProbes = META.OPTIONS.maxDiffuseProbes, maxSpecProbes = META.OPTIONS.maxSpecularProbes;
		var dirLightStride = 320, pointStride = 224;
		var diffProbeStride = 176, specProbeStride = 32;
		var dirLightOffset = 16;
		var pointOffset = maxDirLights * dirLightStride + dirLightOffset;
		var diffProbeOffset = maxPoints * pointStride + pointOffset;
		var specProbeOffset = maxDiffProbes * diffProbeStride + diffProbeOffset;
        var numDirLights = 0, numPointLights = 0;
        var numCells = META.OPTIONS.numLightingCellsX * META.OPTIONS.numLightingCellsY;
        var cellStride = this._cellStride;
        var i;

        for (i = 0; i < numCells; ++i) {
            // reset light counts to 0
			cells[i * cellStride] = 0;
		}

        for (i = 0; i < numLights; ++i) {
            var light = lights[i];

            if (light instanceof DirectionalLight && numDirLights < maxDirLights) {
                this.writeDirectionalLight(light, camera, data, dirLightOffset);

                dirLightOffset += dirLightStride;
                ++numDirLights;
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

        var numDiffuseProbes = diffuseProbes.length;
		if (maxDiffProbes < numDiffuseProbes) numDiffuseProbes = maxDiffProbes;

		for (i = 0; i < numDiffuseProbes; ++i) {
			this.writeDiffuseProbe(diffuseProbes[i], camera, data, diffProbeOffset);
			diffProbeOffset += diffProbeStride;
		}

		var numSpecularProbes = specularProbes.length;
		if (maxSpecProbes < numSpecularProbes) numSpecularProbes = maxSpecProbes;

		for (i = 0; i < numSpecularProbes; ++i) {
			var probe = specularProbes[i];
			this.writeSpecularProbe(probe, camera, data, specProbeOffset);
			specProbeOffset += specProbeStride;
			this._specularProbeArray[i] = probe.specularTexture;
		}

		for (i = numSpecularProbes; i < maxSpecProbes; ++i) {
			this._specularProbeArray[i] = TextureCube.DEFAULT;
		}

        data.setInt32(0, numDirLights, true);
        data.setInt32(4, numPointLights, true);
        data.setInt32(8, numDiffuseProbes, true);
        data.setInt32(12, numSpecularProbes, true);

        this._lightingUniformBuffer.uploadData(this._lightingDataView);
        this._lightingCellsUniformBuffer.uploadData(this._cellData);

        renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_FIXED));
        renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC));

		if (this._renderCollector.needsBackbuffer)
			this._copyBackbuffer();

        renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getTransparentRenderList(RenderPath.FORWARD_FIXED));
        renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getTransparentRenderList(RenderPath.FORWARD_DYNAMIC));
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

            var radius;
            if (isSpot) {
                var bounds = light.entity.worldBounds;
                radius = bounds.getRadius();
                viewMatrix.transformPoint(bounds.center, pos);
            }
            else
                radius = light.radius;

            this.assignToCells(light, camera, index, pos, cells, radius);
		}
    }(),

	assignToCells: function(light, camera, index, viewPos, cells, radius)
    {
    	var projC = new Float4();
    	var projR = new Float4();   // projected right vector
    	var projU = new Float4();   // projected up vector
    	return function(light, camera, index, viewPos, cells, radius) {
			var cellStride = this._cellStride;
			var proj = camera.projectionMatrix;
			var m = proj._m;

			var nx = META.OPTIONS.numLightingCellsX;
			var ny = META.OPTIONS.numLightingCellsY;
            var near = viewPos.y - radius;
            var fXstart, fXend, fYstart, fYend;

            if (near > 0) {
                // find bounding box of projected sphere in NDC
                // https://gamedev.stackexchange.com/questions/49222/aabb-of-a-spheres-screen-space-projection
                var cx = viewPos.x, cy = viewPos.y, cz = viewPos.z;
                var d2 = cx * cx + cy * cy + cz * cz;
                // pythagoras: one right edge goes from camera to center, the other from the center to the point sphere
                var a = Math.sqrt(d2 - radius * radius);
                a = radius / a;
                proj.transform(viewPos, projC);

                // x and w for projection of [cy * a, -cx * a, 0, 0]
                var xp = cy * a;
                var yp = -cx * a;
                var rx = m[0] * xp + m[4] * yp;
                var rw = m[3] * xp + m[7] * yp;

                // y and w for projection of [0, 0, radius, 0]
                var uy = m[9] * radius;
                var uw = m[11] * radius;


                var tmp;
                var l = (projC.x - rx) / (projC.w - rw);
                var r = (projC.x + rx) / (projC.w + rw);
                if (l > r) {
                    tmp = l;
                    l = r;
                    r = tmp;
                }
                var t = (projC.y + uy) / (projC.w + uw);
                var b = (projC.y - uy) / (projC.w - uw);
                if (b > t) {
                    tmp = b;
                    b = t;
                    t = tmp;
                }

                // find covered cells
                fXstart = MathX.clamp(Math.floor((l * .5 + .5) * nx), 0, nx);
                fXend = MathX.clamp(Math.ceil((r * .5 + .5) * nx), 0, nx);
                fYstart = MathX.clamp(Math.floor((b * .5 + .5) * ny), 0, ny);
                fYend = MathX.clamp(Math.ceil((t * .5 + .5) * ny), 0, ny);
            }
            else {
                fXstart = 0;
                fXend = nx;
                fYstart = 0;
                fYend = ny;
            }


			var i, pi, c;
			for (var y = fYstart; y < fYend; ++y) {
				for (var x = fXstart; x < fXend; ++x) {
					// TODO: Another test to check if the nearest corner actually falls inside the sphere
					i = x + y * nx;
					pi = i * cellStride;
					c = ++cells[pi];
					cells[pi + c] = index;
				}
			}
    	}
    }(),

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

	writeDiffuseProbe: function(probe, camera, target, offset)
	{
		var pos = new Float4();

		return function(probe, camera, target, offset)
		{
			var viewMatrix = camera.viewMatrix;
			var lightMatrix = probe.entity.worldMatrix;

			lightMatrix.getColumn(3, pos);
			viewMatrix.transformPoint(pos, pos);

			var c = probe.diffuseSH._coefficients;
			var o = offset;
			var i = 0;

			for (var l = 0; l < 9; ++l) {
				for (var xyz = 0; xyz < 3; ++xyz) {
					target.setFloat32(o, c[i++], true);
					o += 4;
				}

				// vec3 arrays align to 16 bit, so skip 4th "ghost" component
				o += 4;
			}

			target.setFloat32(offset + 144, pos.x, true);
			target.setFloat32(offset + 148, pos.y, true);
			target.setFloat32(offset + 152, pos.z, true);
			target.setFloat32(offset + 156, probe.intensity, true);
			var size = probe.size || 0;
			target.setFloat32(offset + 160, size * size, true);
		}
	}(),

	writeSpecularProbe: function(probe, camera, target, offset)
	{
		var pos = new Float4();

		return function(probe, camera, target, offset)
		{
			var viewMatrix = camera.viewMatrix;
			var lightMatrix = probe.entity.worldMatrix;

			lightMatrix.getColumn(3, pos);
			viewMatrix.transformPoint(pos, pos);

			target.setFloat32(offset, pos.x, true);
			target.setFloat32(offset + 4, pos.y, true);
			target.setFloat32(offset + 8, pos.z, true);
			target.setFloat32(offset + 12, probe.intensity, true);
			var size = probe.size || 0;
			target.setFloat32(offset + 16, size * size, true);
			target.setFloat32(offset + 20, probe.specularTexture.numMips, true);
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
		this._copyTextureShader.execute(this._hdrFront.texture);
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
		renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_FIXED));

        var list = this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC);
        if (list.length === 0) return;

        this._renderOpaqueDynamicMultipass(list);
    },

    _renderOpaqueDynamicMultipass: function(list)
    {
		var diffuseProbes = this._renderCollector.diffuseProbes;
		var specularProbes = this._renderCollector.specularProbes;

		if (diffuseProbes.length > 0 || specularProbes.length > 0) {
			probeObject.diffuseProbes = diffuseProbes;
			probeObject.specularProbes = specularProbes;
			renderPass(this, this._activeCamera, MaterialPass.BASE_PASS_PROBES, list, probeObject);
		}
		else
        	renderPass(this, this._activeCamera, MaterialPass.BASE_PASS, list);

        var lights = this._renderCollector.lights;
        var numLights = lights.length;

        for (var i = 0; i < numLights; ++i) {
            var light = lights[i];

            // I don't like type checking, but lighting support is such a core thing...
            // maybe we can work in a more plug-in like light system
            if (light instanceof DirectionalLight) {
                // PASS IN LIGHT AS DATA, so the material can update it
                renderPass(this, this._activeCamera, MaterialPass.DIR_LIGHT_PASS, list, light);
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
        var lights = this._renderCollector.lights;
        var numLights = lights.length;

        var list = this._renderCollector.getTransparentRenderList();

        // transparents need to be rendered one-by-one, not light by light
        var numItems = list.length;

		var diffuseProbes = this._renderCollector.diffuseProbes;
		var specularProbes = this._renderCollector.specularProbes;
		var hasProbes = false;

		if (diffuseProbes.length > 0 || specularProbes.length > 0) {
			probeObject.diffuseProbes = diffuseProbes;
			probeObject.specularProbes = specularProbes;
			hasProbes = true;
		}

        for (var r = 0; r < numItems; ++r) {

            var renderItem = list[r];

            if (hasProbes)
            	this._renderSingleItemSingleLight(MaterialPass.BASE_PASS_PROBES, renderItem, probeObject);
            else
				this._renderSingleItemSingleLight(MaterialPass.BASE_PASS, renderItem);

            var material = renderItem.material;

            // these won't have the correct pass
            if (material._renderPath !== RenderPath.FORWARD_DYNAMIC) continue;

            for (var i = 0; i < numLights; ++i) {
                var light = lights[i];

                // I don't like type checking, but lighting support is such a core thing...
                // maybe we can work in a more plug-in like light system
                if (light instanceof DirectionalLight) {
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

    _renderSingleItemSingleLight: function(passType, renderItem, data)
    {
        var pass = renderItem.material.getPass(passType);
        if (!pass) return;
        var meshInstance = renderItem.meshInstance;
        pass.updatePassRenderState(this._activeCamera, this, data);
        pass.updateInstanceRenderState(this._activeCamera, renderItem, data);
		meshInstance.updateRenderState(passType);

		var mesh = meshInstance._mesh;
		var numInstances = meshInstance.numInstances;

		if (numInstances === undefined)
        	GL.drawElements(mesh.elementType, mesh._numIndices, mesh._indexType, 0);
		else
			GL.drawElementsInstanced(mesh.elementType, mesh._numIndices, mesh._indexType, 0, numInstances);
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

        if (rc.needsNormalDepth || this._debugMode === Renderer.DebugMode.NORMALS || this._debugMode === Renderer.DebugMode.DEPTH) {
            GL.setRenderTarget(this._normalDepthFBO);
            GL.setClearColor(Color.BLUE);
            GL.clear();
            renderPass(this, this._activeCamera, MaterialPass.NORMAL_DEPTH_PASS, dynamic, null);
            renderPass(this, this._activeCamera, MaterialPass.NORMAL_DEPTH_PASS, fixed, null);
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

        var casters = this._renderCollector.shadowCasters;
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
        GL.setRenderTarget(this.renderTarget);
        GL.setClearColor(this._backgroundColor);
        GL.clear();

        if (this.debugMode) {
            var tex;

            switch (this.debugMode) {
                case Renderer.DebugMode.NORMALS:
                    tex = this._normalDepthBuffer;
                    break;
                case Renderer.DebugMode.DEPTH:
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
            this._debugShader.execute(tex);
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
            this._copyTextureShader.execute(this._hdrBack.texture);
        else
            this._applyGamma.execute(this._hdrBack.texture);
    },

    /**
     * @ignore
     * @private
     */
    _renderEffects: function (dt)
    {
        var effects = this._renderCollector.effects;
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
        if (this.renderTarget) {
            width = this.renderTarget.width;
            height = this.renderTarget.height;
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