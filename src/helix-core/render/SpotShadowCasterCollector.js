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
}

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

SpotShadowCasterCollector.prototype.visitEntity = function(entity)
{
	var meshInstances = entity.components.meshInstance;

	if (meshInstances) {
		for (var i = 0, len = meshInstances.length; i < len; ++i) {
			var instance = meshInstances[i];
			var worldBounds = this.getProxiedBounds(entity);
			var worldMatrix = this.getProxiedMatrix(entity);
			var center = worldBounds._center;
			var cameraPos = this._viewCameraPos;
			var dx = (center.x - cameraPos.x), dy = (center.y - cameraPos.y), dz = (center.z - cameraPos.z);
			var lodDistSqr = dx * dx + dy * dy + dz * dz;

			if (instance.enabled && instance.castShadows && lodDistSqr >= instance._lodRangeStartSqr && lodDistSqr < instance._lodRangeEndSqr && instance.numInstances !== 0)
				this.visitMeshInstance(instance, worldMatrix, worldBounds, lodDistSqr);
		}
	}
};

SpotShadowCasterCollector.prototype.visitMeshInstance = function (meshInstance, worldMatrix, worldBounds, renderOrderHint)
{
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
    renderItem.renderOrderHint = renderOrderHint;
    renderItem.worldMatrix = worldMatrix;
    renderItem.worldBounds = worldBounds;

    renderList.push(renderItem);
};

SpotShadowCasterCollector.prototype.qualifiesBounds = function(bounds)
{
    return bounds.intersectsConvexSolid(this._frustumPlanes, 6);
};

SpotShadowCasterCollector.prototype.qualifies = function(object, forceBounds)
{
    return object.visible && (forceBounds || object.worldBounds.intersectsConvexSolid(this._frustumPlanes, 6));
};

export { SpotShadowCasterCollector };