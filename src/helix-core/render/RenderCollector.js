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

    // Opaques are stored per RenderPath because the render path defines the order of rendering.
    // Transparents need a single list for absolute ordering.
    this._opaques = [];
    this._transparents = null;
    this._camera = null;
    this._cameraYAxis = new Float4();
    this._frustumPlanes = null;
	this.shadowCasters = null;
	this.lights = null;
	this.effects = null;
	this.ambientColor = new Color();
	this.needsNormalDepth = false;
    this.needsBackbuffer = false;
    this.numShadowPlanes = 0;
    this.shadowPlaneBuckets = null;
}

RenderCollector.MAX_SHADOW_QUALITY_BUCKETS = 4;

RenderCollector.prototype = Object.create(SceneVisitor.prototype);

RenderCollector.prototype.getOpaqueRenderList = function(path) { return this._opaques[path]; };
RenderCollector.prototype.getTransparentRenderList = function() { return this._transparents; };

RenderCollector.prototype.collect = function(camera, scene)
{
    this._camera = camera;
    camera.worldMatrix.getColumn(1, this._cameraYAxis);
    this._frustumPlanes = camera.frustum.planes;
    this._reset();

    scene.acceptVisitor(this);

    for (var i = 0; i < RenderPath.NUM_PATHS; ++i)
        this._opaques[i].sort(RenderSortFunctions.sortOpaques);

    this._transparents.sort(RenderSortFunctions.sortTransparents);

    // Do lights still require sorting?
    this.shadowCasters.sort(RenderSortFunctions.sortShadowCasters);

	// add camera effects at the end
	this._camera.acceptVisitorPost(this);
};

RenderCollector.prototype.qualifies = function(object)
{
    return object.hierarchyVisible && object.worldBounds.intersectsConvexSolid(this._frustumPlanes, 6);
};

RenderCollector.prototype.visitScene = function (scene)
{
    var skybox = scene.skybox;
    if (skybox)
        this.visitMeshInstance(skybox._meshInstance);
};

RenderCollector.prototype.visitEffect = function(effect)
{
	this.needsNormalDepth = this.needsNormalDepth || effect.needsNormalDepth;
    this.effects.push(effect);
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
    var opaqueLists = this._opaques;
    var transparentList = this._transparents;

    var material = meshInstance.material;

    var path = material.renderPath;

    // only required for the default lighting model (if not unlit)
    this.needsNormalDepth = this.needsNormalDepth || material.needsNormalDepth;
    this.needsBackbuffer = this.needsBackbuffer || material.needsBackbuffer;

    var renderItem = renderPool.getItem();

    renderItem.material = material;
    renderItem.meshInstance = meshInstance;
    renderItem.skeleton = skeleton;
    renderItem.skeletonMatrices = skeletonMatrices;
    // distance along Z axis:
    var center = worldBounds._center;
    renderItem.renderOrderHint = center.x * cameraY_X + center.y * cameraY_Y + center.z * cameraY_Z;
    renderItem.worldMatrix = entity.worldMatrix;
    renderItem.worldBounds = worldBounds;

    var bucket = (material.blendState || material.needsBackbuffer)? transparentList : opaqueLists[path];
    bucket.push(renderItem);
};

RenderCollector.prototype.visitAmbientLight = function(light)
{
    var color = light._scaledIrradiance;
    this.ambientColor.r += color.r;
    this.ambientColor.g += color.g;
    this.ambientColor.b += color.b;
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
    this.shadowCasters = [];
    this.effects = [];
    this.needsNormalDepth = META.OPTIONS.ambientOcclusion;
    this.ambientColor.set(0, 0, 0, 1);
    this.numShadowPlanes = 0;
    this.shadowPlaneBuckets = [];

    for (i = 0; i < RenderCollector.MAX_SHADOW_QUALITY_BUCKETS; ++i) {
        this.shadowPlaneBuckets[i] = 0;
    }

};

export { RenderCollector };