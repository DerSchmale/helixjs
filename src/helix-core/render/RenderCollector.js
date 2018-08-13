import {ObjectPool} from "../core/ObjectPool";
import {Float4} from "../math/Float4";
import {Color} from "../core/Color";
import {SceneVisitor} from "../scene/SceneVisitor";
import {META} from "../Helix";
import {RenderItem} from "./RenderItem";
import {RenderPath} from "./RenderPath";
import {RenderSortFunctions} from "./RenderSortFunctions";

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

    this._opaques = [];
    this._transparents = null;
    this._camera = null;
    this._cameraYAxis = new Float4();
    this._frustumPlanes = null;
    this._lights = null;
    this._ambientColor = new Color();
    this._shadowCasters = null;
    this._effects = null;
    this._needsNormalDepth = false;
    this._needsBackbuffer = false;
    this._numShadowPlanes = 0;
    this._shadowPlaneBuckets = null;
}

RenderCollector.MAX_SHADOW_QUALITY_BUCKETS = 4;

RenderCollector.prototype = Object.create(SceneVisitor.prototype, {
    numShadowPlanes: {
        get: function() { return this._numShadowPlanes; }
    },

    shadowPlaneBuckets: {
        get: function() { return this._shadowPlaneBuckets; }
    },

    ambientColor: {
        get: function() { return this._ambientColor; }
    },

    needsNormalDepth: {
        get: function() { return this._needsNormalDepth; }
    },

    needsBackbuffer: {
        get: function() { return this._needsBackbuffer; }
    }
});

RenderCollector.prototype.getOpaqueRenderList = function(path) { return this._opaques[path]; };
RenderCollector.prototype.getTransparentRenderList = function() { return this._transparents; };
RenderCollector.prototype.getLights = function() { return this._lights; };
RenderCollector.prototype.getShadowCasters = function() { return this._shadowCasters; };
RenderCollector.prototype.getEffects = function() { return this._effects; };

RenderCollector.prototype.collect = function(camera, scene)
{
    this._camera = camera;
    camera.worldMatrix.getColumn(1, this._cameraYAxis);
    this._frustumPlanes = camera.frustum._planes;
    this._reset();

    scene.acceptVisitor(this);

    for (var i = 0; i < RenderPath.NUM_PATHS; ++i)
        this._opaques[i].sort(RenderSortFunctions.sortOpaques);

    this._transparents.sort(RenderSortFunctions.sortTransparents);

    // Do lights still require sorting?
    this._shadowCasters.sort(RenderSortFunctions.sortShadowCasters);

	// add camera effects at the end
	this._camera.acceptVisitorPost(this);
};

RenderCollector.prototype.qualifies = function(object)
{
    return object.hierarchyVisible && object.worldBounds.intersectsConvexSolid(this._frustumPlanes, 6);
};

RenderCollector.prototype.visitScene = function (scene)
{
    var skybox = scene._skybox;
    if (skybox)
        this.visitMeshInstance(skybox._meshInstance);
};

RenderCollector.prototype.visitEffect = function(effect)
{
	this._needsNormalDepth = this._needsNormalDepth || effect._needsNormalDepth;
    this._effects.push(effect);
};

RenderCollector.prototype.visitMeshInstance = function (meshInstance)
{
	if (!meshInstance.enabled) return;

	var entity = meshInstance.entity;
	var worldBounds = entity.worldBounds;
    var cameraYAxis = this._cameraYAxis;
    var cameraY_X = cameraYAxis.x, cameraY_Y = cameraYAxis.y, cameraY_Z = cameraYAxis.z;
    var skeleton = meshInstance.skeleton;
    var skeletonMatrices = meshInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var camera = this._camera;
    var opaqueLists = this._opaques;
    var transparentList = this._transparents;

    var material = meshInstance.material;

    var path = material.renderPath;

    // only required for the default lighting model (if not unlit)
    this._needsNormalDepth = this._needsNormalDepth || material._needsNormalDepth;
    this._needsBackbuffer = this._needsBackbuffer || material._needsBackbuffer;

    var renderItem = renderPool.getItem();

    renderItem.material = material;
    renderItem.meshInstance = meshInstance;
    renderItem.skeleton = skeleton;
    renderItem.skeletonMatrices = skeletonMatrices;
    // distance along Z axis:
    var center = worldBounds._center;
    renderItem.renderOrderHint = center.x * cameraY_X + center.y * cameraY_Y + center.z * cameraY_Z;
    renderItem.worldMatrix = entity.worldMatrix;
    renderItem.camera = camera;
    renderItem.worldBounds = worldBounds;

    var bucket = (material.blendState || material._needsBackbuffer)? transparentList : opaqueLists[path];
    bucket.push(renderItem);
};

RenderCollector.prototype.visitAmbientLight = function(light)
{
    var color = light._scaledIrradiance;
    this._ambientColor.r += color.r;
    this._ambientColor.g += color.g;
    this._ambientColor.b += color.b;
};

RenderCollector.prototype.visitLight = function(light)
{
    this._lights.push(light);
    if (light._castShadows) {
        this._shadowCasters.push(light);
        this._numShadowPlanes += light.numAtlasPlanes;

        var bucketIndex = light.shadowQualityBias;
        this._shadowPlaneBuckets[bucketIndex] += light.numAtlasPlanes;
    }
};

RenderCollector.prototype._reset = function()
{
    this._renderItemPool.reset();

    for (var i = 0; i < RenderPath.NUM_PATHS; ++i)
        this._opaques[i] = [];

    this._transparents = [];

    this._lights = [];
    this._shadowCasters = [];
    this._effects = [];
    this._needsNormalDepth = META.OPTIONS.ambientOcclusion;
    this._ambientColor.set(0, 0, 0, 1);
    this._numShadowPlanes = 0;
    this._shadowPlaneBuckets = [];

    for (i = 0; i < RenderCollector.MAX_SHADOW_QUALITY_BUCKETS; ++i) {
        this._shadowPlaneBuckets[i] = 0;
    }

};

export { RenderCollector };