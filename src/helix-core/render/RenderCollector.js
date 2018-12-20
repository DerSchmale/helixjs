import {ObjectPool} from "../core/ObjectPool";
import {Float4} from "../math/Float4";
import {Color} from "../core/Color";
import {SceneVisitor} from "../scene/SceneVisitor";
import {META} from "../Helix";
import {RenderItem} from "./RenderItem";
import {RenderPath} from "./RenderPath";
import {RenderSortFunctions} from "./RenderSortFunctions";
import {_glStats} from "../core/GL";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function RenderCollector()
{
    SceneVisitor.call(this);

    this._renderItemPool = new ObjectPool(RenderItem);

    // Opaques are stored per RenderPath because the render path defines the order of rendering.
    // Transparents need a single list for absolute ordering.
    this._opaques = [];
    this._transparents = null;
    this._camera = null;
    this._cameraYAxis = new Float4();
    this._cameraPos = new Float4();
    this._frustumPlanes = null;
	this.shadowCasters = null;
	this.lights = null;
	this.diffuseProbes = null;
	this.specularProbes = null;
	this.effects = null;
	this.ambientColor = new Color();
	this.needsNormalDepth = false;
    this.needsBackBuffer = false;
    this.needsVelocity = false;
    this.numShadowPlanes = 0;
    this.shadowPlaneBuckets = null;
}

RenderCollector.MAX_SHADOW_QUALITY_BUCKETS = 4;

RenderCollector.prototype = Object.create(SceneVisitor.prototype);

RenderCollector.prototype.getOpaqueRenderList = function(path) { return this._opaques[path]; };
RenderCollector.prototype.getTransparentRenderList = function() { return this._transparents; };

RenderCollector.prototype.collect = function(camera, scene)
{
    this.reset();
    this._camera = camera;
    camera.worldMatrix.getColumn(1, this._cameraYAxis);
    camera.worldMatrix.getColumn(3, this._cameraPos);
    this._frustumPlanes = camera.frustum.planes;
    this._reset();

    scene.acceptVisitor(this, true);

    for (var i = 0; i < RenderPath.NUM_PATHS; ++i)
        this._opaques[i].sort(RenderSortFunctions.sortOpaques);

    this._transparents.sort(RenderSortFunctions.sortTransparents);

	this.diffuseProbes.sort(RenderSortFunctions.sortProbes);
	this.specularProbes.sort(RenderSortFunctions.sortProbes);
    this.shadowCasters.sort(RenderSortFunctions.sortShadowCasters);

	// add only active camera effects at the end
	this._camera.acceptVisitorPost(this);
};

RenderCollector.prototype.qualifiesBounds = function(bounds)
{
	return bounds.intersectsConvexSolid(this._frustumPlanes, 6)
};


RenderCollector.prototype.qualifies = function(object, forceBounds)
{
    return object.hierarchyVisible && (forceBounds || object.worldBounds.intersectsConvexSolid(this._frustumPlanes, 6));
};

RenderCollector.prototype.visitScene = function(scene)
{
    var skybox = scene.skybox;
    if (skybox)
        this.visitMeshInstance(skybox._meshInstance);
};

