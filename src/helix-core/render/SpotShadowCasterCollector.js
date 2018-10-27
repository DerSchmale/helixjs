import {ObjectPool} from "../core/ObjectPool";
import {SceneVisitor} from "../scene/SceneVisitor";
import {RenderItem} from "./RenderItem";
import {RenderSortFunctions} from "./RenderSortFunctions";
import {Float4} from "../math/Float4";
import {RenderCollector} from "./RenderCollector";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotShadowCasterCollector()
{
    SceneVisitor.call(this);
    this._frustumPlanes = null;
    this._renderList = [];
    this._renderItemPool = new ObjectPool(RenderItem);
	this._viewCameraPos = new Float4();
	this._cameraYAxis = new Float4();
};

SpotShadowCasterCollector.prototype = Object.create(SceneVisitor.prototype);

SpotShadowCasterCollector.prototype.getRenderList = function() { return this._renderList; };

SpotShadowCasterCollector.prototype.collect = function(camera, scene, viewCamera)
{
    this.reset();
	this._camera = camera;
	this._renderList = [];
	viewCamera.worldMatrix.getColumn(3, this._viewCameraPos);
	camera.worldMatrix.getColumn(1, this._cameraYAxis);
    this._frustumPlanes = camera.frustum.planes;
    this._renderItemPool.reset();

    scene.acceptVisitor(this);

    this._renderList.sort(RenderSortFunctions.sortOpaques);
};

SpotShadowCasterCollector.prototype.visitMeshInstance = function (meshInstance)
{
    if (!meshInstance.castShadows || !meshInstance.enabled)
        return;

	var lodStart = meshInstance._lodRangeStartSqr;
	var lodEnd = meshInstance._lodRangeEndSqr;
	var entity = meshInstance.entity;
	var worldBounds = this.getProxiedBounds(entity);

	if (lodStart > 0 || lodEnd !== Number.POSITIVE_INFINITY) {
		lodStart = lodStart || Number.NEGATIVE_INFINITY;
		var center = worldBounds.center;
		var cameraPos = this._viewCameraPos;
		var dx = (center.x - cameraPos.x), dy = (center.y - cameraPos.y), dz = (center.z - cameraPos.z);
		var distSqr = dx * dx + dy * dy + dz * dz;

		if (distSqr < lodStart || distSqr > lodEnd)
			return;
	}

    var cameraYAxis = this._cameraYAxis;
    var skeleton = meshInstance.skeleton;
    var skeletonMatrices = meshInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var renderList = this._renderList;
    var material = meshInstance.material;
    var renderItem = renderPool.getItem();

    renderItem.material = material;
    renderItem.meshInstance = meshInstance;
    renderItem.skeleton = skeleton;
    renderItem.skeletonMatrices = skeletonMatrices;
    // distance along Z axis:
    var center = worldBounds._center;
    renderItem.renderOrderHint = center.x * cameraYAxis.x + center.y * cameraYAxis.y + center.z * cameraYAxis.z;
    renderItem.worldMatrix = this.getProxiedMatrix(entity);
    renderItem.worldBounds = worldBounds;

    renderList.push(renderItem);
};

SpotShadowCasterCollector.prototype.visitMeshBatch = SpotShadowCasterCollector.prototype.visitMeshInstance;

SpotShadowCasterCollector.prototype.qualifiesBounds = function(bounds)
{
    return bounds.intersectsConvexSolid(this._frustumPlanes, 6);
};

SpotShadowCasterCollector.prototype.qualifies = function(object, forceBounds)
{
    return object.visible && (forceBounds || object.worldBounds.intersectsConvexSolid(this._frustumPlanes, 6));
};

export { SpotShadowCasterCollector };