RenderCollector.prototype.visitEntity = function(entity)
{
	var i, len;
	var comps = entity.components;
	var effects = comps.effect;
	var ambientLights = comps.ambientLight;
	var lights = comps.light;
	var lightProbes = comps.lightProbe;
	var instances = comps.meshInstance;

	if (instances || lightProbes) {
		var worldBounds = entity.worldBounds;
		var center = worldBounds.center;
		var cameraPos = this._cameraPos;
		var cameraPos_X = cameraPos.x, cameraPos_Y = cameraPos.y, cameraPos_Z = cameraPos.z;
		var dx = center.x - cameraPos_X, dy = center.y - cameraPos_Y, dz = center.z - cameraPos_Z;
		var distSqr = dx * dx + dy * dy + dz * dz;
	}

	if (effects) {
		len = effects.length;
		for (i = 0; i < len; ++i) {
			var effect = effects[i];
			if (!effect.enabled) continue;
			this.needsNormalDepth = this.needsNormalDepth || effect.needsNormalDepth;
			this.needsVelocity = this.needsVelocity || effect.needsVelocity;
			this.effects.push(effect);
		}
	}

	if (ambientLights) {
		var ambientColor = this.ambientColor;
		len = ambientLights.length;
		for (i = 0; i < len; ++i) {
			var light = ambientLights[i];
			if (!light.enabled) continue;
			var color = light._scaledIrradiance;
			ambientColor.r += color.r;
			ambientColor.g += color.g;
			ambientColor.b += color.b;
		}
	}

	if (lights) {
		len = lights.length;
		for (i = 0; i < len; ++i) {
			light = lights[i];
			if (light.enabled)
				this.visitLight(light);
		}
	}

	if (lightProbes) {
		len = lightProbes.length;
		for (i = 0; i < len; ++i) {
			light = lightProbes[i];
			if (!light.enabled) continue;
			light._renderOrderHint = distSqr;

			if (light.diffuseSH)
				this.diffuseProbes.push(light);

			if (light.specularTexture)
				this.specularProbes.push(light);
		}
	}

	if (instances) {
		len = instances.length;

		var worldMatrix = entity.worldMatrix;
		var prevWorldMatrix = entity._prevWorldMatrix;

		for (i = 0; i < len; ++i) {
			var instance = instances[i];
			if (instance.enabled && distSqr >= instance._lodRangeStartSqr && distSqr < instance._lodRangeEndSqr && instance.numInstances !== 0)
				this.visitMeshInstance(instance, worldMatrix, worldBounds, distSqr, prevWorldMatrix);
		}
	}
};

RenderCollector.prototype.visitMeshInstance = function (meshInstance, worldMatrix, worldBounds, renderOrderHint, prevWorldMatrix)
{
    var skeleton = meshInstance.skeleton;
    var skeletonMatrices = meshInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var opaqueLists = this._opaques;
    var transparentList = this._transparents;
    var material = meshInstance.material;
    var path = material.renderPath;

    // only required for the default lighting model (if not unlit)
    this.needsNormalDepth = this.needsNormalDepth || material.needsNormalDepth;
    this.needsVelocity = this.needsVelocity || material.needsVelocity;
    this.needsBackBuffer = this.needsBackBuffer || material.needsBackBuffer;

    var renderItem = renderPool.getItem();

    renderItem.material = material;
    renderItem.meshInstance = meshInstance;
    renderItem.skeleton = skeleton;
    renderItem.skeletonMatrices = skeletonMatrices;
    renderItem.renderOrderHint = renderOrderHint;
    renderItem.worldMatrix = worldMatrix;
    renderItem.prevWorldMatrix = prevWorldMatrix;
    renderItem.worldBounds = worldBounds;

    var bucket = (material.blendState || material.needsBackBuffer)? transparentList : opaqueLists[path];
    bucket.push(renderItem);

    var numTris = meshInstance.mesh.numIndices / 3;
    if (meshInstance.numInstances !== undefined)
    	numTris *= meshInstance.numInstances;
	_glStats.numTriangles += numTris;
};

RenderCollector.prototype.visitLight = function(light)
{
    this.lights.push(light);

    if (light.castShadows) {
        this.shadowCasters.push(light);
        this.numShadowPlanes += light.numAtlasPlanes;

        var bucketIndex = light.shadowQualityBias;
        this.shadowPlaneBuckets[bucketIndex] += light.numAtlasPlanes;
    }
};

RenderCollector.prototype._reset = function()
{
    this._renderItemPool.reset();

    for (var i = 0; i < RenderPath.NUM_PATHS; ++i)
        this._opaques[i] = [];

    this._transparents = [];

    this.lights = [];
    this.diffuseProbes = [];
    this.specularProbes = [];
    this.shadowCasters = [];
    this.effects = [];
    this.needsNormalDepth = !!META.OPTIONS.ambientOcclusion;
    this.needsVelocity = false;
    this.ambientColor.set(0, 0, 0, 1);
    this.numShadowPlanes = 0;
    this.shadowPlaneBuckets = [];

    for (i = 0; i < RenderCollector.MAX_SHADOW_QUALITY_BUCKETS; ++i) {
        this.shadowPlaneBuckets[i] = 0;
    }

};

export { RenderCollector };